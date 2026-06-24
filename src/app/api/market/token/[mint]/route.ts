import { NextResponse } from "next/server";

import { apiError, birdeyeJson, tokenFromOverview } from "@/lib/server/birdeye";
import { tokenFromFallbackProviders } from "@/lib/server/market-fallback";

export const revalidate = 15;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    try {
      const overview = await birdeyeJson<Parameters<typeof tokenFromOverview>[1]>(
        `/defi/token_overview?address=${encodeURIComponent(mint)}`,
      );

      return NextResponse.json(tokenFromOverview(mint, overview));
    } catch {
      return NextResponse.json(await tokenFromFallbackProviders(mint));
    }
  } catch (error) {
    return apiError(error);
  }
}
