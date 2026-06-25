"use client";

import Link from "next/link";
import { useState } from "react";

import { useMarketTicker } from "@/lib/market-data";
import { formatUsd } from "@/lib/tokens";

export function MarketTicker({
  compact = false,
  reverse = false,
}: {
  compact?: boolean;
  reverse?: boolean;
}) {
  const [interactionPaused, setInteractionPaused] = useState(false);
  const marketTicker = useMarketTicker();
  const tickerTokens = marketTicker.data?.tokens ?? [];
  const items =
    compact && tickerTokens.length > 1
      ? [
          ...tickerTokens.slice(Math.ceil(tickerTokens.length / 2)),
          ...tickerTokens.slice(0, Math.ceil(tickerTokens.length / 2)),
        ]
      : tickerTokens;

  if (!items.length) {
    return (
      <div
        className={`flex min-h-[66px] items-center justify-center border-y border-white/5 bg-black px-5 text-center font-mono text-xs tracking-wide text-white/45 ${compact ? "py-4" : "py-5"}`}
        aria-live="polite"
      >
        {marketTicker.isError
          ? "Live Solana market data is reconnecting..."
          : "Loading live Solana markets..."}
      </div>
    );
  }

  return (
    <div
      className={`group/ticker relative overflow-hidden border-y border-white/5 bg-black ${compact ? "py-4" : "py-5"}`}
      aria-label="Live Solana token prices"
      aria-busy={marketTicker.isPending}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteractionPaused(false);
        }
      }}
    >
      <div
        className={`flex whitespace-nowrap will-change-transform ${compact ? "gap-8 animate-[scroll_40s_linear_infinite]" : "gap-4 animate-[scroll_35s_linear_infinite]"} ${reverse ? "[animation-direction:reverse]" : ""}`}
        style={{ animationPlayState: interactionPaused ? "paused" : "running" }}
      >
        {[...Array(2)].map((_, duplicate) => (
          <div key={duplicate} className={`flex shrink-0 ${compact ? "gap-8" : "gap-4"}`}>
            {items.map((token) => (
              <Link
                key={`${token.mint}-${duplicate}`}
                href={`/trade/${token.mint}`}
                title={`${token.symbol} live price from ${token.source === "jupiter" ? "Jupiter" : "BirdEye"}${marketTicker.data?.updatedAt ? `, updated ${new Date(marketTicker.data.updatedAt).toLocaleTimeString()}` : ""}`}
                onPointerDown={() => setInteractionPaused(true)}
                onPointerCancel={() => setInteractionPaused(false)}
                className={`relative z-10 flex cursor-pointer touch-manipulation items-center rounded-full ring-1 ring-white/10 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${compact ? "gap-3 bg-white/[0.02] px-5 py-1.5" : "gap-3 bg-white/[0.04] px-4 py-2.5"}`}
              >
                {!compact && token.logo && (
                  <img
                    src={token.logo}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full bg-white/5 object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span className="text-sm font-bold tracking-wide text-white/90">
                  {token.symbol}
                </span>
                <span className="font-mono text-sm text-white/50">{formatUsd(token.price)}</span>
                <span
                  className={`font-mono text-sm ${token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {token.change24h >= 0 ? "+" : ""}
                  {token.change24h.toFixed(2)}%
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
