import { NextResponse } from "next/server";

import { apiError, birdeyeJson, ohlcvToPoints } from "@/lib/server/birdeye";

export const revalidate = 15;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 60 * 60;
    const data = await birdeyeJson<{
      items?: Parameters<typeof ohlcvToPoints>[0];
    }>(`/defi/ohlcv?address=${encodeURIComponent(mint)}&type=15m&time_from=${from}&time_to=${now}`);

    return NextResponse.json(ohlcvToPoints(data.items ?? []));
  } catch (error) {
    return apiError(error);
  }
}
