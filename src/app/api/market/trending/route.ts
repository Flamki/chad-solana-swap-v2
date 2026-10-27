import { NextResponse } from "next/server";

import { getGeckoTrendingTokens } from "@/lib/server/market-fallback";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const TRENDING_LIMIT = 50;

export async function GET() {
  try {
    const tokens = await getGeckoTrendingTokens(TRENDING_LIMIT);
    if (!tokens.length) throw new Error("GeckoTerminal returned no trending pools");

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("GeckoTerminal trending unavailable", error);
    return NextResponse.json([], {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
