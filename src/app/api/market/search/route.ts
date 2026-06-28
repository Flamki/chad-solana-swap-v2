import { NextResponse } from "next/server";

import { birdeyeJson, tokenFromOverview } from "@/lib/server/birdeye";
import {
  searchDexScreenerTokens,
  searchGeckoTerminalTokens,
  tokenFromFallbackProviders,
} from "@/lib/server/market-fallback";
import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

export const revalidate = 0;

const SEARCH_LIMIT = 30;

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
  const exactMatches = normalized.filter((item) =>
    [item.address, item.symbol, item.name].some((value) => value?.toLowerCase().includes(needle)),
  );

  // BirdEye's fuzzy search can return legitimate symbols that do not contain the raw query.
  // Prefer exact-looking matches when available, otherwise trust BirdEye's ranking.
  return exactMatches.length ? exactMatches : normalized;
}

function looksLikeMint(query: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);
}

function uniqueTokens(tokens: Token[]) {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    if (seen.has(token.mint)) return false;
    seen.add(token.mint);
    return true;
  });
}

function normalizedSearchText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/^\$+/, "").trim();
}

function searchScore(token: Token, query: string) {
  const rawNeedle = query.toLowerCase().trim();
  const rawSymbol = (token.symbol ?? "").toLowerCase().trim();
  const rawName = (token.name ?? "").toLowerCase().trim();
  const needle = normalizedSearchText(query);
  const symbol = normalizedSearchText(token.symbol);
  const name = normalizedSearchText(token.name);
  const mint = token.mint.toLowerCase();
  const liquidity = token.liquidity ?? 0;
  const volume = token.volume24h ?? 0;
  let score = Math.log10(Math.max(liquidity, volume, 1));

  if (rawSymbol === rawNeedle) score += 1_500;
  if (rawName === rawNeedle) score += 750;

  if (symbol === needle) score += 1_000;
  else if (symbol.startsWith(needle)) score += 500;
  else if (symbol.includes(needle)) score += 250;

  if (name === needle) score += 350;
  else if (name.startsWith(needle)) score += 180;
  else if (name.includes(needle)) score += 80;

  if (mint === query.toLowerCase()) score += 2_000;

  return score;
}

function rankedTokens(tokens: Token[], query: string) {
  return uniqueTokens(tokens).sort((a, b) => searchScore(b, query) - searchScore(a, query));
}

async function directMintSearch(query: string) {
  if (!looksLikeMint(query)) return null;

  try {
    return await tokenFromFallbackProviders(query);
  } catch {
    // Fall through to BirdEye below.
  }

  try {
    const overview = await birdeyeJson<Parameters<typeof tokenFromOverview>[1]>(
      `/defi/token_overview?address=${encodeURIComponent(query)}`,
    );
    return tokenFromOverview(query, overview);
  } catch {
    return null;
  }
}

async function birdeyeSearch(query: string) {
  try {
    const data = await birdeyeJson<BirdeyeSearchResponse>(
      `/defi/v3/search?keyword=${encodeURIComponent(query)}&chain=solana&target=token&search_mode=fuzzy&sort_by=volume_24h_usd&sort_type=desc&offset=0&limit=${SEARCH_LIMIT}`,
    );

    return searchItems(data, query).map(tokenFromSearch);
  } catch {
    try {
      const data = await birdeyeJson<{ tokens?: BirdeyeSearchToken[] }>(
        `/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=${SEARCH_LIMIT}&search=${encodeURIComponent(query)}`,
      );

      return searchItems(data, query).map(tokenFromSearch);
    } catch {
      return [];
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const directToken = await directMintSearch(query);
  const [geckoTokens, dexTokens] = await Promise.all([
    searchGeckoTerminalTokens(query, SEARCH_LIMIT).catch(() => []),
    searchDexScreenerTokens(query, SEARCH_LIMIT).catch(() => []),
  ]);

  try {
    const live = await birdeyeSearch(query);
    return NextResponse.json(
      rankedTokens(
        [directToken, ...geckoTokens, ...dexTokens, ...live].filter(Boolean) as Token[],
        query,
      ).slice(0, SEARCH_LIMIT),
    );
  } catch {
    return NextResponse.json(
      rankedTokens(
        [directToken, ...geckoTokens, ...dexTokens].filter(Boolean) as Token[],
        query,
      ).slice(0, SEARCH_LIMIT),
    );
  }
}
