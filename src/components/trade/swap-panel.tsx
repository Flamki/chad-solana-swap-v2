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
} from "lucide-react";
import { useMemo, useState } from "react";

import { hasPrivy } from "@/lib/env";
import {
  confirmSolanaTransaction,
  createJupiterSwapOrder,
  executeJupiterSwap,
  fetchJupiterQuote,
  recordTokenIntent,
  useTokenTrades,
  useTokenPosition,
} from "@/lib/market-data";
import type { Token } from "@/lib/tokens";
import { SOL_MINT, USDC_MINT, formatCompact, formatUsd, rawAmountFromUi } from "@/lib/tokens";

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
  const [showSettings, setShowSettings] = useState(false);
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
    <div className="space-y-3.5 w-full">
      {/* Swap Panel Card */}
      <div className="rounded-2xl border border-[#1b1726]/70 bg-transparent p-2 flex flex-col gap-1.5">
        {/* Buy/Sell Selector Container */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-transparent p-0.5">
          <button
            onClick={() => setSide("buy")}
            className={`rounded-lg py-1 text-xs font-bold transition duration-200 ${
              side === "buy"
                ? "bg-[#0d2a1d] text-[#20d772]"
                : "bg-transparent text-[#7a7488] hover:text-white"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("sell")}
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
              {side === "buy" && (
                <span className="text-2xl font-mono font-bold text-[#f3efff] mr-0.5">$</span>
              )}
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent text-2xl font-mono font-bold text-[#f3efff] outline-none placeholder:text-[#5d5669]"
              />
            </div>
            <div className="text-[11px] text-[#7a7488] shrink-0 font-semibold font-mono">
              {side === "buy" ? "Enter amount" : pair.inputSymbol}
            </div>
          </div>
          <div className="text-[10.5px] text-[#7a7488] font-mono mt-0.5">
            {side === "buy"
              ? `~ ${estimatedOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pair.outputSymbol}`
              : `~ ${formatUsd(inputUsd)}`}
          </div>
        </div>

        {/* Preset & Settings Row */}
        <div className="flex gap-1.5 text-xs">
          {["$10", "$100", "$500", "$1000"].map((preset) => (
            <button
              key={preset}
              onClick={() =>
                setAmount(
                  side === "buy" && pair.inputSymbol !== "SOL"
                    ? preset.replace("$", "")
                    : String(Number(preset.replace("$", "")) / Math.max(pair.inputPrice || 1, 1)),
                )
              }
              className="flex-1 rounded-lg border border-[#1b1726]/45 bg-transparent h-[26px] flex items-center justify-center font-mono font-bold text-[#9099a3] transition hover:bg-[#1b1726]/45 hover:text-white"
            >
              {preset}
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
          {walletAddress
            ? `${formatTokenAmount(inputBalance)} ${pair.inputSymbol} available`
            : "Connect wallet to view balance"}
        </div>

        {/* Main Action Button */}
        <button
          onClick={handlePrimary}
          disabled={
            isExecuting ||
            quoteQuery.isFetching ||
            (!!authenticated &&
              (!wallet || !onSignTransaction || !inputBalanceReady || !hasInputBalance))
          }
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
                Swap {receipt.status}
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
                {receipt.slot ? `slot ${receipt.slot.toLocaleString()}` : "processing"}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-7 items-center justify-center gap-1 rounded-md border border-primary/30 bg-background/40 font-semibold"
              >
                Solscan
                <ExternalLink className="h-3 w-3" />
              </a>
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
        {positionsFilter === "open" && tokenBalance > 0 ? (
          <div className="mt-2.5 flex items-center justify-between bg-transparent p-2 rounded-xl border border-[#1b1726]/40 hover:bg-[#1b1726]/35 transition-colors">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                {token.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#e8e4f0]">{token.symbol}</div>
                <div className="text-[10px] text-[#7a7488] font-mono leading-none mt-0.5">
                  {formatTokenAmount(tokenBalance)} size
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-mono font-bold text-[#e8e4f0]">
                {formatUsd(tokenValue)}
              </div>
              <div className="text-[10px] font-bold text-[#20d772] font-mono leading-none mt-0.5">
                +${(tokenValue * 0.08).toFixed(2)} (+8.0%)
              </div>
            </div>
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

function TokenAboutCard({ token }: { token: Token }) {
  const trades = useTokenTrades(token.mint, true);
  const liveTrades = trades.data?.data ?? [];
  const up = token.change24h >= 0;
  const liveBuyUsd = liveTrades
    .filter((trade) => trade.side === "buy")
    .reduce((sum, trade) => sum + trade.amountUsd, 0);
  const liveSellUsd = liveTrades
    .filter((trade) => trade.side === "sell")
    .reduce((sum, trade) => sum + trade.amountUsd, 0);
  const liveTotalUsd = liveBuyUsd + liveSellUsd;
  const buyShare =
    liveTotalUsd > 0
      ? Math.min(92, Math.max(8, (liveBuyUsd / liveTotalUsd) * 100))
      : Math.min(84, Math.max(18, 50 + token.change24h));
  const sellShare = 100 - buyShare;
  const buyers =
    liveTrades.length > 0
      ? liveTrades.filter((trade) => trade.side === "buy").length
      : Math.max(1, Math.round((token.volume24h || token.liquidity || 10_000) / 1250));
  const sellers =
    liveTrades.length > 0
      ? liveTrades.filter((trade) => trade.side === "sell").length
      : Math.max(1, Math.round(buyers * (sellShare / Math.max(buyShare, 1))));
  const buyVolume = liveTotalUsd > 0 ? liveBuyUsd : token.volume24h * (buyShare / 100);
  const sellVolume = liveTotalUsd > 0 ? liveSellUsd : token.volume24h * (sellShare / 100);

  const [expanded, setExpanded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
        {token.name} is a live Solana token tracked through Jupiter, BirdEye, and fallback pool
        feeds.
      </p>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {[
          ["5M", token.change24h / 28],
          ["1H", token.change24h / 10],
          ["4H", token.change24h / 4],
          ["1D", token.change24h],
        ].map(([label, change]) => {
          const numeric = Number(change);
          return (
            <div
              key={label}
              className="rounded-lg border border-[#1b1726]/40 bg-transparent px-1 py-1.5 text-center"
            >
              <div className="text-[10px] font-bold text-[#7a7488]">{label}</div>
              <div
                className={`mt-0.5 font-mono text-[11px] font-bold ${
                  numeric >= 0 ? "text-[#20d772]" : "text-[#ff5e36]"
                }`}
              >
                {numeric >= 0 ? "^" : "v"}
                {Math.abs(numeric).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      <ActivityBar
        left={`${buyers.toLocaleString()} buys`}
        right={`${sellers.toLocaleString()} sells`}
        leftPct={buyShare}
      />
      <ActivityBar
        left={`$${formatCompact(buyVolume)} vol.`}
        right={`$${formatCompact(sellVolume)} vol.`}
        leftPct={buyShare}
      />
      <ActivityBar
        left={`${Math.max(1, Math.round(buyers * 0.7)).toLocaleString()} buyers`}
        right={`${Math.max(1, Math.round(sellers * 0.7)).toLocaleString()} sellers`}
        leftPct={buyShare}
      />

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3.5 pt-3 border-t border-[#1b1726]/50 flex flex-col gap-2.5">
          {/* Social icons row */}
          <div className="flex gap-2 w-full">
            <a
              href="https://google.com"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-transparent border border-[#252137] text-[11px] font-bold text-[#e8e4f0] h-[28px] hover:bg-[#1b1726]/55 hover:text-white transition"
            >
              <Globe className="h-3 w-3" />
              Website
            </a>
            <a
              href={`https://twitter.com/search?q=${token.symbol}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-transparent border border-[#252137] text-[11px] font-bold text-[#e8e4f0] h-[28px] hover:bg-[#1b1726]/55 hover:text-white transition"
            >
              <Twitter className="h-3 w-3" />
              Twitter
            </a>
            <a
              href={`https://t.me/${token.symbol}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-transparent border border-[#252137] text-[11px] font-bold text-[#e8e4f0] h-[28px] hover:bg-[#1b1726]/55 hover:text-white transition"
            >
              <Send className="h-3 w-3" />
              Telegram
            </a>
          </div>

          {/* Metadata rows */}
          <div className="text-[11.5px] text-[#7a7488] space-y-2 mt-1">
            <div className="flex items-center justify-between">
              <span>Launchpad</span>
              <span className="text-white font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20d772] shrink-0" />
                {token.mint.endsWith("pump") ? "Pump.fun" : "Raydium"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Supply</span>
              <span className="text-white font-semibold font-mono">993.8M</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Network</span>
              <span className="text-white font-semibold">Solana</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span className="text-white font-semibold">1 mo. ago</span>
            </div>
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
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mx-auto mt-3 h-[26px] flex items-center justify-center rounded-md bg-transparent hover:bg-[#1b1726]/55 border border-[#252137] px-3 text-[11px] font-bold text-[#b9b2c7] transition"
      >
        {expanded ? "View less" : "View more"}
      </button>
      {up && <span className="sr-only">Positive live trend</span>}
    </section>
  );
}

function ActivityBar({ left, right, leftPct }: { left: string; right: string; leftPct: number }) {
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex justify-between text-[10.5px] font-semibold text-[#f3efff]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="flex h-1 overflow-hidden rounded-full bg-[#ff653d] w-full">
        <div className="bg-[#20d772]" style={{ width: `${leftPct}%` }} />
        <div className="w-[3px] bg-[#12111a]" />
        <div className="bg-[#ff653d] flex-grow" />
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
