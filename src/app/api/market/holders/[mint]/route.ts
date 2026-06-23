import { NextResponse } from "next/server";

import { apiError, birdeyeJson, holdersFromBirdeye } from "@/lib/server/birdeye";

export const revalidate = 30;

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    const holderData = await birdeyeJson<{
      items?: Parameters<typeof holdersFromBirdeye>[0];
    }>(`/defi/v3/token/holder?address=${encodeURIComponent(mint)}&offset=0&limit=12`);

    return NextResponse.json(holdersFromBirdeye(holderData.items ?? []));
  } catch (error) {
    return apiError(error);
  }
}
