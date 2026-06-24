import { NextResponse } from "next/server";

import { birdeyeJsonWithMeta, tradesFromBirdeye } from "@/lib/server/birdeye";
import { tradesFromFallbackProviders } from "@/lib/server/market-fallback";

export const revalidate = 10;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    const result = await birdeyeJsonWithMeta<{
      items?: Parameters<typeof tradesFromBirdeye>[0];
    }>(`/defi/txs/token?address=${encodeURIComponent(mint)}&offset=0&limit=25&tx_type=swap`, {
      next: { revalidate: 15 },
    });

    return NextResponse.json({
      data: tradesFromBirdeye(result.data.items ?? [], mint),
      status: result.status,
      updatedAt: result.updatedAt,
      provider: "birdeye",
    });
  } catch (error) {
    console.error("BirdEye trades unavailable", error);
    try {
      const { mint } = await context.params;
      return NextResponse.json({
        data: await tradesFromFallbackProviders(mint),
        status: "live",
        updatedAt: new Date().toISOString(),
        provider: "geckoterminal",
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
}
