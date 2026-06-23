import { NextResponse } from "next/server";

import { apiError, birdeyeJson, tokenFromTrending } from "@/lib/server/birdeye";

export const revalidate = 15;

export async function GET() {
  try {
    const data = await birdeyeJson<{
      tokens?: Parameters<typeof tokenFromTrending>[0][];
    }>("/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20");

    return NextResponse.json((data.tokens ?? []).map(tokenFromTrending));
  } catch (error) {
    return apiError(error);
  }
}
