import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Loader2, ShieldCheck, Wallet, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { hasPrivy, hasSupabase } from "@/lib/env";
import { fetchJupiterQuote, recordTokenIntent, useTokenPosition } from "@/lib/market-data";
import type { Token } from "@/lib/tokens";
import { SOL_MINT, USDC_MINT, formatUsd, rawAmountFromUi } from "@/lib/tokens";

const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;
const SOL_PRICE = 184.32;

function formatTokenAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0.00";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 6 : 2,
  });
}

export function SwapPanel({ token }: { token: Token }) {
  if (hasPrivy) {
    return <PrivySwapPanel token={token} />;
  }

  return <SwapPanelCore token={token} />;
}

function PrivySwapPanel({ token }: { token: Token }) {
  const { authenticated } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  return (
    <SwapPanelCore
      token={token}
      authenticated={authenticated}
      walletAddress={walletAddress}
      onLogin={() => login()}
    />
  );
}

function SwapPanelCore({
  token,
  authenticated = false,
  walletAddress,
  onLogin,
}: {
  token: Token;
  authenticated?: boolean;
  walletAddress?: string;
  onLogin?: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(token.mint === SOL_MINT ? "25" : "0.5");
  const [slippage, setSlippage] = useState("1");
  const [isRecording, setIsRecording] = useState(false);

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
        inputPrice: tradingSol ? 1 : SOL_PRICE,
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
  }, [side, token]);

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
      : inputUsd / (pair.outputSymbol === "USDC" ? 1 : SOL_PRICE));
  const fee = inputUsd * 0.003;
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
      : quoteQuery.isFetching
        ? "Refreshing quote"
        : `Save ${side} quote`;

  const handlePrimary = async () => {
    if (!hasPrivy || !authenticated) {
      onLogin?.();
      return;
    }

    setIsRecording(true);
    try {
      await recordTokenIntent({
        wallet: walletAddress,
        mint: token.mint,
        symbol: token.symbol,
        side,
        amount,
      });
      alert(
        "Quote captured. Jupiter execution can be enabled after adding the production API key and transaction signer flow.",
      );
    } finally {
      setIsRecording(false);
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
            {walletAddress
              ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
              : "No wallet"}
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
        <Row label="Network fee est." value={formatUsd(fee)} />
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
        disabled={isRecording || quoteQuery.isFetching}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 font-semibold text-primary-foreground glow-green transition hover:opacity-90 disabled:opacity-60"
      >
        {isRecording || quoteQuery.isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {buttonLabel}
      </button>

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

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`truncate text-right font-mono ${good ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
