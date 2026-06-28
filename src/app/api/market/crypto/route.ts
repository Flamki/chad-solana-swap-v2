import { NextResponse } from "next/server";

import { apiError, birdeyeJson, tokenFromOverview } from "@/lib/server/birdeye";
import { getJupiterVerifiedTokens, searchJupiterTokens } from "@/lib/server/jupiter-tokens";
import { tokenFromFallbackProviders } from "@/lib/server/market-fallback";
import { CRYPTO_TOKEN_MINTS, createFallbackToken, type Token } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const CRYPTO_LIMIT = 80;

async function fetchLiveCryptoToken(mint: string): Promise<Token> {
  try {
    const jupiterTokens = await searchJupiterTokens(mint, 5);
    const exactToken = jupiterTokens.find((token) => token.mint === mint);
    if (exactToken && exactToken.price > 0) return exactToken;
  } catch {
    // Continue through the remaining providers.
  }

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
    let tokens = await getJupiterVerifiedTokens(CRYPTO_LIMIT);

    if (tokens.length < 20) {
      const results = await Promise.allSettled(CRYPTO_TOKEN_MINTS.map(fetchLiveCryptoToken));
      tokens = results
        .map((result, index) =>
          result.status === "fulfilled"
            ? result.value
            : createFallbackToken(CRYPTO_TOKEN_MINTS[index]),
        )
        .filter((token) => token.symbol && token.price > 0)
        .sort((a, b) => b.marketCap - a.marketCap);
    }

    return NextResponse.json(tokens, {
      headers: {
        "cache-control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
