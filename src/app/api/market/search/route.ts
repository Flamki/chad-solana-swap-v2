import { NextResponse } from "next/server";

import { apiError, birdeyeJson } from "@/lib/server/birdeye";
import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

export const revalidate = 0;

type BirdeyeSearchToken = {
  address: string;
  symbol?: string;
  name?: string;
  logoURI?: string;
  logo_uri?: string;
  decimals?: number;
  price?: number;
  liquidity?: number;
  fdv?: number;
  marketCap?: number;
  market_cap?: number;
  volume24hUSD?: number;
  v24hUSD?: number;
  volume_24h_usd?: number;
  priceChange24hPercent?: number;
  price_change_24h_percent?: number;
  holder?: number;
  holders?: number;
};

type BirdeyeSearchGroup = {
  type?: string;
  result?: BirdeyeSearchToken[];
};

type BirdeyeSearchResponse = {
  items?: Array<BirdeyeSearchGroup | BirdeyeSearchToken>;
  tokens?: BirdeyeSearchToken[];
};

function tokenFromSearch(item: BirdeyeSearchToken): Token {
  return mergeToken(createFallbackToken(item.address), {
    symbol: item.symbol,
    name: item.name,
    logo: item.logoURI ?? item.logo_uri,
    decimals: item.decimals,
    price: item.price,
    liquidity: item.liquidity,
    marketCap: item.marketCap ?? item.market_cap ?? item.fdv,
    volume24h: item.volume24hUSD ?? item.volume_24h_usd ?? item.v24hUSD,
    change24h: item.priceChange24hPercent ?? item.price_change_24h_percent,
    holders: item.holder ?? item.holders,
    source: "birdeye",
  });
}

function isSearchGroup(item: BirdeyeSearchGroup | BirdeyeSearchToken): item is BirdeyeSearchGroup {
  return Array.isArray((item as BirdeyeSearchGroup).result);
}

function searchItems(data: BirdeyeSearchResponse, query: string) {
  const normalized: BirdeyeSearchToken[] = [
    ...(data.items ?? []).flatMap((item) => (isSearchGroup(item) ? (item.result ?? []) : [item])),
    ...(data.tokens ?? []),
  ].filter((item) => item.address);

  const needle = query.toLowerCase();
  return normalized.filter((item) =>
    [item.address, item.symbol, item.name].some((value) => value?.toLowerCase().includes(needle)),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const data = await birdeyeJson<BirdeyeSearchResponse>(
      `/defi/v3/search?keyword=${encodeURIComponent(query)}&chain=solana&target=token&search_mode=fuzzy&sort_by=volume_24h_usd&sort_type=desc&offset=0&limit=8`,
    );

    const items = searchItems(data, query);
    return NextResponse.json(items.map(tokenFromSearch));
  } catch {
    try {
      const data = await birdeyeJson<{ tokens?: BirdeyeSearchToken[] }>(
        `/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=8&search=${encodeURIComponent(query)}`,
      );

      const items = searchItems(data, query);
      return NextResponse.json(items.map(tokenFromSearch));
    } catch (fallbackError) {
      return apiError(fallbackError);
    }
  }
}
