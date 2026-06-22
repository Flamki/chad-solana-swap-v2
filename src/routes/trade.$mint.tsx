import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import { TOKENS, getToken, formatUsd, formatCompact, generatePriceHistory, generateTrades, generateHolders } from "@/lib/tokens";
import { ChadLogo } from "@/components/chad-logo";
import { SignInButton } from "@/components/sign-in-button";
import { PriceChart } from "@/components/trade/price-chart";
import { SwapPanel } from "@/components/trade/swap-panel";

export const Route = createFileRoute("/trade/$mint")({
  head: ({ params }) => {
    const t = getToken(params.mint);
    const title = t ? `${t.symbol} · ${formatUsd(t.price)} — ChadWallet` : "Trade — ChadWallet";
    return {
      meta: [
        { title },
        { name: "description", content: t ? `Trade ${t.name} (${t.symbol}) on Solana with ChadWallet.` : "Trade Solana tokens on ChadWallet." },
      ],
    };
  },
  loader: ({ params }) => {
    const token = getToken(params.mint);
    if (!token) throw notFound();
    return { token };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Token not found</h1>
        <Link to="/" className="mt-3 inline-block text-primary underline">Back to home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Trading view crashed</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm">Retry</button>
      </div>
    </div>
  ),
  component: TradePage,
});

function TradePage() {
  const { token } = Route.useLoaderData();
  const history = useMemo(() => generatePriceHistory(token), [token]);
  const trades = useMemo(() => generateTrades(token), [token]);
  const holders = useMemo(() => generateHolders(token), [token]);
  const up = token.change24h >= 0;

  return (
    <div className="min-h-screen bg-cosmic flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <ChadLogo variant="dark" size="sm" />
          </div>
          <SignInButton />
        </div>
      </header>

      {/* 3-column trading layout */}
      <main className="grid lg:grid-cols-[260px_1fr_340px] gap-3 p-3">
        {/* LEFT — trending */}
        <aside className="rounded-2xl border border-border bg-card/40 overflow-hidden flex flex-col min-h-[400px] lg:min-h-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Trending</h2>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {TOKENS.map((t) => {
              const tUp = t.change24h >= 0;
              const active = t.mint === token.mint;
              return (
                <Link
                  key={t.mint}
                  to="/trade/$mint"
                  params={{ mint: t.mint }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60 transition-colors ${
                    active ? "bg-primary/10" : "hover:bg-background/60"
                  }`}
                >
                  <img
                    src={t.logo}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    className="h-8 w-8 rounded-full bg-muted"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{t.symbol}</div>
                      <div className={`font-mono text-xs ${tUp ? "text-primary" : "text-destructive"}`}>
                        {tUp ? "+" : ""}{t.change24h.toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground truncate">{t.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{formatUsd(t.price)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* MIDDLE — info + chart + tabs */}
        <section className="flex flex-col gap-3 min-w-0">
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={token.logo}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full bg-muted"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{token.name}</h1>
                  <span className="rounded-full bg-background border border-border px-2 py-0.5 text-xs font-mono">{token.symbol}</span>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(token.mint)}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
                >
                  {token.mint.slice(0, 6)}…{token.mint.slice(-4)}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-mono font-bold">{formatUsd(token.price)}</div>
                <div className={`text-sm font-mono ${up ? "text-primary" : "text-destructive"} flex items-center gap-1 justify-end`}>
                  {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {up ? "+" : ""}{token.change24h.toFixed(2)}% · 24h
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Market cap" value={`$${formatCompact(token.marketCap)}`} />
              <Stat label="24h volume" value={`$${formatCompact(token.volume24h)}`} />
              <Stat label="Holders" value={formatCompact(token.holders)} />
              <Stat label="Liquidity" value={`$${formatCompact(token.marketCap * 0.08)}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-3 h-[420px] overflow-hidden">
            <PriceChart data={history} />
          </div>

          <BottomTabs trades={trades} holders={holders} token={token} />
        </section>

        {/* RIGHT — swap */}
        <aside className="min-w-0">
          <SwapPanel token={token} />
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="mt-0.5 font-mono font-semibold">{value}</div>
    </div>
  );
}

function BottomTabs({
  trades, holders, token,
}: {
  trades: ReturnType<typeof generateTrades>;
  holders: ReturnType<typeof generateHolders>;
  token: ReturnType<typeof getToken> & object;
}) {
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="flex items-center border-b border-border">
        <TabBtn active={tab === "trades"} onClick={() => setTab("trades")} icon={<Activity className="h-3.5 w-3.5" />}>
          Live trades
        </TabBtn>
        <TabBtn active={tab === "holders"} onClick={() => setTab("holders")} icon={<Users className="h-3.5 w-3.5" />}>
          Top holders
        </TabBtn>
      </div>
      <div className="max-h-[260px] overflow-y-auto">
        {tab === "trades" ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground sticky top-0 bg-card/90 backdrop-blur">
              <tr><Th>Side</Th><Th>USD</Th><Th>{token!.symbol}</Th><Th>Price</Th><Th>Wallet</Th><Th>Age</Th></tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} className="border-t border-border/60">
                  <Td><span className={t.side === "buy" ? "text-primary font-semibold" : "text-destructive font-semibold"}>{t.side.toUpperCase()}</span></Td>
                  <Td mono>{formatUsd(t.amountUsd)}</Td>
                  <Td mono>{t.tokens.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                  <Td mono>{formatUsd(t.price)}</Td>
                  <Td mono className="text-muted-foreground">{t.wallet}</Td>
                  <Td mono className="text-muted-foreground">{t.ago}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground sticky top-0 bg-card/90 backdrop-blur">
              <tr><Th>#</Th><Th>Wallet</Th><Th>% supply</Th><Th>Value</Th><Th></Th></tr>
            </thead>
            <tbody>
              {holders.map(h => (
                <tr key={h.rank} className="border-t border-border/60">
                  <Td mono>{h.rank}</Td>
                  <Td mono>{h.wallet}</Td>
                  <Td mono>{h.pct.toFixed(2)}%</Td>
                  <Td mono>{formatUsd(h.valueUsd)}</Td>
                  <Td><ExternalLink className="h-3 w-3 text-muted-foreground" /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2">{children}</th>;
}
function Td({ children, mono, className = "" }: { children?: React.ReactNode; mono?: boolean; className?: string }) {
  return <td className={`px-3 py-2 ${mono ? "font-mono" : ""} ${className}`}>{children}</td>;
}