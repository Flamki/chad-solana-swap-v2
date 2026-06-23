import type { Metadata } from "next";

import { TradePage } from "@/components/trade-page";
import { createFallbackToken, formatUsd, getToken } from "@/lib/tokens";

type TradeParams = {
  params: Promise<{ mint: string }>;
};

export async function generateMetadata({ params }: TradeParams): Promise<Metadata> {
  const { mint } = await params;
  const token = getToken(mint) ?? createFallbackToken(mint);

  return {
    title: `${token.symbol} ${formatUsd(token.price)} - ChadWallet`,
    description: `Trade ${token.name} (${token.symbol}) on Solana with ChadWallet.`,
  };
}

export default async function TradeRoute({ params }: TradeParams) {
  const { mint } = await params;
  return <TradePage mint={mint} />;
}
