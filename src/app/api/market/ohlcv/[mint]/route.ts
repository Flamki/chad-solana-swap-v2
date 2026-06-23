import { NextResponse } from "next/server";

import { birdeyeJson, ohlcvToPoints } from "@/lib/server/birdeye";
import { createFallbackToken, getToken } from "@/lib/tokens";

export const revalidate = 15;

const intervalWindows: Record<string, number> = {
  "1m": 2 * 60 * 60,
  "5m": 8 * 60 * 60,
  "15m": 24 * 60 * 60,
  "1H": 7 * 24 * 60 * 60,
  "4H": 30 * 24 * 60 * 60,
  "1D": 180 * 24 * 60 * 60,
};

function getInterval(request: Request) {
  const interval = new URL(request.url).searchParams.get("interval") ?? "15m";
  return interval in intervalWindows ? interval : "15m";
}

function fallbackOhlcv(mint: string, interval: string) {
  const token = getToken(mint) ?? createFallbackToken(mint);
  const points = 180;
  const now = Math.floor(Date.now() / 1000);
  const step = intervalWindows[interval] / points;
  const startPrice = Math.max(token.price || 0.000001, 0.000001) * (1 - token.change24h / 100);
  let close = startPrice;
  let seed = token.mint.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return Array.from({ length: points }, (_, index) => {
    seed = (seed * 9301 + 49297) % 233280;
    const random = seed / 233280 - 0.5;
    const drift = token.change24h / 100 / points;
    const open = close;
    close = Math.max(open * (1 + drift + random * 0.018), 0.000000001);
    const wick = Math.max(Math.abs(close - open), open * (0.006 + Math.abs(random) * 0.02));
    const high = Math.max(open, close) + wick;
    const low = Math.max(Math.min(open, close) - wick, 0.000000001);
    const volume = Math.max(token.volume24h / points, 1000) * (0.6 + Math.abs(random) * 1.8);

    return {
      time: Math.floor(now - (points - index) * step),
      open,
      high,
      low,
      close,
      volume,
      value: close,
    };
  });
}

export async function GET(request: Request, context: { params: Promise<{ mint: string }> }) {
  const { mint } = await context.params;
  const interval = getInterval(request);

  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - intervalWindows[interval];
    const data = await birdeyeJson<{
      items?: Parameters<typeof ohlcvToPoints>[0];
    }>(
      `/defi/ohlcv?address=${encodeURIComponent(mint)}&type=${interval}&currency=usd&time_from=${from}&time_to=${now}`,
    );

    return NextResponse.json(ohlcvToPoints(data.items ?? []));
  } catch {
    return NextResponse.json(fallbackOhlcv(mint, interval));
  }
}
