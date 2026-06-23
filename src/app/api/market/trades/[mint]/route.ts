import { NextResponse } from "next/server";

import { apiError, birdeyeJson, tradesFromBirdeye } from "@/lib/server/birdeye";

export const revalidate = 10;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    const data = await birdeyeJson<{
      items?: Parameters<typeof tradesFromBirdeye>[0];
    }>(`/defi/txs/token?address=${encodeURIComponent(mint)}&offset=0&limit=25&tx_type=swap`);

    return NextResponse.json(tradesFromBirdeye(data.items ?? [], mint));
  } catch (error) {
    return apiError(error);
  }
}
