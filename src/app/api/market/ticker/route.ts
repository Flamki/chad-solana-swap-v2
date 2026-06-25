import { NextResponse } from "next/server";

import { birdeyeJsonWithMeta, tokenFromTrending } from "@/lib/server/birdeye";
import { TOKENS, type Token } from "@/lib/tokens";

export const dynamic = "force-dynamic";

type TrendingToken = Parameters<typeof tokenFromTrending>[0];

type JupiterPrice = {
  usdPrice?: number;
  priceChange24h?: number;
};

type JupiterPrices = Record<string, JupiterPrice>;

let birdeyeRetryAfter = 0;

function getJupiterKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

async function getJupiterPrices(mints: string[]) {
  const key = getJupiterKey();
  const base = key ? "https://api.jup.ag" : "https://lite-api.jup.ag";
  const response = await fetch(`${base}/price/v3?ids=${mints.join(",")}`, {
    cache: "no-store",
    headers: key ? { "x-api-key": key } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Jupiter ticker prices failed (${response.status})`);
  }

  return (await response.json()) as JupiterPrices;
}

export async function GET() {
  try {
    let ranked = TOKENS;
    let birdeyeStatus: "live" | "cached" | null = null;

    if (Date.now() >= birdeyeRetryAfter) {
      try {
        const trending = await birdeyeJsonWithMeta<{ tokens?: TrendingToken[] }>(
          "/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20",
          { cacheKey: "landing-ticker", next: { revalidate: 15 } },
        );
        const birdeyeTokens = (trending.data.tokens ?? []).map(tokenFromTrending);

        if (birdeyeTokens.length) {
          ranked = birdeyeTokens;
          birdeyeStatus = trending.status;
        }
      } catch (error) {
        birdeyeRetryAfter = Date.now() + 5 * 60 * 1000;
        console.error("BirdEye ticker ranking unavailable", error);
      }
    }

    let prices: JupiterPrices = {};
    let jupiterAvailable = false;

    try {
      prices = await getJupiterPrices(ranked.map((token) => token.mint));
      jupiterAvailable = true;
    } catch (error) {
      console.error("Jupiter ticker enrichment unavailable", error);
    }

    const tokens = ranked
      .map((token): Token => {
        const live = prices[token.mint];
        return {
          ...token,
          price: live?.usdPrice ?? token.price,
          change24h: live?.priceChange24h ?? token.change24h,
          source: live ? "jupiter" : token.source,
        };
      })
      .filter(
        (token) =>
          Number.isFinite(token.price) &&
          token.price > 0 &&
          Number.isFinite(token.change24h) &&
          token.symbol.length > 0,
      )
      .slice(0, 14);

    if (!tokens.length) {
      throw new Error("Live providers returned no priced tokens");
    }

    const provider = birdeyeStatus
      ? jupiterAvailable
        ? "BirdEye + Jupiter"
        : "BirdEye"
      : "Jupiter";

    return NextResponse.json(
      {
        tokens,
        status: birdeyeStatus === "cached" && !jupiterAvailable ? "cached" : "live",
        updatedAt: new Date().toISOString(),
        provider,
      },
      {
        headers: {
          "cache-control": "public, s-maxage=15, stale-while-revalidate=45",
        },
      },
    );
  } catch (error) {
    console.error("Landing ticker unavailable", error);
    return NextResponse.json(
      {
        tokens: [],
        status: "unavailable",
        updatedAt: new Date().toISOString(),
        provider: "Jupiter",
      },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
