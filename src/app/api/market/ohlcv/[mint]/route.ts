import { NextResponse } from "next/server";

import { birdeyeJsonWithMeta, ohlcvToPoints } from "@/lib/server/birdeye";

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

export async function GET(request: Request, context: { params: Promise<{ mint: string }> }) {
  const { mint } = await context.params;
  const interval = getInterval(request);

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

    return NextResponse.json({
      data: ohlcvToPoints(result.data.items ?? []),
      status: result.status,
      updatedAt: result.updatedAt,
      provider: "birdeye",
    });
  } catch {
    return NextResponse.json({
      data: [],
      status: "unavailable",
      updatedAt: new Date().toISOString(),
      provider: "birdeye",
    });
  }
}
