import { NextResponse } from "next/server";

import { SOL_MINT, TOKENS, createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

const BIRDEYE_BASE = "https://public-api.birdeye.so";

type BirdeyeTokenOverview = {
  address?: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  liquidity?: number;
  price?: number;
  marketCap?: number;
  fdv?: number;
  holder?: number;
  holders?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  priceChange24hPercent?: number;
  v24hUSD?: number;
  volume24hUSD?: number;
};

type BirdeyeTrendingToken = {
  address: string;
  decimals?: number;
  fdv?: number;
  liquidity?: number;
  logoURI?: string;
  marketcap?: number;
  marketCap?: number;
  name?: string;
  price?: number;
  rank?: number;
  symbol?: string;
  volume24hUSD?: number;
  price24hChangePercent?: number;
};

type BirdeyeOhlcvItem = {
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
  volume?: number;
  unixTime?: number;
};

type BirdeyeHolderItem = {
  owner?: string;
  ui_amount?: number;
  uiAmount?: number;
};

type BirdeyeTxItem = {
  txHash?: string;
  side?: "buy" | "sell";
  owner?: string;
  source?: string;
  blockUnixTime?: number;
  tokenPrice?: number;
  base?: { address?: string; uiAmount?: number; price?: number };
  quote?: { address?: string; uiAmount?: number; price?: number };
};

type NextFetchInit = RequestInit & {
  cacheKey?: string;
  next?: {
    revalidate?: number;
  };
};

type BirdeyeCacheEntry = {
  data: unknown;
  updatedAt: string;
  expiresAt: number;
};

export type BirdeyeResult<T> = {
  data: T;
  status: "live" | "cached";
  updatedAt: string;
};

const birdeyeCache = new Map<string, BirdeyeCacheEntry>();
const pendingRequests = new Map<string, Promise<BirdeyeResult<unknown>>>();

class MarketDataError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MarketDataError";
    this.status = status;
  }
}

function getBirdeyeKey() {
  return process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || "";
}

export async function birdeyeJson<T>(path: string, init?: NextFetchInit): Promise<T> {
  const result = await birdeyeJsonWithMeta<T>(path, init);
  return result.data;
}

export async function birdeyeJsonWithMeta<T>(
  path: string,
  init?: NextFetchInit,
): Promise<BirdeyeResult<T>> {
  const key = getBirdeyeKey();

  if (!key) {
    throw new MarketDataError("Missing BirdEye API key", 500);
  }

  const cacheKey = init?.cacheKey ?? path;
  const cached = birdeyeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      data: cached.data as T,
      status: "cached",
      updatedAt: cached.updatedAt,
    };
  }

  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending as Promise<BirdeyeResult<T>>;
  }

  const request = (async () => {
    const fetchInit = { ...init };
    delete fetchInit.cacheKey;
    const response = await fetch(`${BIRDEYE_BASE}${path}`, {
      ...fetchInit,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-chain": "solana",
        "X-API-KEY": key,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      if (cached) {
        return {
          data: cached.data,
          status: "cached" as const,
          updatedAt: cached.updatedAt,
        };
      }

      throw new MarketDataError(`BirdEye ${path} failed (${response.status})`, response.status);
    }

    const payload = (await response.json()) as { data?: T; success?: boolean };
    const data = (payload.data ?? payload) as T;
    const updatedAt = new Date().toISOString();
    const ttlSeconds = Math.max(10, init?.next?.revalidate ?? 15);

    birdeyeCache.set(cacheKey, {
      data,
      updatedAt,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return { data, status: "live" as const, updatedAt };
  })();

  pendingRequests.set(cacheKey, request as Promise<BirdeyeResult<unknown>>);

  try {
    return (await request) as BirdeyeResult<T>;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export function tokenFromOverview(mint: string, overview: BirdeyeTokenOverview): Token {
  const base = TOKENS.find((token) => token.mint === mint) ?? createFallbackToken(mint);

  return mergeToken(base, {
    decimals: overview.decimals,
    symbol: overview.symbol,
    name: mint === SOL_MINT ? "Solana" : overview.name,
    logo: overview.logoURI,
    liquidity: overview.liquidity,
    price: overview.price,
    marketCap: overview.marketCap ?? overview.fdv,
    volume24h: overview.v24hUSD ?? overview.volume24hUSD,
    holders: overview.holder ?? overview.holders,
    change24h: overview.priceChange24hPercent,
    source: "birdeye",
  });
}

export function tokenFromTrending(token: BirdeyeTrendingToken): Token {
  return mergeToken(createFallbackToken(token.address), {
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
    logo: token.logoURI,
    liquidity: token.liquidity,
    price: token.price,
    marketCap: token.marketcap ?? token.marketCap ?? token.fdv,
    volume24h: token.volume24hUSD,
    change24h: token.price24hChangePercent,
    rank: token.rank,
    source: "birdeye",
  });
}

export function ohlcvToPoints(items: BirdeyeOhlcvItem[]) {
  return items
    .filter((item) => Number.isFinite(item.unixTime) && Number.isFinite(item.c))
    .map((item) => ({
      time: item.unixTime!,
      open: item.o ?? item.c!,
      high: item.h ?? item.c!,
      low: item.l ?? item.c!,
      close: item.c!,
      volume: item.v ?? item.volume ?? 0,
      value: item.c!,
    }))
    .sort((a, b) => a.time - b.time);
}

export function holdersFromBirdeye(items: BirdeyeHolderItem[], overview?: BirdeyeTokenOverview) {
  const price = overview?.price ?? 0;
  const supply = overview?.circulatingSupply || overview?.totalSupply || 0;

  return items.map((item, index) => {
    const tokens = item.ui_amount ?? item.uiAmount ?? 0;
    const pct = supply > 0 ? (tokens / supply) * 100 : 0;

    return {
      rank: index + 1,
      wallet: item.owner ? `${item.owner.slice(0, 4)}...${item.owner.slice(-4)}` : "unknown",
      pct,
      valueUsd: tokens * price,
      tokens,
    };
  });
}

export function tradesFromBirdeye(items: BirdeyeTxItem[], mint: string) {
  const now = Math.floor(Date.now() / 1000);

  return items.map((item, index) => {
    const leg =
      item.base?.address === mint
        ? item.base
        : item.quote?.address === mint
          ? item.quote
          : item.base;
    const tokens = Math.abs(leg?.uiAmount ?? 0);
    const price = item.tokenPrice ?? leg?.price ?? 0;
    const age = item.blockUnixTime ? Math.max(1, now - item.blockUnixTime) : index + 1;

    return {
      id: item.txHash ?? `${mint}-${index}`,
      txHash: item.txHash,
      side: item.side === "sell" ? "sell" : "buy",
      amountUsd: tokens * price,
      tokens,
      price,
      wallet: item.owner ? `${item.owner.slice(0, 4)}...${item.owner.slice(-4)}` : "unknown",
      ago: formatAge(age),
      timestamp: item.blockUnixTime ? item.blockUnixTime * 1000 : undefined,
      source: item.source,
    };
  });
}

export function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Market data request failed";
  const status = error instanceof MarketDataError ? error.status : 502;
  return NextResponse.json({ error: message }, { status });
}
