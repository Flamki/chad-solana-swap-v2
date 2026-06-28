import type { Metadata } from "next";

import { TradePage } from "@/components/trade-page";
import { birdeyeJsonWithMeta, tokenFromOverview } from "@/lib/server/birdeye";
import { tokenFromFallbackProviders } from "@/lib/server/market-fallback";

type TradeParams = {
  params: Promise<{ mint: string }>;
};

export async function generateMetadata({ params }: TradeParams): Promise<Metadata> {
  const { mint } = await params;
  let symbol = mint.length > 8 ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : mint;
  let name = `Solana token ${symbol}`;

  try {
    const token = await tokenFromFallbackProviders(mint);
    symbol = token.symbol;
    name = token.name;
  } catch {
    const overview = await birdeyeJsonWithMeta<Parameters<typeof tokenFromOverview>[1]>(
      `/defi/token_overview?address=${encodeURIComponent(mint)}`,
      { next: { revalidate: 30 } },
    ).catch(() => null);

    if (overview) {
      const token = tokenFromOverview(mint, overview.data);
      symbol = token.symbol;
      name = token.name;
    }
  }

  return {
    title: `${symbol} - ChadWallet`,
    description: `Trade ${name} (${symbol}) on Solana with ChadWallet.`,
  };
}

export default async function TradeRoute({ params }: TradeParams) {
  const { mint } = await params;
  return <TradePage mint={mint} />;
}
