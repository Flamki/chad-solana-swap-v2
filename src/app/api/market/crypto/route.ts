import { NextResponse } from "next/server";

import { apiError, birdeyeJson, tokenFromOverview } from "@/lib/server/birdeye";
import { tokenFromFallbackProviders } from "@/lib/server/market-fallback";
import { CRYPTO_TOKEN_MINTS, createFallbackToken, type Token } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const revalidate = 30;

async function fetchLiveCryptoToken(mint: string): Promise<Token> {
  try {
    const overview = await birdeyeJson<Parameters<typeof tokenFromOverview>[1]>(
      `/defi/token_overview?address=${encodeURIComponent(mint)}`,
      { next: { revalidate: 30 } },
    );

    return tokenFromOverview(mint, overview);
  } catch {
    try {
      return await tokenFromFallbackProviders(mint);
    } catch {
      return createFallbackToken(mint);
    }
  }
}

export async function GET() {
  try {
    const results = await Promise.allSettled(CRYPTO_TOKEN_MINTS.map(fetchLiveCryptoToken));
    const tokens = results
      .map((result, index) =>
        result.status === "fulfilled"
          ? result.value
          : createFallbackToken(CRYPTO_TOKEN_MINTS[index]),
      )
      .filter((token) => token.symbol && Number.isFinite(token.price))
      .sort((a, b) => b.marketCap - a.marketCap);

    return NextResponse.json(tokens, {
      headers: {
        "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
