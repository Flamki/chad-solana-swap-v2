import { NextResponse } from "next/server";

import { birdeyeJsonWithMeta, ohlcvToPoints, tradesFromBirdeye } from "@/lib/server/birdeye";
import {
  getBestGeckoPool,
  ohlcvFromFallbackProviders,
  type FallbackInterval,
} from "@/lib/server/market-fallback";

export const revalidate = 15;

const intervalWindows: Record<string, number> = {
  "1m": 2 * 60 * 60,
  "5m": 8 * 60 * 60,
  "15m": 24 * 60 * 60,
  "1H": 7 * 24 * 60 * 60,
  "4H": 30 * 24 * 60 * 60,
  "1D": 180 * 24 * 60 * 60,
};

const intervalSeconds: Record<string, number> = {
  "1m": 60,
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1H": 60 * 60,
  "4H": 4 * 60 * 60,
  "1D": 24 * 60 * 60,
};

function getInterval(request: Request) {
  const interval = new URL(request.url).searchParams.get("interval") ?? "15m";
  return interval in intervalWindows ? interval : "15m";
}

export async function GET(request: Request, context: { params: Promise<{ mint: string }> }) {
  const { mint } = await context.params;
  const interval = getInterval(request);

  try {
    const fallback = await ohlcvFromFallbackProviders(mint, interval as FallbackInterval);
    if (fallback.data.length) {
      return NextResponse.json({
        ...fallback,
        status: "live",
      });
    }
  } catch {
    // BirdEye can still cover tokens before GeckoTerminal indexes their pool candles.
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - intervalWindows[interval];
    const result = await birdeyeJsonWithMeta<{
      items?: Parameters<typeof ohlcvToPoints>[0];
    }>(
      `/defi/ohlcv?address=${encodeURIComponent(mint)}&type=${interval}&currency=usd&time_from=${from}&time_to=${now}`,
      {
        cacheKey: `ohlcv:${mint}:${interval}`,
        next: { revalidate: 15 },
      },
    );

    const data = cleanCandles(ohlcvToPoints(result.data.items ?? []));
    if (data.length) {
      return NextResponse.json({
        data,
        status: result.status,
        updatedAt: result.updatedAt,
        provider: "birdeye",
      });
    }
  } catch {
    // Try live swap aggregation and the most liquid on-chain pool below.
  }

  try {
    const tradeCandles = await ohlcvFromBirdeyeTrades(mint, interval);
    if (tradeCandles.data.length) {
      return NextResponse.json({
        ...tradeCandles,
        data: cleanCandles(tradeCandles.data),
        provider: "birdeye",
      });
    }
  } catch {
    // No final trade-derived backup available.
  }

  const geckoPool = await getBestGeckoPool(mint).catch(() => undefined);

  return NextResponse.json({
    data: [],
    status: "unavailable",
    updatedAt: new Date().toISOString(),
    provider: "geckoterminal",
    geckoPoolAddress: geckoPool?.address,
    geckoTokenSide: geckoPool?.tokenSide,
    geckoPoolName: geckoPool?.meta?.name,
    geckoPoolDex: geckoPool?.meta?.dex,
  });
}

function cleanCandles<T extends { open: number; high: number; low: number; close: number }>(
  candles: T[],
) {
  return candles.filter((point) => {
    const values = [point.open, point.high, point.low, point.close];
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) return false;
    if (point.high < Math.max(point.open, point.close)) return false;
    if (point.low > Math.min(point.open, point.close)) return false;
    return Math.max(...values) / Math.min(...values) < 100;
  });
}

async function ohlcvFromBirdeyeTrades(mint: string, interval: string) {
  type BirdeyeTradeItem = Parameters<typeof tradesFromBirdeye>[0][number];

  const result = await birdeyeJsonWithMeta<{
    items?: BirdeyeTradeItem[];
  }>(`/defi/txs/token?address=${encodeURIComponent(mint)}&offset=0&limit=50&tx_type=swap`, {
    cacheKey: `ohlcv-trades:${mint}:${interval}`,
    next: { revalidate: 10 },
  });

  const bucketSize = intervalSeconds[interval] ?? intervalSeconds["15m"];
  const buckets = new Map<
    number,
    {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      value: number;
    }
  >();

  for (const item of result.data.items ?? []) {
    const timestamp = item.blockUnixTime;
    const leg =
      item.base?.address === mint
        ? item.base
        : item.quote?.address === mint
          ? item.quote
          : item.base;
    const price = item.tokenPrice ?? leg?.price ?? 0;
    const tokens = Math.abs(leg?.uiAmount ?? 0);

    if (!Number.isFinite(timestamp) || !Number.isFinite(price) || price <= 0) continue;

    const bucketTime = Math.floor(timestamp! / bucketSize) * bucketSize;
    const volume = tokens * price;
    const bucket = buckets.get(bucketTime);

    if (!bucket) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Number.isFinite(volume) ? volume : 0,
        value: price,
      });
      continue;
    }

    bucket.high = Math.max(bucket.high, price);
    bucket.low = Math.min(bucket.low, price);
    bucket.close = price;
    bucket.volume += Number.isFinite(volume) ? volume : 0;
    bucket.value = price;
  }

  return {
    data: [...buckets.values()].sort((a, b) => a.time - b.time),
    status: result.status,
    updatedAt: result.updatedAt,
  };
}
