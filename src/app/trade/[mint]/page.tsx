import type { Metadata } from "next";

import { TradePage } from "@/components/trade-page";
import { birdeyeJsonWithMeta, tokenFromOverview } from "@/lib/server/birdeye";
import { createFallbackToken, formatUsd, getToken } from "@/lib/tokens";

type TradeParams = {
  params: Promise<{ mint: string }>;
};

export async function generateMetadata({ params }: TradeParams): Promise<Metadata> {
  const { mint } = await params;
  const fallback = getToken(mint) ?? createFallbackToken(mint);
  let token = fallback;

  try {
    const overview = await birdeyeJsonWithMeta<Parameters<typeof tokenFromOverview>[1]>(
      `/defi/token_overview?address=${encodeURIComponent(mint)}`,
      { next: { revalidate: 30 } },
    );
    token = tokenFromOverview(mint, overview.data);
  } catch {
    // Metadata should remain available when the market provider is throttled.
  }

  return {
    title: `${token.symbol} ${formatUsd(token.price)} - ChadWallet`,
    description: `Trade ${token.name} (${token.symbol}) on Solana with ChadWallet.`,
  };
}

export default async function TradeRoute({ params }: TradeParams) {
  const { mint } = await params;
  return <TradePage mint={mint} />;
}
