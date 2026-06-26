import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

const DEX_SCREENER_BASE = "https://api.dexscreener.com";
const GECKO_TERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const poolAddressCache = new Map<string, { address: string; expiresAt: number }>();

type DexPair = {
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number | null;
  marketCap?: number | null;
  info?: { imageUrl?: string };
};

type GeckoPoolsResponse = {
  data?: Array<{
    attributes?: {
      address?: string;
      reserve_in_usd?: string | null;
      volume_usd?: { h24?: string | null };
    };
  }>;
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

type GeckoTradeResponse = {
  data?: Array<{
    id?: string;
    attributes?: {
      tx_hash?: string;
      tx_from_address?: string;
      from_token_amount?: string;
      to_token_amount?: string;
      price_from_in_usd?: string;
      price_to_in_usd?: string;
      block_timestamp?: string;
      kind?: string;
      volume_in_usd?: string;
      from_token_address?: string;
      to_token_address?: string;
    };
  }>;
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

type CandlePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
};

type RawTrade = {
  id: string;
  txHash?: string;
  side: "buy" | "sell";
  amountUsd: number;
  tokens: number;
  price: number;
  wallet: string;
  timestamp: number;
};

const intervalSeconds: Record<FallbackInterval, number> = {
  "1m": 60,
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1H": 60 * 60,
  "4H": 4 * 60 * 60,
  "1D": 24 * 60 * 60,
};

const ohlcvFallbackOrder: Record<FallbackInterval, FallbackInterval[]> = {
  "1m": ["1m"],
  "5m": ["5m", "1m"],
  "15m": ["15m", "5m", "1m"],
  "1H": ["1H", "15m", "5m", "1m"],
  "4H": ["4H", "1H", "15m", "5m"],
  "1D": ["1D", "4H", "1H"],
};

async function fetchJson<T>(url: string, revalidate: number): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      next: { revalidate },
      headers: { accept: "application/json;version=20230302" },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 429 && attempt === 0) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) =>
        setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : 750),
      );
      continue;
    }

    throw new Error(`${url} failed (${response.status})`);
  }

  throw new Error(`${url} failed`);
}

async function getDexPairs(mint: string) {
  return fetchJson<DexPair[]>(
    `${DEX_SCREENER_BASE}/tokens/v1/solana/${encodeURIComponent(mint)}`,
    20,
  );
}

function bestDexPair(pairs: DexPair[], mint: string) {
  return pairs
    .filter((pair) => pair.baseToken?.address === mint || pair.quoteToken?.address === mint)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
}

