import { NextResponse } from "next/server";

import { birdeyeJson, tokenFromTrending } from "@/lib/server/birdeye";
import { TOKENS } from "@/lib/tokens";

export const revalidate = 15;
const TRENDING_LIMIT = 50;

export async function GET() {
  try {
    const data = await birdeyeJson<{
      tokens?: Parameters<typeof tokenFromTrending>[0][];
    }>(`/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${TRENDING_LIMIT}`);

    return NextResponse.json((data.tokens ?? []).map(tokenFromTrending));
  } catch {
    return NextResponse.json(TOKENS);
  }
}
