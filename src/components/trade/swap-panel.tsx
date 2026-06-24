import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { hasPrivy, hasSupabase } from "@/lib/env";
import {
  confirmSolanaTransaction,
  createJupiterSwapOrder,
  executeJupiterSwap,
  fetchJupiterQuote,
  recordTokenIntent,
  useTokenPosition,
} from "@/lib/market-data";
import type { Token } from "@/lib/tokens";
import { SOL_MINT, USDC_MINT, formatUsd, rawAmountFromUi } from "@/lib/tokens";

const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;
const RECEIPT_KEY = "chadwallet-trade-receipts";

type TradeReceipt = {
  signature: string;
  status: "submitted" | "confirmed" | "finalized";
  slot: number | null;
  wallet: string;
  side: "buy" | "sell";
  inputSymbol: string;
  outputSymbol: string;
  inputAmount: string;
  outputAmount: number;
  route: string;
  router: string;
  tokenMint: string;
  createdAt: string;
  explorerUrl: string;
};

function formatTokenAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0.00";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 6 : 2,
  });
}

export function SwapPanel({ token, solPrice }: { token: Token; solPrice: number }) {
  if (hasPrivy) {
    return <PrivySwapPanel token={token} solPrice={solPrice} />;
  }

  return <SwapPanelCore token={token} solPrice={solPrice} />;
}

function PrivySwapPanel({ token, solPrice }: { token: Token; solPrice: number }) {
  const { authenticated } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const walletAddress = wallet?.address;
  const { signTransaction } = useSignTransaction();

  return (
    <SwapPanelCore
      token={token}
      solPrice={solPrice}
      authenticated={authenticated}
      wallet={wallet}
      walletAddress={walletAddress}
      onLogin={() => login()}
      onSignTransaction={signTransaction}
    />
  );
}

