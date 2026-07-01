"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useTrendingTokens } from "@/lib/market-data";
import { solanaTokenPath } from "@/lib/routes";
import { formatUsd, type Token } from "@/lib/tokens";

function TokenLogo({ token }: { token: Token }) {
  const [failed, setFailed] = useState(false);
  const label = token.symbol.slice(0, 2).toUpperCase();

  if (token.logo && !failed) {
    return (
      <img
        src={token.logo}
        alt=""
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/10"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-bold text-white/70 ring-1 ring-white/10">
      {label}
    </span>
  );
}

function TrendPill({ token, duplicate }: { token: Token; duplicate: number }) {
  const isUp = token.change24h >= 0;
  const changeLabel = `${isUp ? "+" : ""}${token.change24h.toFixed(
    Math.abs(token.change24h) >= 100 ? 0 : 2,
  )}%`;

  return (
    <Link
      key={`${token.mint}-${duplicate}`}
      href={solanaTokenPath(token.mint)}
      title={`${token.symbol} ${formatUsd(token.price)} ${changeLabel}`}
      className="group flex h-14 min-w-[230px] shrink-0 items-center gap-3 rounded-full bg-[#15141f]/92 px-3.5 pr-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_36px_rgba(0,0,0,0.36)] ring-1 ring-white/[0.08] transition hover:bg-[#1d1b2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <TokenLogo token={token} />
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold tracking-tight text-white/90">
        {token.symbol}
      </span>
      <span className="font-mono text-xs font-semibold text-white/42">
        {formatUsd(token.price)}
      </span>
      <span
        className={`font-mono text-xs font-bold ${isUp ? "text-emerald-400" : "text-orange-500"}`}
      >
        {changeLabel}
      </span>
    </Link>
  );
}

export function TrendingCoinTicker() {
  const trendingTokens = useTrendingTokens();
  const tokens = useMemo(
    () =>
      (trendingTokens.data ?? [])
        .filter((token) => Number.isFinite(token.price) && token.price > 0)
        .slice(0, 24),
    [trendingTokens.data],
  );

  if (!tokens.length) {
    return (
      <div className="landing-trending-strip px-6 py-7" aria-live="polite">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-center rounded-full bg-white/[0.035] px-5 text-center font-mono text-xs tracking-wide text-white/45 ring-1 ring-white/[0.06]">
          {trendingTokens.isError
            ? "Live trending coins are reconnecting..."
            : "Loading live trending coins..."}
        </div>
      </div>
    );
  }

  return (
    <div
      className="landing-trending-strip"
      aria-label="Live trending Solana coins"
      aria-busy={trendingTokens.isPending}
    >
      <div className="landing-trending-track">
        {[0, 1].map((duplicate) => (
          <div key={duplicate} className="landing-trending-set">
            {tokens.map((token) => (
              <TrendPill key={`${token.mint}-${duplicate}`} token={token} duplicate={duplicate} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
