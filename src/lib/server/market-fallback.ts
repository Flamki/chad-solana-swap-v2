import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

const DEX_SCREENER_BASE = "https://api.dexscreener.com";
const GECKO_TERMINAL_BASE = "https://api.geckoterminal.com/api/v2";

type DexPair = {
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number | null;
  marketCap?: number | null;
  info?: { imageUrl?: string };
};

type GeckoTokenResponse = {
  data?: {
    attributes?: {
      name?: string;
      symbol?: string;
      decimals?: number;
      image_url?: string | null;
      price_usd?: string | null;
      fdv_usd?: string | null;
      total_reserve_in_usd?: string | null;
      volume_usd?: { h24?: string | null };
    };
  };
};

type GeckoOhlcvResponse = {
  data?: {
    attributes?: {
      ohlcv_list?: Array<[number, number, number, number, number, number]>;
    };
  };
};

const intervalConfig = {
  "1m": { timeframe: "minute", aggregate: 1, limit: 120 },
  "5m": { timeframe: "minute", aggregate: 5, limit: 120 },
  "15m": { timeframe: "minute", aggregate: 15, limit: 120 },
  "1H": { timeframe: "hour", aggregate: 1, limit: 168 },
  "4H": { timeframe: "hour", aggregate: 4, limit: 180 },
  "1D": { timeframe: "day", aggregate: 1, limit: 180 },
} as const;

export type FallbackInterval = keyof typeof intervalConfig;

async function fetchJson<T>(url: string, revalidate: number): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate },
    headers: { accept: "application/json;version=20230302" },
  });

  if (!response.ok) {
    throw new Error(`${url} failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function getDexPairs(mint: string) {
  return fetchJson<DexPair[]>(
    `${DEX_SCREENER_BASE}/tokens/v1/solana/${encodeURIComponent(mint)}`,
    20,
  );
}

function bestDexPair(pairs: DexPair[], mint: string) {
  return pairs
    .filter((pair) => pair.baseToken?.address === mint)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
}

export async function tokenFromFallbackProviders(mint: string): Promise<Token> {
  const [geckoResult, dexResult] = await Promise.allSettled([
    fetchJson<GeckoTokenResponse>(
      `${GECKO_TERMINAL_BASE}/networks/solana/tokens/${encodeURIComponent(mint)}`,
      20,
    ),
    getDexPairs(mint),
  ]);
  const attributes =
    geckoResult.status === "fulfilled" ? geckoResult.value.data?.attributes : undefined;
  const pair = dexResult.status === "fulfilled" ? bestDexPair(dexResult.value, mint) : undefined;

  if (!attributes && !pair) {
    throw new Error("No fallback market data available");
  }

  return mergeToken(createFallbackToken(mint), {
    symbol: attributes?.symbol ?? pair?.baseToken?.symbol,
    name: attributes?.name ?? pair?.baseToken?.name,
    logo: attributes?.image_url ?? pair?.info?.imageUrl,
    decimals: attributes?.decimals,
    price: numberValue(attributes?.price_usd) ?? numberValue(pair?.priceUsd),
    change24h: pair?.priceChange?.h24,
    volume24h: numberValue(attributes?.volume_usd?.h24) ?? pair?.volume?.h24,
    marketCap: numberValue(attributes?.fdv_usd) ?? pair?.marketCap ?? pair?.fdv ?? undefined,
    liquidity: numberValue(attributes?.total_reserve_in_usd) ?? pair?.liquidity?.usd,
    source: geckoResult.status === "fulfilled" ? "geckoterminal" : "dexscreener",
  });
}

export async function ohlcvFromFallbackProviders(mint: string, interval: FallbackInterval) {
  const pairs = await getDexPairs(mint);
  const pair = bestDexPair(pairs, mint);

  if (!pair?.pairAddress) {
    throw new Error("No liquid pool found for chart");
  }

  const config = intervalConfig[interval];
  const params = new URLSearchParams({
    aggregate: String(config.aggregate),
    limit: String(config.limit),
    currency: "usd",
  });
  const payload = await fetchJson<GeckoOhlcvResponse>(
    `${GECKO_TERMINAL_BASE}/networks/solana/pools/${encodeURIComponent(pair.pairAddress)}/ohlcv/${config.timeframe}?${params}`,
    20,
  );

  const data = (payload.data?.attributes?.ohlcv_list ?? [])
    .map(([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume,
      value: close,
    }))
    .filter((point) =>
      [point.time, point.open, point.high, point.low, point.close].every(Number.isFinite),
    )
    .sort((a, b) => a.time - b.time);

  if (!data.length) {
    throw new Error("No fallback chart candles available");
  }

  return {
    data,
    provider: "geckoterminal" as const,
    updatedAt: new Date().toISOString(),
  };
}

function numberValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