function SwapPanelCore({
  token,
  solPrice,
  authenticated = false,
  wallet,
  walletAddress,
  onLogin,
  onSignTransaction,
}: {
  token: Token;
  solPrice: number;
  authenticated?: boolean;
  wallet?: ReturnType<typeof useWallets>["wallets"][number];
  walletAddress?: string;
  onLogin?: () => void;
  onSignTransaction?: ReturnType<typeof useSignTransaction>["signTransaction"];
}) {
  const queryClient = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(token.mint === SOL_MINT ? "25" : "0.5");
  const [slippage, setSlippage] = useState("1");
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [signature, setSignature] = useState("");
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);

  const pair = useMemo(() => {
    const tradingSol = token.mint === SOL_MINT;

    if (side === "buy") {
      return {
        inputMint: tradingSol ? USDC_MINT : SOL_MINT,
        outputMint: token.mint,
        inputSymbol: tradingSol ? "USDC" : "SOL",
        outputSymbol: token.symbol,
        inputDecimals: tradingSol ? USDC_DECIMALS : SOL_DECIMALS,
        outputDecimals: token.decimals,
        inputPrice: tradingSol ? 1 : solPrice,
      };
    }

    return {
      inputMint: token.mint,
      outputMint: tradingSol ? USDC_MINT : SOL_MINT,
      inputSymbol: token.symbol,
      outputSymbol: tradingSol ? "USDC" : "SOL",
      inputDecimals: token.decimals,
      outputDecimals: tradingSol ? USDC_DECIMALS : SOL_DECIMALS,
      inputPrice: token.price || 0,
    };
  }, [side, solPrice, token]);

  const amt = Number.parseFloat(amount) || 0;
  const rawAmount = rawAmountFromUi(amt, pair.inputDecimals);
  const slippageBps = Math.round((Number.parseFloat(slippage) || 1) * 100);

  const quoteQuery = useQuery({
    queryKey: [
      "jupiter-quote",
      pair.inputMint,
      pair.outputMint,
      rawAmount.toString(),
      slippageBps,
      walletAddress,
    ],
    queryFn: ({ signal }) =>
      fetchJupiterQuote({
        inputMint: pair.inputMint,
        outputMint: pair.outputMint,
        amount: rawAmount,
        outputDecimals: pair.outputDecimals,
        slippageBps,
        taker: walletAddress,
        signal,
      }),
    enabled: rawAmount > 0n && pair.inputMint !== pair.outputMint,
    staleTime: 12_000,
    refetchInterval: 20_000,
    retry: 1,
  });
  const inputPositionQuery = useTokenPosition({
    owner: walletAddress,
    mint: pair.inputMint,
    decimals: pair.inputDecimals,
    price: pair.inputPrice,
  });
  const positionQuery = useTokenPosition({
    owner: walletAddress,
    mint: token.mint,
    decimals: token.decimals,
    price: token.price,
  });

  const inputUsd = quoteQuery.data?.inputUsd ?? amt * pair.inputPrice;
  const estimatedOut =
    quoteQuery.data?.outUiAmount ??
    (side === "buy"
      ? inputUsd / Math.max(token.price || 1, 0.00000001)
      : inputUsd / (pair.outputSymbol === "USDC" ? 1 : Math.max(solPrice, 0.00000001)));
  const networkFeeUsd = ((quoteQuery.data?.feeLamports ?? 5_000) / 1_000_000_000) * solPrice;
  const inputBalance = inputPositionQuery.data?.balance ?? 0;
  const inputBalanceReady = !authenticated || !walletAddress || Boolean(inputPositionQuery.data);
  const hasInputBalance = !authenticated || !walletAddress || inputBalance + 1e-9 >= amt;
  const tokenBalance = positionQuery.data?.balance ?? 0;
  const tokenValue = positionQuery.data?.valueUsd ?? 0;
  const positionNote = !walletAddress
    ? "Connect wallet to view live Solana balance."
    : positionQuery.isFetching
      ? "Loading live Solana balance..."
      : positionQuery.isError
        ? "Unable to read wallet balance from RPC."
        : `${positionQuery.data?.source ?? "Solana RPC"} balance synced.`;

  const buttonLabel = !hasPrivy
    ? "Add Privy app id to swap"
    : !authenticated
      ? `Connect wallet to ${side}`
      : !wallet || !onSignTransaction
        ? "Wallet unavailable"
        : quoteQuery.isFetching
          ? "Refreshing quote"
          : !inputBalanceReady
            ? "Checking balance"
            : !hasInputBalance
              ? `Deposit ${pair.inputSymbol} first`
              : `${side === "buy" ? "Buy" : "Sell"} ${token.symbol}`;

  const handlePrimary = async () => {
    if (!hasPrivy || !authenticated) {
      onLogin?.();
      return;
    }

    if (!wallet || !walletAddress || !onSignTransaction) {
      setTradeError("Wallet is not ready yet.");
      return;
    }

    if (!inputBalanceReady) {
      setTradeError("Wallet balance is still loading.");
      return;
    }

    if (!hasInputBalance) {
      setTradeError(`Insufficient ${pair.inputSymbol} balance.`);
      return;
    }

    if (!quoteQuery.data || rawAmount <= 0n) {
      setTradeError("Live Jupiter quote is not ready.");
      return;
    }

    setIsExecuting(true);
    setTradeError("");
    setSignature("");
    setReceipt(null);
    try {
      const order = await createJupiterSwapOrder({
        inputMint: pair.inputMint,
        outputMint: pair.outputMint,
        amount: rawAmount,
        outputDecimals: pair.outputDecimals,
        slippageBps,
        taker: walletAddress,
      });
      const { signedTransaction } = await onSignTransaction({
        wallet,
        chain: "solana:mainnet",
        transaction: base64ToBytes(order.transaction),
      });
      const result = await executeJupiterSwap({
        signedTransaction: bytesToBase64(signedTransaction),
        requestId: order.requestId,
        lastValidBlockHeight: order.lastValidBlockHeight,
      });
      if (!result.signature) {
        throw new Error("Jupiter executed the swap but did not return a signature.");
      }

      setSignature(result.signature);
      let status: Awaited<ReturnType<typeof confirmSolanaTransaction>>;
      try {
        status = await confirmSolanaTransaction(result.signature);
      } catch {
        status = undefined;
      }
      const nextReceipt: TradeReceipt = {
        signature: result.signature,
        status:
          status?.confirmationStatus === "finalized"
            ? "finalized"
            : status?.confirmed
              ? "confirmed"
              : "submitted",
        slot: status?.slot ?? (Number(result.slot) || null),
        wallet: walletAddress,
        side,
        inputSymbol: pair.inputSymbol,
        outputSymbol: pair.outputSymbol,
        inputAmount: amount,
        outputAmount: order.outUiAmount,
        route: order.route,
        router: order.router,
        tokenMint: token.mint,
        createdAt: new Date().toISOString(),
        explorerUrl: `https://solscan.io/tx/${result.signature}`,
      };
      setReceipt(nextReceipt);
      saveTradeReceipt(nextReceipt);
      await recordTokenIntent({
        wallet: walletAddress,
        mint: token.mint,
        symbol: token.symbol,
        side,
        amount,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["token-position", walletAddress] }),
        quoteQuery.refetch(),
      ]);
    } catch (swapError) {
      setTradeError(normalizeSwapError(swapError));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/60 p-1">
        <button
          onClick={() => setSide("buy")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            side === "buy"
              ? "bg-primary text-primary-foreground glow-green"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            side === "sell"
              ? "bg-destructive text-destructive-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>You {side === "buy" ? "pay" : "sell"}</span>
          <span>
            {walletAddress ? `${formatTokenAmount(inputBalance)} ${pair.inputSymbol}` : "No wallet"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full bg-transparent text-2xl font-mono font-semibold outline-none"
          />
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-semibold">
            {pair.inputSymbol}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">~ {formatUsd(inputUsd)}</div>
      </div>

      <div className="my-2 grid grid-cols-4 gap-1.5 text-xs">
        {["25%", "50%", "75%", "MAX"].map((preset) => (
          <button
            key={preset}
            onClick={() =>
              setAmount(
                preset === "MAX" ? amount : String(((amt || 1) * Number.parseInt(preset)) / 100),
              )
            }
            className="rounded-lg border border-border bg-background/40 py-1.5 font-mono transition hover:border-primary/50 hover:bg-background"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="-my-1 flex justify-center">
        <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>You receive</span>
          {quoteQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="truncate text-2xl font-mono font-semibold">
            {estimatedOut.toLocaleString(undefined, {
              maximumFractionDigits: estimatedOut < 1 ? 6 : 2,
            })}
          </div>
          <div className="rounded-full border border-border bg-card px-2.5 py-1 text-sm font-semibold">
            {pair.outputSymbol}
          </div>
        </div>
        {quoteQuery.isError && (
          <div className="mt-2 text-xs text-destructive">
            Jupiter route unavailable for this amount.
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <Row
          label="Price impact"
          value={quoteQuery.data ? `${quoteQuery.data.priceImpactPct.toFixed(3)}%` : "< 0.10%"}
          good={!quoteQuery.data || quoteQuery.data.priceImpactPct < 1}
        />
        <Row label="Route" value={quoteQuery.data?.route ?? "Jupiter"} />
        <Row label="Router" value={quoteQuery.data?.router ?? "Metis"} />
        <Row
          label="Quote latency"
          value={quoteQuery.data?.responseMs ? `${quoteQuery.data.responseMs}ms` : "live"}
        />
        <Row label="Network fee est." value={formatUsd(networkFeeUsd)} />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Slippage</span>
          <div className="flex gap-1">
            {["0.5", "1", "2"].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`rounded-md border px-2 py-0.5 font-mono ${
                  slippage === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handlePrimary}
        disabled={
          isExecuting ||
          quoteQuery.isFetching ||
          (!!authenticated &&
            (!wallet || !onSignTransaction || !inputBalanceReady || !hasInputBalance))
        }
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 font-semibold text-primary-foreground glow-green transition hover:opacity-90 disabled:opacity-60"
      >
        {isExecuting || quoteQuery.isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {buttonLabel}
      </button>

      {tradeError && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {tradeError}
        </div>
      )}

      {signature && receipt && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex items-center justify-between gap-3 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Swap {receipt.status}
            </span>
            <span className="font-mono">
              {signature.slice(0, 6)}...{signature.slice(-6)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-foreground/75">
            <span>
              {receipt.inputAmount} {receipt.inputSymbol}
            </span>
            <span className="text-right">
              {formatTokenAmount(receipt.outputAmount)} {receipt.outputSymbol}
            </span>
            <span className="truncate">{receipt.route}</span>
            <span className="text-right font-mono">
              {receipt.slot ? `slot ${receipt.slot.toLocaleString()}` : "processing"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={receipt.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-background/40 font-semibold"
            >
              Solscan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => downloadTradeReceipt(receipt)}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-background/40 font-semibold"
            >
              Receipt
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Your position
          </div>
          {positionQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : hasSupabase ? (
            <ShieldCheck className="h-4 w-4 text-primary" />
          ) : (
            <Zap className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <div className="min-w-0 truncate text-xl font-mono font-semibold">
            {formatTokenAmount(tokenBalance)} {token.symbol}
          </div>
          <div className="shrink-0 text-sm font-mono text-muted-foreground">
            {formatUsd(tokenValue)}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{positionNote}</div>
      </div>
    </div>
  );
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

function normalizeSwapError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Swap failed. Check wallet balance, slippage, and route liquidity.";
}

function saveTradeReceipt(receipt: TradeReceipt) {
  try {
    const current = JSON.parse(window.localStorage.getItem(RECEIPT_KEY) || "[]") as TradeReceipt[];
    const receipts = [receipt, ...current.filter((item) => item.signature !== receipt.signature)];
    window.localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipts.slice(0, 25)));
  } catch {
    // The receipt remains downloadable even when storage is unavailable.
  }
}

function downloadTradeReceipt(receipt: TradeReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chadwallet-swap-${receipt.signature.slice(0, 8)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`truncate text-right font-mono ${good ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
