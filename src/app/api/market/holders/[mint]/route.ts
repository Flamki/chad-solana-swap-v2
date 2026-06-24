import { NextResponse } from "next/server";

import { birdeyeJsonWithMeta, holdersFromBirdeye, tokenFromOverview } from "@/lib/server/birdeye";
import { tokenFromFallbackProviders } from "@/lib/server/market-fallback";
import { holdersFromSolanaRpc } from "@/lib/server/solana-holders";

export const revalidate = 30;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  const { mint } = await context.params;

  try {
    const holderResult = await birdeyeJsonWithMeta<{
      items?: Parameters<typeof holdersFromBirdeye>[0];
    }>(`/defi/v3/token/holder?address=${encodeURIComponent(mint)}&offset=0&limit=12`, {
      next: { revalidate: 60 },
    });

    let overview: Parameters<typeof tokenFromOverview>[1] | undefined;
    let overviewStatus: "live" | "cached" | undefined;
    let overviewUpdatedAt: string | undefined;

    try {
      const overviewResult = await birdeyeJsonWithMeta<Parameters<typeof tokenFromOverview>[1]>(
        `/defi/token_overview?address=${encodeURIComponent(mint)}`,
        { next: { revalidate: 30 } },
      );
      overview = overviewResult.data;
      overviewStatus = overviewResult.status;
      overviewUpdatedAt = overviewResult.updatedAt;
    } catch {
      // Holder balances are still useful when the overview endpoint is throttled.
    }

    return NextResponse.json({
      data: holdersFromBirdeye(holderResult.data.items ?? [], overview),
      status: holderResult.status === "cached" || overviewStatus === "cached" ? "cached" : "live",
      updatedAt:
        overviewUpdatedAt && overviewUpdatedAt < holderResult.updatedAt
          ? overviewUpdatedAt
          : holderResult.updatedAt,
      provider: "birdeye",
    });
  } catch (error) {
    console.error("BirdEye holders unavailable", error);
    try {
      let price = 0;
      try {
        price = (await tokenFromFallbackProviders(mint)).price;
      } catch {
        // Holder concentration remains valid without a USD valuation.
      }

      return NextResponse.json({
        data: await holdersFromSolanaRpc(mint, price),
        status: "live",
        updatedAt: new Date().toISOString(),
        provider: "solana-rpc",
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
