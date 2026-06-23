"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Copy,
  ExternalLink,
  RadioTower,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { ChadLogo } from "@/components/chad-logo";
import { SignInButton } from "@/components/sign-in-button";
import { PriceChart } from "@/components/trade/price-chart";
import { SwapPanel } from "@/components/trade/swap-panel";
import { useSolanaRpcHealth, useTokenMarket, useTrendingTokens } from "@/lib/market-data";
import {
  TOKENS,
  createFallbackToken,
  formatCompact,
  formatUsd,
  generateHolders,
  generatePriceHistory,
  generateTrades,
  getToken,
  type Token,
} from "@/lib/tokens";

export function TradePage({ mint }: { mint: string }) {
  const initialToken = getToken(mint) ?? createFallbackToken(mint);
  const market = useTokenMarket(initialToken.mint, initialToken);
  const { data: trending = TOKENS } = useTrendingTokens();
  const rpcHealth = useSolanaRpcHealth();
  const token = market.data ?? initialToken;
  const history = useMemo(() => generatePriceHistory(token), [token]);
  const trades = useMemo(() => generateTrades(token), [token]);
  const holders = useMemo(() => generateHolders(token), [token]);
  const up = token.change24h >= 0;

  return (
    <div className="flex min-h-screen flex-col bg-cosmic">
      <header className="sticky top-0 z-30 border-b border-border bg-background/60 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <ChadLogo variant="dark" size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <RadioTower
                className={`h-3.5 w-3.5 ${rpcHealth.isSuccess ? "text-primary" : "text-muted-foreground"}`}
              />
              {rpcHealth.isSuccess
                ? `${rpcHealth.data.endpoint} slot ${formatCompact(rpcHealth.data.slot)}`
                : "Solana RPC"}
            </div>
            <SignInButton />
          </div>
        </div>
      </header>

      <main className="grid gap-3 p-3 lg:grid-cols-[280px_1fr_360px]">
        <aside className="flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card/40 lg:min-h-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Trending</h2>
              <p className="text-[11px] text-muted-foreground">
                {trending[0]?.source === "birdeye" ? "BirdEye live feed" : "Curated Solana feed"}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {trending.map((item) => (
              <TrendingToken key={item.mint} token={item} active={item.mint === token.mint} />
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <TokenImage token={token} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{token.name}</h1>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-mono">
                    {token.symbol}
                  </span>
                  {token.source && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase text-primary">
                      {token.source}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(token.mint)}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground"
                >
                  {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-mono font-bold">{formatUsd(token.price)}</div>
                <div
                  className={`flex items-center justify-end gap-1 text-sm font-mono ${up ? "text-primary" : "text-destructive"}`}
                >
                  {up ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {up ? "+" : ""}
                  {token.change24h.toFixed(2)}% 24h
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat label="Market cap" value={`$${formatCompact(token.marketCap)}`} />
              <Stat label="24h volume" value={`$${formatCompact(token.volume24h)}`} />
              <Stat label="Holders" value={formatCompact(token.holders)} />
              <Stat
                label="Liquidity"
                value={`$${formatCompact(token.liquidity ?? token.marketCap * 0.08)}`}
              />
            </div>
          </div>

          <div className="h-[420px] overflow-hidden rounded-2xl border border-border bg-card/40 p-3">
            <PriceChart data={history} />
          </div>

          <BottomTabs trades={trades} holders={holders} token={token} />
        </section>

        <aside className="min-w-0">
          <SwapPanel token={token} />
        </aside>
      </main>
    </div>
  );
}

function TrendingToken({ token, active }: { token: Token; active: boolean }) {
  const up = token.change24h >= 0;

  return (
    <Link
      href={`/trade/${token.mint}`}
      className={`flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5 transition-colors ${
        active ? "bg-primary/10" : "hover:bg-background/60"
      }`}
    >
      <TokenImage token={token} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-sm font-semibold">{token.symbol}</div>
          <div className={`font-mono text-xs ${up ? "text-primary" : "text-destructive"}`}>
            {up ? "+" : ""}
            {token.change24h.toFixed(1)}%
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-[11px] text-muted-foreground">{token.name}</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {formatUsd(token.price)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TokenImage({ token, size = "sm" }: { token: Token; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-12 w-12" : "h-8 w-8";

  if (!token.logo) {
    return (
      <div
        className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary`}
      >
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={token.logo}
      alt=""
      width={size === "lg" ? 48 : 32}
      height={size === "lg" ? 48 : 32}
      loading="lazy"
      className={`${sizeClass} shrink-0 rounded-full bg-muted object-cover`}
      onError={(event) => {
        (event.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono font-semibold">{value}</div>
    </div>
  );
}

function BottomTabs({
  trades,
  holders,
  token,
}: {
  trades: ReturnType<typeof generateTrades>;
  holders: ReturnType<typeof generateHolders>;
  token: Token;
}) {
  const [tab, setTab] = useState<"trades" | "holders">("trades");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex items-center border-b border-border">
        <TabBtn
          active={tab === "trades"}
          onClick={() => setTab("trades")}
          icon={<Activity className="h-3.5 w-3.5" />}
        >
          Live trades
        </TabBtn>
        <TabBtn
          active={tab === "holders"}
          onClick={() => setTab("holders")}
          icon={<Users className="h-3.5 w-3.5" />}
        >
          Top holders
        </TabBtn>
      </div>
      <div className="max-h-[260px] overflow-y-auto">
        {tab === "trades" ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/90 text-xs text-muted-foreground backdrop-blur">
              <tr>
                <Th>Side</Th>
                <Th>USD</Th>
                <Th>{token.symbol}</Th>
                <Th>Price</Th>
                <Th>Wallet</Th>
                <Th>Age</Th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-t border-border/60">
                  <Td>
                    <span
                      className={
                        trade.side === "buy"
                          ? "font-semibold text-primary"
                          : "font-semibold text-destructive"
                      }
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </Td>
                  <Td mono>{formatUsd(trade.amountUsd)}</Td>
                  <Td mono>
                    {trade.tokens.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Td>
                  <Td mono>{formatUsd(trade.price)}</Td>
                  <Td mono className="text-muted-foreground">
                    {trade.wallet}
                  </Td>
                  <Td mono className="text-muted-foreground">
                    {trade.ago}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/90 text-xs text-muted-foreground backdrop-blur">
              <tr>
                <Th>#</Th>
                <Th>Wallet</Th>
                <Th>% supply</Th>
                <Th>Value</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {holders.map((holder) => (
                <tr key={holder.rank} className="border-t border-border/60">
                  <Td mono>{holder.rank}</Td>
                  <Td mono>{holder.wallet}</Td>
                  <Td mono>{holder.pct.toFixed(2)}%</Td>
                  <Td mono>{formatUsd(holder.valueUsd)}</Td>
                  <Td>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({
  children,
  mono,
  className = "",
}: {
  children?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${mono ? "font-mono" : ""} ${className}`}>{children}</td>;
}
