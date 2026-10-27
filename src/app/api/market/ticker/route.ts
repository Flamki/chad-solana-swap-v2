import { NextResponse } from "next/server";

import { getGeckoTrendingTokens } from "@/lib/server/market-fallback";

export const dynamic = "force-dynamic";

const TICKER_LIMIT = 36;

export async function GET() {
  try {
    const tokens = (await getGeckoTrendingTokens(TICKER_LIMIT)).filter(
      (token) =>
        Number.isFinite(token.price) &&
        token.price > 0 &&
        Number.isFinite(token.change24h) &&
        token.symbol.length > 0,
    );

    if (!tokens.length) {
      throw new Error("GeckoTerminal returned no priced ticker pools");
    }

    return NextResponse.json(
      {
        tokens,
        status: "live",
        updatedAt: new Date().toISOString(),
        provider: "GeckoTerminal",
      },
      {
        headers: {
          "cache-control": "public, s-maxage=15, stale-while-revalidate=45",
        },
      },
    );
  } catch (error) {
    console.error("GeckoTerminal ticker unavailable", error);
    return NextResponse.json(
      {
        tokens: [],
        status: "unavailable",
        updatedAt: new Date().toISOString(),
        provider: "GeckoTerminal",
      },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
