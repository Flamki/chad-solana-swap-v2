"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, Copy, ExternalLink, TrendingDown, TrendingUp, Users } from "lucide-react";

import { ChadLogo } from "@/components/chad-logo";
import { TokenSearch } from "@/components/token-search";
import { TradeAccount } from "@/components/trade-account";
import { PriceChart } from "@/components/trade/price-chart";
import { SwapPanel } from "@/components/trade/swap-panel";
import {
  type ChartInterval,
  useTokenHolders,
  useTokenMarket,
  useTokenOhlcv,
  useTokenTrades,
  useTrendingTokens,
} from "@/lib/market-data";
import {
  SOL_MINT,
  TOKENS,
  createFallbackToken,
  formatCompact,
  formatUsd,
  getToken,
  type Token,
} from "@/lib/tokens";

type TokenListMode = "trending" | "most-held";

const tokenListModes: Array<{ key: TokenListMode; label: string }> = [
  { key: "trending", label: "Trending" },
  { key: "most-held", label: "Most held" },
];

export function TradePage({ mint }: { mint: string }) {
  const initialToken = getToken(mint) ?? createFallbackToken(mint);
  const market = useTokenMarket(initialToken.mint, initialToken);
  const solMarket = useTokenMarket(
    SOL_MINT,
    initialToken.mint === SOL_MINT ? initialToken : undefined,
  );
  const { data: trending = TOKENS } = useTrendingTokens();
  const [chartInterval, setChartInterval] = useState<ChartInterval>("15m");
  const [tokenListMode, setTokenListMode] = useState<TokenListMode>("trending");
  const [copiedMint, setCopiedMint] = useState(false);
  const token = market.data ?? initialToken;
  const solPrice = solMarket.data?.price || (token.mint === SOL_MINT ? token.price : 0);
  const history = useTokenOhlcv(token.mint, chartInterval);
  const up = token.change24h >= 0;
  const sidebarTokens = useMemo(() => {
    const mergedTokens = uniqueTokens([...trending, ...TOKENS, token]);

    if (tokenListMode === "most-held") {
      return [...mergedTokens].sort((a, b) => {
        const holderDiff = (b.holders || 0) - (a.holders || 0);
        if (holderDiff !== 0) return holderDiff;
        return b.marketCap - a.marketCap;
      });
    }

    return trending;
  }, [token, tokenListMode, trending]);
  const tokenListSubtitle =
    tokenListMode === "most-held" ? "Largest holder bases" : "BirdEye live trending";

  async function handleCopyMint() {
    const copied = await copyText(token.mint);
    if (!copied) return;

    setCopiedMint(true);
    window.setTimeout(() => setCopiedMint(false), 1400);
  }

  return (
    <div className="flex min-h-screen flex-col bg-cosmic">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/60 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <ChadLogo variant="dark" size="sm" />
          </div>

          <div className="flex flex-1 justify-center px-4">
            <TokenSearch />
          </div>

          <div className="flex items-center gap-2">
            <TradeAccount solPrice={solPrice} />
          </div>
        </div>
      </header>

      <main className="trade-shell grid gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="trade-pane flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="shrink-0 border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Tokens</h2>
                <p className="text-[11px] text-muted-foreground">{tokenListSubtitle}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex gap-1 overflow-x-auto px-3 pb-3 terminal-scroll-x">
              {tokenListModes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={tokenListMode === item.key}
                  onClick={() => setTokenListMode(item.key)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    tokenListMode === item.key
                      ? "border-primary/30 bg-primary/15 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {sidebarTokens.map((item) => (
              <TrendingToken key={item.mint} token={item} active={item.mint === token.mint} />
            ))}
          </div>
        </aside>

        <section className="trade-pane terminal-scroll trade-center-pane flex min-w-0 flex-col gap-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <div className="shrink-0 rounded-2xl border border-border bg-card/40 p-4">
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
                  type="button"
                  onClick={handleCopyMint}
                  title="Copy token address"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-xs font-mono text-muted-foreground transition hover:border-border hover:bg-background/50 hover:text-foreground"
                >
                  {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                  <Copy className="h-3 w-3" />
                  {copiedMint && <span className="text-primary">Copied</span>}
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
              <Stat
                label="Holders"
                value={token.holders > 0 ? formatCompact(token.holders) : "-"}
              />
              <Stat
                label="Liquidity"
                value={`$${formatCompact(token.liquidity ?? token.marketCap * 0.08)}`}
              />
            </div>
          </div>

          <div className="trade-chart-card h-[360px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card/40 p-3 xl:h-[400px] 2xl:h-[460px]">
            {history.data?.data.length ? (
              <PriceChart
                data={history.data.data}
                dataStatus={history.data.status}
                provider={history.data.provider}
                updatedAt={history.data.updatedAt}
                token={token}
                solPrice={solPrice}
                interval={chartInterval}
                onIntervalChange={setChartInterval}
              />
            ) : (
              <LiveState
                title={
                  history.isFetching
                    ? "Loading BirdEye chart"
                    : history.data?.status === "unavailable"
                      ? "BirdEye temporarily unavailable"
                      : "BirdEye chart unavailable"
                }
                detail={
                  history.isFetching
                    ? "Pulling live OHLCV candles for this token."
                    : "No synthetic candles are shown. The chart will retry the live feed automatically."
                }
              />
            )}
          </div>

          <MarketActivity token={token} />
        </section>

        <aside className="trade-pane terminal-scroll min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <SwapPanel token={token} solPrice={solPrice} />
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
  const logo = sanitizeImageUrl(token.logo);

  if (!logo) {
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
      src={logo}
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

function sanitizeImageUrl(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return "";

  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes("https//") || parsed.hostname.includes("http")) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function uniqueTokens(tokens: Token[]) {
  const byMint = new Map<string, Token>();
  for (const token of tokens) {
    if (!byMint.has(token.mint)) byMint.set(token.mint, token);
  }

  return [...byMint.values()];
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback for browsers that block clipboard writes.
  }

  try {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(input);
    return copied;
  } catch {
    return false;
  }
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

function MarketActivity({ token }: { token: Token }) {
  const trades = useTokenTrades(token.mint, true);
  const holders = useTokenHolders(token.mint, true);

  return (
    <div className="shrink-0 rounded-2xl border border-border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Market activity</h2>
          <p className="text-[11px] text-muted-foreground">
            Live swaps and holder concentration for this token
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Trades"
            status={trades.data?.status}
            provider={trades.data?.provider}
          />
          <FreshnessPill
            icon={<Users className="h-3.5 w-3.5" />}
            label="Holders"
            status={holders.data?.status}
            provider={holders.data?.provider}
          />
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-2">
        <ActivityTable
          title="Live trades"
          subtitle="Recent swaps"
          updatedAt={trades.data?.updatedAt}
          provider={trades.data?.provider}
          status={trades.data?.status}
        >
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
              {trades.data?.data.length ? (
                trades.data.data.slice(0, 18).map((trade, index) => (
                  <tr key={`${trade.id}-${index}`} className="border-t border-border/60">
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
                      {trade.txHash ? (
                        <a
                          href={`https://solscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {trade.wallet}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        trade.wallet
                      )}
                    </Td>
                    <Td mono className="text-muted-foreground">
                      {trade.ago}
                    </Td>
                  </tr>
                ))
              ) : (
                <TableState
                  colSpan={6}
                  title={trades.isFetching ? "Loading BirdEye trades" : "Live trades unavailable"}
                  detail={
                    trades.isFetching
                      ? "Fetching recent token swaps from BirdEye."
                      : "BirdEye did not return recent swaps for this request."
                  }
                />
              )}
            </tbody>
          </table>
        </ActivityTable>

        <ActivityTable
          title="Top holders"
          subtitle="Largest token accounts"
          updatedAt={holders.data?.updatedAt}
          provider={holders.data?.provider}
          status={holders.data?.status}
          className="border-t border-border xl:border-l xl:border-t-0"
        >
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
              {holders.data?.data.length ? (
                holders.data.data.slice(0, 18).map((holder) => (
                  <tr key={holder.rank} className="border-t border-border/60">
                    <Td mono>{holder.rank}</Td>
                    <Td mono>{holder.wallet}</Td>
                    <Td mono>{holder.pct > 0 ? `${holder.pct.toFixed(2)}%` : "-"}</Td>
                    <Td mono>
                      {holder.valueUsd > 0
                        ? formatUsd(holder.valueUsd)
                        : `${(holder.tokens ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} ${token.symbol}`}
                    </Td>
                    <Td>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Td>
                  </tr>
                ))
              ) : (
                <TableState
                  colSpan={5}
                  title={holders.isFetching ? "Loading BirdEye holders" : "Top holders unavailable"}
                  detail={
                    holders.isFetching
                      ? "Fetching top token holders from BirdEye."
                      : "BirdEye did not return holder data for this request."
                  }
                />
              )}
            </tbody>
          </table>
        </ActivityTable>
      </div>
    </div>
  );
}

function ActivityTable({
  title,
  subtitle,
  updatedAt,
  provider,
  status,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt?: string;
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
  status?: "live" | "cached" | "unavailable";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <DataFreshness status={status} updatedAt={updatedAt} provider={provider} compact />
      </div>
      <div className="terminal-scroll max-h-[300px] overflow-y-auto">{children}</div>
    </section>
  );
}

function FreshnessPill({
  icon,
  label,
  status,
  provider,
}: {
  icon: React.ReactNode;
  label: string;
  status?: "live" | "cached" | "unavailable";
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
}) {
  const live = status === "live";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        live
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background/50 text-muted-foreground"
      }`}
    >
      {icon}
      {label}
      <span className="font-mono">
        {provider === "solana-rpc"
          ? "RPC"
          : provider === "geckoterminal"
            ? "GT"
            : provider === "birdeye"
              ? "BE"
              : "WAIT"}
      </span>
    </span>
  );
}

function DataFreshness({
  status,
  updatedAt,
  provider,
  compact = false,
}: {
  status?: "live" | "cached" | "unavailable";
  updatedAt?: string;
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
  compact?: boolean;
}) {
  if (!status) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground ${
        compact ? "text-right" : "border-t border-border/60 px-3 py-2"
      }`}
    >
      <span className={status === "live" ? "text-primary" : ""}>
        {provider === "solana-rpc"
          ? "Solana RPC"
          : provider === "geckoterminal"
            ? "GeckoTerminal"
            : "BirdEye"}{" "}
        {status.toUpperCase()}
      </span>
      {updatedAt && <span>Updated {new Date(updatedAt).toLocaleTimeString()}</span>}
    </div>
  );
}

function LiveState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid h-full min-h-[300px] place-items-center text-center">
      <div>
        <div className="font-mono text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-2 max-w-sm text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function TableState({
  colSpan,
  title,
  detail,
}: {
  colSpan: number;
  title: string;
  detail: string;
}) {
  return (
    <tr className="border-t border-border/60">
      <td colSpan={colSpan} className="px-3 py-8 text-center">
        <div className="font-mono text-xs font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </td>
    </tr>
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