async function getBestPoolAddress(mint: string) {
  const cached = poolAddressCache.get(mint);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.address;
  }

  try {
    const payload = await fetchJson<GeckoPoolsResponse>(
      `${GECKO_TERMINAL_BASE}/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`,
      20,
    );
    const pool = (payload.data ?? [])
      .filter((item) => item.attributes?.address)
      .sort((a, b) => {
        const reserveDiff =
          (numberValue(b.attributes?.reserve_in_usd) ?? 0) -
          (numberValue(a.attributes?.reserve_in_usd) ?? 0);
        if (reserveDiff !== 0) return reserveDiff;
        return (
          (numberValue(b.attributes?.volume_usd?.h24) ?? 0) -
          (numberValue(a.attributes?.volume_usd?.h24) ?? 0)
        );
      })[0];

    if (pool?.attributes?.address) {
      poolAddressCache.set(mint, {
        address: pool.attributes.address,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return pool.attributes.address;
    }
  } catch {
    // Fall back to DexScreener pool discovery below.
  }

  const pairs = await getDexPairs(mint);
  const address = bestDexPair(pairs, mint)?.pairAddress;
  if (address) {
    poolAddressCache.set(mint, {
      address,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }
  return address;
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
  const poolAddress = await getBestPoolAddress(mint);

  if (!poolAddress) {
    throw new Error("No liquid pool found for chart");
  }

  for (const candidate of ohlcvFallbackOrder[interval]) {
    try {
      const data = await fetchPoolOhlcv(poolAddress, candidate);
      if (!data.length) continue;

      return {
        data:
          candidate === interval
            ? data
            : aggregateCandles(data, interval).slice(-intervalConfig[interval].limit),
        provider: "geckoterminal" as const,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // Keep walking down to fresher/smaller live buckets.
    }
  }

  const tradeCandles = aggregateTrades(await rawTradesFromFallbackProviders(mint), interval);
  if (tradeCandles.length) {
    return {
      data: tradeCandles,
      provider: "geckoterminal" as const,
      updatedAt: new Date().toISOString(),
    };
  }

  throw new Error("No fallback chart candles available");
}

async function fetchPoolOhlcv(
  poolAddress: string,
  interval: FallbackInterval,
): Promise<CandlePoint[]> {
  const config = intervalConfig[interval];
  const params = new URLSearchParams({
    aggregate: String(config.aggregate),
    limit: String(config.limit),
    currency: "usd",
  });
  const payload = await fetchJson<GeckoOhlcvResponse>(
    `${GECKO_TERMINAL_BASE}/networks/solana/pools/${encodeURIComponent(poolAddress)}/ohlcv/${config.timeframe}?${params}`,
    20,
  );

  return (payload.data?.attributes?.ohlcv_list ?? [])
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
}

export async function tradesFromFallbackProviders(mint: string) {
  const trades = await rawTradesFromFallbackProviders(mint);
  const now = Date.now();

  if (!trades.length) {
    throw new Error("No fallback pool trades available");
  }

  return trades.map((trade) => {
    const ageSeconds = Math.max(1, Math.floor((now - trade.timestamp) / 1000));

    return {
      id: trade.id,
      txHash: trade.txHash,
      side: trade.side,
      amountUsd: trade.amountUsd,
      tokens: trade.tokens,
      price: trade.price,
      wallet: trade.wallet,
      ago: formatAge(ageSeconds),
      source: "GeckoTerminal",
    };
  });
}

async function rawTradesFromFallbackProviders(mint: string): Promise<RawTrade[]> {
  const poolAddress = await getBestPoolAddress(mint);

  if (!poolAddress) {
    throw new Error("No liquid pool found for live trades");
  }

  const payload = await fetchJson<GeckoTradeResponse>(
    `${GECKO_TERMINAL_BASE}/networks/solana/pools/${encodeURIComponent(poolAddress)}/trades`,
    10,
  );
  const now = Date.now();

  return (payload.data ?? [])
    .map((trade, index): RawTrade | null => {
      const attributes = trade.attributes;
      if (!attributes) return null;

      const tokenWasSold = attributes.from_token_address === mint;
      const tokenWasBought = attributes.to_token_address === mint;
      if (!tokenWasSold && !tokenWasBought) return null;

      const tokens = Number(
        tokenWasSold ? attributes.from_token_amount : attributes.to_token_amount,
      );
      const price = Number(
        tokenWasSold ? attributes.price_from_in_usd : attributes.price_to_in_usd,
      );
      const amountUsd = Number(attributes.volume_in_usd);
      const timestamp = attributes.block_timestamp
        ? new Date(attributes.block_timestamp).getTime()
        : now;
      const wallet = attributes.tx_from_address;

      return {
        id: trade.id ?? attributes.tx_hash ?? `${mint}-${index}`,
        txHash: attributes.tx_hash,
        side: tokenWasSold ? ("sell" as const) : ("buy" as const),
        amountUsd: Number.isFinite(amountUsd) ? amountUsd : tokens * price,
        tokens: Number.isFinite(tokens) ? tokens : 0,
        price: Number.isFinite(price) ? price : 0,
        wallet: wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "unknown",
        timestamp,
      };
    })
    .filter((trade): trade is RawTrade =>
      Boolean(trade && Number.isFinite(trade.price) && trade.price > 0),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function aggregateCandles(data: CandlePoint[], interval: FallbackInterval) {
  const bucketSize = intervalSeconds[interval];
  const buckets = new Map<number, CandlePoint>();

  for (const point of data) {
    const bucketTime = Math.floor(point.time / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketTime);

    if (!bucket) {
      buckets.set(bucketTime, { ...point, time: bucketTime, value: point.close });
      continue;
    }

    bucket.high = Math.max(bucket.high, point.high);
    bucket.low = Math.min(bucket.low, point.low);
    bucket.close = point.close;
    bucket.volume += point.volume;
    bucket.value = point.close;
  }

  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

function aggregateTrades(trades: RawTrade[], interval: FallbackInterval) {
  const bucketSize = intervalSeconds[interval];
  const buckets = new Map<number, CandlePoint>();

  for (const trade of trades) {
    const time = Math.floor(trade.timestamp / 1000);
    const bucketTime = Math.floor(time / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketTime);

    if (!bucket) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.amountUsd,
        value: trade.price,
      });
      continue;
    }

    bucket.high = Math.max(bucket.high, trade.price);
    bucket.low = Math.min(bucket.low, trade.price);
    bucket.close = trade.price;
    bucket.volume += trade.amountUsd;
    bucket.value = trade.price;
  }

  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function numberValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
