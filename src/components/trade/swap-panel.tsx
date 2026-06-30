import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Send,
  Settings,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { hasPrivy, isTradeTestMode } from "@/lib/env";
import {
  confirmSolanaTransaction,
  createJupiterSwapOrder,
  executeJupiterSwap,
  fetchJupiterQuote,
  type LiveTrade,
  recordTradeReceipt,
  recordTokenIntent,
  type TradeReceiptRecord,
  type WalletTokenPosition,
  useTokenTrades,
  useTokenPosition,
  useWalletTokenPositions,
} from "@/lib/market-data";
import { SOLANA_MAINNET_CHAIN } from "@/lib/solana-chain";
import type { Token } from "@/lib/tokens";
import { SOL_MINT, USDC_MINT, formatCompact, formatUsd, rawAmountFromUi } from "@/lib/tokens";

const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;
const RECEIPT_KEY = "chadwallet-trade-receipts";
const HIGH_PRICE_IMPACT_PCT = 25;

type TradeReceipt = TradeReceiptRecord;

function formatTokenAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0.00";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 6 : 2,
  });
}

function sanitizeDecimalInput(value: string, decimals: number) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  const fraction = fractionParts.join("").slice(0, decimals);
  const wholePart = whole.replace(/^0+(?=\d)/, "") || (whole ? "0" : "");

  if (!fractionParts.length) return wholePart;
  return `${wholePart || "0"}.${fraction}`;
}

function formatAmountForInput(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const rounded = value.toFixed(Math.min(decimals, value < 1 ? 8 : 6));
  return rounded.replace(/\.?0+$/, "");
}

function formatQuoteUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return formatUsd(value);
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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [positionsFilter, setPositionsFilter] = useState<"open" | "closed">("open");

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
  const hasValidAmount = Number.isFinite(amt) && amt > 0 && rawAmount > 0n;

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
    enabled: hasValidAmount && pair.inputMint !== pair.outputMint,
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
  const walletPositionsQuery = useWalletTokenPositions(walletAddress, solPrice);

  const inputUsd = quoteQuery.data?.inputUsd ?? amt * pair.inputPrice;
  const estimatedOut =
    quoteQuery.data?.outUiAmount ??
    (side === "buy"
      ? inputUsd / Math.max(token.price || 1, 0.00000001)
      : inputUsd / (pair.outputSymbol === "USDC" ? 1 : Math.max(solPrice, 0.00000001)));
  const networkFeeUsd = ((quoteQuery.data?.feeLamports ?? 5_000) / 1_000_000_000) * solPrice;
  const inputBalance = inputPositionQuery.data?.balance ?? 0;
  const inputBalanceReady =
    isTradeTestMode || !authenticated || !walletAddress || Boolean(inputPositionQuery.data);
  const hasInputBalance =
    isTradeTestMode || !authenticated || !walletAddress || inputBalance + 1e-9 >= amt;
  const openPositions = useMemo(
    () => mergeWalletPositions(walletPositionsQuery.data ?? []),
    [walletPositionsQuery.data],
  );
  const quoteReady = Boolean(quoteQuery.data && hasValidAmount);
  const priceImpactTooHigh =
    quoteReady && (quoteQuery.data?.priceImpactPct ?? 0) > HIGH_PRICE_IMPACT_PCT;
  const quoteError = quoteQuery.error instanceof Error ? quoteQuery.error.message : "";
  const quoteUnavailable = hasValidAmount && quoteQuery.isError && !quoteQuery.data;
  const amountTooSmall = amount.length > 0 && amt > 0 && rawAmount <= 0n;
  const inputIsUsd = pair.inputSymbol === "USDC";
  const isDustQuoteAmount = hasValidAmount && inputUsd > 0 && inputUsd < 0.01;
  const routeUnavailableMessage = isDustQuoteAmount
    ? `Amount is only ${formatQuoteUsd(inputUsd)}. Use a larger ${pair.inputSymbol} amount.`
    : quoteError ||
      `${token.symbol} is live, but Jupiter has no route for this token or amount yet.`;
  const quoteStatus = !hasValidAmount
    ? amountTooSmall
      ? `Minimum precision is ${pair.inputDecimals} decimals`
      : "Enter an amount to fetch a live Jupiter quote"
    : quoteQuery.isFetching
      ? "Fetching live Jupiter quote"
      : priceImpactTooHigh
        ? `Price impact ${quoteQuery.data!.priceImpactPct.toFixed(1)}% is too high`
        : quoteReady
          ? `${formatTokenAmount(quoteQuery.data!.outUiAmount)} ${pair.outputSymbol} via ${quoteQuery.data!.route}`
          : quoteUnavailable
            ? routeUnavailableMessage
            : "Waiting for live Jupiter quote";

  const buttonLabel = (() => {
    if (isTradeTestMode) {
      if (quoteQuery.isFetching) return "Refreshing quote";
      if (!hasValidAmount) return `Enter ${pair.inputSymbol} amount`;
      if (!quoteReady) return "Waiting for quote";
      return `Paper ${side === "buy" ? "Buy" : "Sell"} ${token.symbol}`;
    }

    if (!hasPrivy) return "Add Privy app id to swap";
    if (!authenticated) return `Connect wallet to ${side}`;
    if (!wallet || !onSignTransaction) return "Wallet unavailable";
    if (!hasValidAmount) return `Enter ${pair.inputSymbol} amount`;
    if (quoteQuery.isFetching) return "Refreshing quote";
    if (quoteUnavailable) return isDustQuoteAmount ? "Amount too small" : "No Jupiter route";
    if (!quoteReady) return "Waiting for quote";
    if (!inputBalanceReady) return "Checking balance";
    if (!hasInputBalance) return `Deposit ${pair.inputSymbol} first`;
    return `${side === "buy" ? "Buy" : "Sell"} ${token.symbol}`;
  })();
  const primaryDisabled =
    isExecuting ||
    quoteQuery.isFetching ||
    (isTradeTestMode && (!hasValidAmount || !quoteReady)) ||
    (!isTradeTestMode &&
      authenticated &&
      (!wallet ||
        !onSignTransaction ||
        !hasValidAmount ||
        !quoteReady ||
        !inputBalanceReady ||
        !hasInputBalance));

  useEffect(() => {
    setAmount("0");
    setSelectedPercent(null);
    setTradeError("");
    setSignature("");
    setReceipt(null);
  }, [side, token.mint]);

  const handlePrimary = async () => {
    if (isTradeTestMode) {
      if (!quoteReady) {
        setTradeError(quoteUnavailable ? quoteStatus : "Waiting for live Jupiter quote.");
        return;
      }

      const quote = quoteQuery.data;
      if (!quote) {
        setTradeError("Waiting for live Jupiter quote.");
        return;
      }
      setIsExecuting(true);
      setTradeError("");
      setSignature("");
      setReceipt(null);

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        const paperSignature = `paper-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;
        const nextReceipt: TradeReceipt = {
          signature: paperSignature,
          status: "paper",
          slot: null,
          wallet: walletAddress ?? "paper-wallet",
          mode: "paper",
          side,
          inputSymbol: pair.inputSymbol,
          outputSymbol: pair.outputSymbol,
          inputAmount: amount,
          outputAmount: quote.outUiAmount,
          route: quote.route,
          router: quote.router,
          tokenMint: token.mint,
          createdAt: new Date().toISOString(),
        };

        setSignature(paperSignature);
        setReceipt(nextReceipt);
        saveTradeReceipt(nextReceipt);
      } finally {
        setIsExecuting(false);
      }
      return;
    }

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

    if (!quoteReady) {
      setTradeError(quoteUnavailable ? quoteStatus : "Waiting for live Jupiter quote.");
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
        chain: SOLANA_MAINNET_CHAIN,
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
        mode: "mainnet",
        side,
        inputSymbol: pair.inputSymbol,
        outputSymbol: pair.outputSymbol,
        inputAmount: amount,
        outputAmount:
          rawAmountToUi(result.outputAmountResult, pair.outputDecimals) ?? order.outUiAmount,
        route: order.route,
        router: order.router,
        tokenMint: token.mint,
        createdAt: new Date().toISOString(),
        explorerUrl: `https://solscan.io/tx/${result.signature}`,
      };
      setReceipt(nextReceipt);
      saveTradeReceipt(nextReceipt);
      const [, receiptStorage] = await Promise.allSettled([
        recordTokenIntent({
          wallet: walletAddress,
          mint: token.mint,
          symbol: token.symbol,
          side,
          amount,
        }),
        recordTradeReceipt(nextReceipt),
      ]);
      if (
        receiptStorage.status === "rejected" ||
        (receiptStorage.status === "fulfilled" && !receiptStorage.value.stored)
      ) {
        setTradeError(
          "Swap succeeded on-chain, but ChadWallet could not store the app receipt. Keep the Solscan link and refresh.",
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["token-position", walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-token-positions", walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ["trade-receipts", walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ["app-leaderboard"] }),
        quoteQuery.refetch(),
      ]);
    } catch (swapError) {
      setTradeError(normalizeSwapError(swapError));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-3.5 w-full">
      {/* Swap Panel Card */}
      <div className="rounded-2xl border border-[#1b1726]/70 bg-transparent p-2 flex flex-col gap-1.5">
        {/* Buy/Sell Selector Container */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-transparent p-0.5">
          <button
            onClick={() => {
              setSide("buy");
              setTradeError("");
            }}
            className={`rounded-lg py-1 text-xs font-bold transition duration-200 ${
              side === "buy"
                ? "bg-[#0d2a1d] text-[#20d772]"
                : "bg-transparent text-[#7a7488] hover:text-white"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => {
              setSide("sell");
              setTradeError("");
            }}
            className={`rounded-lg py-1 text-xs font-bold transition duration-200 ${
              side === "sell"
                ? "bg-[#2c1816] text-[#ff5e36]"
                : "bg-transparent text-[#7a7488] hover:text-white"
            }`}
          >
            Sell
          </button>
        </div>

        {/* Input box */}
        <div className="rounded-xl border border-[#1b1726]/45 bg-transparent p-2">
          <div className="flex items-center justify-between text-[11px] text-[#7a7488]">
            <span>You {side === "buy" ? "pay" : "sell"}</span>
            <span>
              {walletAddress
                ? `${formatTokenAmount(inputBalance)} ${pair.inputSymbol}`
                : "No wallet"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-1.5">
            <div className="flex-1 flex items-center">
              {inputIsUsd && (
                <span className="text-2xl font-mono font-bold text-[#f3efff] mr-0.5">$</span>
              )}
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(sanitizeDecimalInput(e.target.value, pair.inputDecimals));
                  setSelectedPercent(null);
                  setTradeError("");
                }}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent text-2xl font-mono font-bold text-[#f3efff] outline-none placeholder:text-[#5d5669]"
              />
            </div>
            <div className="text-[11px] text-[#7a7488] shrink-0 font-semibold font-mono">
              {pair.inputSymbol}
            </div>
          </div>
          <div className="text-[10.5px] text-[#7a7488] font-mono mt-0.5">
            {quoteQuery.isFetching
              ? "Fetching Jupiter quote..."
              : priceImpactTooHigh
                ? quoteStatus
                : quoteReady
                  ? side === "buy"
                    ? `~ ${estimatedOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pair.outputSymbol}`
                    : `~ ${formatUsd(inputUsd)}`
                  : quoteUnavailable
                    ? routeUnavailableMessage
                    : quoteStatus}
          </div>
        </div>

        {/* Preset & Settings Row */}
        <div className="flex gap-1.5 text-xs">
          {[10, 25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              disabled={!inputBalanceReady || inputBalance <= 0}
              onClick={() => {
                const maxSpendable =
                  pair.inputSymbol === "SOL" ? Math.max(inputBalance - 0.002, 0) : inputBalance;
                setAmount(formatAmountForInput((maxSpendable * percent) / 100, pair.inputDecimals));
                setSelectedPercent(percent);
                setTradeError("");
              }}
              className={`flex-1 rounded-lg border h-[26px] flex items-center justify-center font-mono font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                selectedPercent === percent
                  ? "border-[#7567ff]/70 bg-[#241f38] text-white"
                  : "border-[#1b1726]/45 bg-transparent text-[#9099a3] hover:bg-[#1b1726]/45 hover:text-white"
              }`}
            >
              {percent}%
            </button>
          ))}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-lg h-[26px] w-[26px] transition flex items-center justify-center shrink-0 ${
              showSettings
                ? "bg-[#252134] text-white"
                : "border border-[#1b1726]/45 bg-transparent text-[#9099a3] hover:bg-[#1b1726]/45"
            }`}
            title="Slippage & details"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>

        {/* Collapsible details / settings */}
        {showSettings && (
          <div className="rounded-xl border border-[#1b1726]/60 bg-transparent p-2.5 space-y-1.5 text-[11px]">
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
            <div className="flex items-center justify-between border-t border-[#1b1726]/20 pt-1.5 mt-1.5">
              <span className="text-[#7a7488]">Slippage limit</span>
              <div className="flex gap-1">
                {["0.5", "1", "2"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] border transition ${
                      slippage === value
                        ? "border-[#7567ff] bg-[#1d1b3f] text-white"
                        : "border-[#1b1726] text-[#7a7488] hover:text-white"
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Balance Status text */}
        <div className="text-[10px] text-[#7a7488] text-center px-1 font-mono leading-none">
          {isTradeTestMode
            ? "Paper mode - no wallet signature or on-chain transaction"
            : walletAddress
              ? `${formatTokenAmount(inputBalance)} ${pair.inputSymbol} available`
              : "Connect wallet to view balance"}
        </div>

        {/* Main Action Button */}
        <button
          onClick={handlePrimary}
          disabled={primaryDisabled}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-transparent hover:bg-[#1b1726]/55 border border-[#252137] h-[38px] text-[13px] font-bold text-[#e8e4f0] transition disabled:opacity-60"
        >
          {isExecuting || quoteQuery.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            buttonLabel
          )}
        </button>

        {tradeError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-[11px] text-destructive">
            {tradeError}
          </div>
        )}

        {signature && receipt && (
          <div className="rounded-lg border border-primary/30 bg-[#20d772]/10 p-2.5 text-[11px] text-primary">
            <div className="flex items-center justify-between gap-3 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#20d772]" />
                {receipt.mode === "paper" ? "Paper swap" : `Swap ${receipt.status}`}
              </span>
              <span className="font-mono">
                {signature.slice(0, 6)}...{signature.slice(-6)}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] text-foreground/75">
              <span>
                {receipt.inputAmount} {receipt.inputSymbol}
              </span>
              <span className="text-right">
                {formatTokenAmount(receipt.outputAmount)} {receipt.outputSymbol}
              </span>
              <span className="truncate">{receipt.route}</span>
              <span className="text-right font-mono">
                {receipt.mode === "paper"
                  ? "not submitted"
                  : receipt.slot
                    ? `slot ${receipt.slot.toLocaleString()}`
                    : "processing"}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {receipt.explorerUrl ? (
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 items-center justify-center gap-1 rounded-md border border-primary/30 bg-background/40 font-semibold"
                >
                  Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="flex h-7 items-center justify-center rounded-md border border-primary/30 bg-background/40 font-semibold">
                  Paper only
                </div>
              )}
              <button
                type="button"
                onClick={() => downloadTradeReceipt(receipt)}
                className="flex h-7 items-center justify-center gap-1 rounded-md border border-primary/30 bg-background/40 font-semibold"
              >
                Receipt
                <Download className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About Token Card */}
      <TokenAboutCard token={token} />

      {/* Your Positions Card */}
      <div className="rounded-2xl border border-[#1b1726]/70 bg-transparent p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white">Your positions</h3>
          {/* Open/Closed toggle capsule */}
          <div className="flex items-center gap-0.5 rounded-full bg-transparent p-0.5 text-[10px] font-semibold border border-[#1b1726]/60">
            <button
              onClick={() => setPositionsFilter("open")}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                positionsFilter === "open"
                  ? "bg-[#1b1726]/70 text-white"
                  : "text-[#7a7488] hover:text-white"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setPositionsFilter("closed")}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                positionsFilter === "closed"
                  ? "bg-[#1b1726]/70 text-white"
                  : "text-[#7a7488] hover:text-white"
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Position rows content */}
        {positionsFilter === "open" && walletPositionsQuery.isLoading ? (
          <div className="text-[11px] text-[#7a7488] font-medium text-center py-3 bg-transparent rounded-xl mt-2.5 border border-[#1b1726]/40">
            Loading wallet positions
          </div>
        ) : positionsFilter === "open" && openPositions.length > 0 ? (
          <div className="mt-2.5 space-y-1.5">
            {openPositions.slice(0, 8).map((position) => (
              <PositionRow key={position.mint} position={position} />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-[#7a7488] font-medium text-center py-3 bg-transparent rounded-xl mt-2.5 border border-[#1b1726]/40">
            No {positionsFilter} positions
          </div>
        )}
      </div>
    </div>
  );
}

function PositionRow({ position }: { position: WalletTokenPosition }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1b1726]/40 bg-transparent p-2 transition-colors hover:bg-[#1b1726]/35">
      <div className="flex min-w-0 items-center gap-2">
        {position.logo ? (
          <img
            src={position.logo}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
            {position.symbol.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold text-[#e8e4f0]">{position.symbol}</div>
          <div className="mt-0.5 truncate font-mono text-[10px] leading-none text-[#7a7488]">
            {formatTokenAmount(position.balance)} size
          </div>
        </div>
      </div>
      <div className="min-w-[90px] text-right">
        <div className="font-mono text-[12px] font-bold text-[#e8e4f0]">
          {formatUsd(position.valueUsd)}
        </div>
        <div className="mt-0.5 font-mono text-[10px] font-semibold leading-none text-[#7a7488]">
          Live value
        </div>
      </div>
    </div>
  );
}

function mergeWalletPositions(positions: WalletTokenPosition[]) {
  const byMint = new Map<string, WalletTokenPosition>();

  for (const position of positions) {
    if (!Number.isFinite(position.balance) || position.balance <= 0) continue;
    const current = byMint.get(position.mint);
    if (!current) {
      byMint.set(position.mint, position);
      continue;
    }

    const balance = current.balance + position.balance;
    byMint.set(position.mint, {
      ...current,
      balance,
      valueUsd: current.valueUsd + position.valueUsd,
      price: balance > 0 ? (current.valueUsd + position.valueUsd) / balance : current.price,
    });
  }

  return [...byMint.values()].sort((left, right) => right.valueUsd - left.valueUsd);
}

type AboutPeriod = "5M" | "1H" | "4H" | "1D";

type AboutPeriodStats = {
  change: number | null;
  buys: number;
  sells: number;
  buyers: number;
  sellers: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
};

const ABOUT_PERIODS: AboutPeriod[] = ["5M", "1H", "4H", "1D"];

const ABOUT_PERIOD_MS: Record<AboutPeriod, number> = {
  "5M": 5 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
};

function buildPeriodStats(trades: LiveTrade[], change24h: number) {
  return ABOUT_PERIODS.reduce(
    (result, period) => {
      result[period] = buildSinglePeriodStats(period, trades, change24h);
      return result;
    },
    {} as Record<AboutPeriod, AboutPeriodStats>,
  );
}

function buildSinglePeriodStats(
  period: AboutPeriod,
  trades: LiveTrade[],
  change24h: number,
): AboutPeriodStats {
  const since = Date.now() - ABOUT_PERIOD_MS[period];
  const scopedTrades = trades
    .filter((trade) => Number.isFinite(trade.timestamp) && Number(trade.timestamp) >= since)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  const buys = scopedTrades.filter((trade) => trade.side === "buy");
  const sells = scopedTrades.filter((trade) => trade.side === "sell");
  const buyVolume = buys.reduce((sum, trade) => sum + safeNumber(trade.amountUsd), 0);
  const sellVolume = sells.reduce((sum, trade) => sum + safeNumber(trade.amountUsd), 0);
  const change =
    period === "1D" && Number.isFinite(change24h) ? change24h : priceChangeFromTrades(scopedTrades);

  return {
    change,
    buys: buys.length,
    sells: sells.length,
    buyers: new Set(buys.map((trade) => trade.wallet).filter(Boolean)).size,
    sellers: new Set(sells.map((trade) => trade.wallet).filter(Boolean)).size,
    buyVolume,
    sellVolume,
    totalVolume: buyVolume + sellVolume,
  };
}

function priceChangeFromTrades(trades: LiveTrade[]) {
  const pricedTrades = trades.filter((trade) => Number.isFinite(trade.price) && trade.price > 0);
  if (pricedTrades.length < 2) return null;
  const first = pricedTrades[0].price;
  const last = pricedTrades[pricedTrades.length - 1].price;
  return first > 0 ? ((last - first) / first) * 100 : null;
}

function formatPeriodChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "▲" : "▼"}${Math.abs(value).toFixed(1)}%`;
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function tokenSocialLinks(token: Token) {
  const website = token.websites?.[0];
  return [
    website ? { label: "Website", href: website, Icon: Globe } : null,
    token.twitter ? { label: "X", href: token.twitter, Icon: Twitter } : null,
    token.telegram ? { label: "Telegram", href: token.telegram, Icon: Send } : null,
  ].filter((link): link is { label: string; href: string; Icon: LucideIcon } => Boolean(link));
}

function providerName(source: Token["source"]) {
  if (source === "geckoterminal") return "GeckoTerminal";
  if (source === "dexscreener") return "DexScreener";
  if (source === "birdeye") return "BirdEye";
  if (source === "jupiter") return "Jupiter";
  return "live";
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function TokenAboutCard({ token }: { token: Token }) {
  const trades = useTokenTrades(token.mint, true);
  const liveTrades = useMemo(() => trades.data?.data ?? [], [trades.data?.data]);
  const [expanded, setExpanded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activePeriod, setActivePeriod] = useState<AboutPeriod>("1D");
  const periodStats = useMemo(
    () => buildPeriodStats(liveTrades, token.change24h),
    [liveTrades, token.change24h],
  );
  const activeStats = periodStats[activePeriod];
  const socialLinks = tokenSocialLinks(token);
  const aboutText =
    token.description ??
    `${token.symbol} is a live Solana token tracked from ${providerName(token.source)} market data.`;
  const aboutSummary =
    aboutText.length > 170 && !expanded ? `${aboutText.slice(0, 167).trim()}...` : aboutText;
  const hasActivity = activeStats.totalVolume > 0 || activeStats.buys + activeStats.sells > 0;
  const buyShare = hasActivity
    ? Math.min(
        96,
        Math.max(4, (activeStats.buyVolume / Math.max(activeStats.totalVolume, 1)) * 100),
      )
    : 0;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(token.mint);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1400);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="rounded-2xl border border-[#1b1726]/70 bg-transparent p-3">
      <h3 className="text-xs font-bold text-white">About {token.symbol}</h3>
      <p className="mt-1 text-[11.5px] font-medium text-[#9099a3] leading-relaxed">
        {aboutSummary}
      </p>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {ABOUT_PERIODS.map((label) => {
          const stats = periodStats[label];
          const selected = activePeriod === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActivePeriod(label)}
              className={`rounded-lg border px-1 py-1.5 text-center transition ${
                selected
                  ? "border-[#7567ff]/70 bg-[#1b1726]/70"
                  : "border-[#1b1726]/40 bg-transparent hover:bg-[#1b1726]/45"
              }`}
            >
              <div className="text-[10px] font-bold text-[#7a7488]">{label}</div>
              <div
                className={`mt-0.5 font-mono text-[11px] font-bold ${
                  stats.change === null
                    ? "text-[#7a7488]"
                    : stats.change >= 0
                      ? "text-[#20d772]"
                      : "text-[#ff5e36]"
                }`}
              >
                {formatPeriodChange(stats.change)}
              </div>
            </button>
          );
        })}
      </div>
      <ActivityBar
        left={`${activeStats.buys.toLocaleString()} buys`}
        right={`${activeStats.sells.toLocaleString()} sells`}
        leftPct={buyShare}
        hasData={hasActivity}
      />
      <ActivityBar
        left={`$${formatCompact(activeStats.buyVolume)} vol.`}
        right={`$${formatCompact(activeStats.sellVolume)} vol.`}
        leftPct={buyShare}
        hasData={hasActivity}
      />
      <ActivityBar
        left={`${activeStats.buyers.toLocaleString()} buyers`}
        right={`${activeStats.sellers.toLocaleString()} sellers`}
        leftPct={buyShare}
        hasData={hasActivity}
      />

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3.5 pt-3 border-t border-[#1b1726]/50 flex flex-col gap-2.5">
          {/* Social icons row */}
          {socialLinks.length > 0 ? (
            <div className="flex gap-2 w-full">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[28px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#252137] bg-transparent text-[11px] font-bold text-[#e8e4f0] transition hover:bg-[#1b1726]/55 hover:text-white"
                >
                  <link.Icon className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#1b1726]/50 p-2 text-[11px] font-semibold text-[#7a7488]">
              No verified website or social links from market metadata yet.
            </div>
          )}

          {/* Metadata rows */}
          <div className="text-[11.5px] text-[#7a7488] space-y-2 mt-1">
            {token.poolDex && (
              <div className="flex items-center justify-between">
                <span>DEX</span>
                <span className="flex items-center gap-1 text-white font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20d772] shrink-0" />
                  {token.poolDex}
                </span>
              </div>
            )}
            {token.liquidity !== undefined && (
              <div className="flex items-center justify-between">
                <span>Liquidity</span>
                <span className="text-white font-semibold font-mono">
                  {formatUsd(token.liquidity)}
                </span>
              </div>
            )}
            {token.holders > 0 && (
              <div className="flex items-center justify-between">
                <span>Holders</span>
                <span className="text-white font-semibold font-mono">
                  {token.holders.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Network</span>
              <span className="text-white font-semibold">Solana</span>
            </div>
            {token.poolCreatedAt && (
              <div className="flex items-center justify-between">
                <span>Pool created</span>
                <span className="text-white font-semibold">
                  {formatShortDate(token.poolCreatedAt)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-[#1b1726]/10">
              <span>Contract address</span>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 text-[#b9b2c7] hover:text-[#7567ff] font-mono font-semibold transition ml-auto"
                title="Copy address"
              >
                {token.mint.slice(0, 6)}...{token.mint.slice(-6)}
                <Copy className="h-2.5 w-2.5" />
                {copiedAddress && (
                  <span className="text-[#20d772] text-[9px] font-bold ml-1">Copied</span>
                )}
              </button>
            </div>
            {(token.geckoTerminalUrl || token.dexScreenerUrl) && (
              <div className="flex gap-2 pt-1">
                {token.geckoTerminalUrl && (
                  <a
                    href={token.geckoTerminalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#b9b2c7] hover:text-white transition"
                  >
                    GeckoTerminal
                  </a>
                )}
                {token.dexScreenerUrl && (
                  <a
                    href={token.dexScreenerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#b9b2c7] hover:text-white transition"
                  >
                    DexScreener
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mx-auto mt-3 h-[26px] flex items-center justify-center rounded-md bg-transparent hover:bg-[#1b1726]/55 border border-[#252137] px-3 text-[11px] font-bold text-[#b9b2c7] transition"
      >
        {expanded ? "View less" : "View more"}
      </button>
    </section>
  );
}

function ActivityBar({
  left,
  right,
  leftPct,
  hasData = true,
}: {
  left: string;
  right: string;
  leftPct: number;
  hasData?: boolean;
}) {
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex justify-between text-[10.5px] font-semibold text-[#f3efff]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="flex h-1 overflow-hidden rounded-full bg-[#2a2535] w-full">
        {hasData ? (
          <>
            <div className="bg-[#20d772]" style={{ width: `${leftPct}%` }} />
            <div className="w-[3px] bg-[#12111a]" />
            <div className="bg-[#ff653d] flex-grow" />
          </>
        ) : (
          <div className="h-full w-full bg-[#2a2535]" />
        )}
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

function rawAmountToUi(rawAmount: string | undefined, decimals: number) {
  if (!rawAmount) return null;
  const value = Number(rawAmount) / 10 ** decimals;
  return Number.isFinite(value) ? value : null;
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
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-[#7a7488]">{label}</span>
      <span
        className={`truncate text-right font-mono font-semibold ${good ? "text-[#20d772]" : "text-[#f3efff]"}`}
      >
        {value}
      </span>
    </div>
  );
}
