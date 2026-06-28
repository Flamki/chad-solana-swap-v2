import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

const DEX_SCREENER_BASE = "https://api.dexscreener.com";
const GECKO_TERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const SOLANA_TOKEN_PREFIX = "solana_";
const STABLE_OR_NATIVE_MINTS = new Set([
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4AeYPg9gJYNvU2VwZy5n",
]);
const poolAddressCache = new Map<
  string,
  { address: string; tokenSide: "base" | "quote"; meta?: GeckoPoolMeta; expiresAt: number }
>();

type DexPair = {
  chainId?: string;
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

type GeckoPoolAttributes = {
  address?: string;
  name?: string;
  pool_created_at?: string | null;
  token_price_usd?: string | null;
  base_token_price_usd?: string | null;
  quote_token_price_usd?: string | null;
  fdv_usd?: string | null;
  market_cap_usd?: string | null;
  reserve_in_usd?: string | null;
  volume_usd?: { h24?: string | null; h6?: string | null; h1?: string | null };
  price_change_percentage?: { h24?: string | null; h6?: string | null; h1?: string | null };
  transactions?: {
    h24?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
  };
};

type GeckoPoolItem = {
  id?: string;
  type?: string;
  attributes?: GeckoPoolAttributes;
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
};

type GeckoPoolsResponse = {
  data?: GeckoPoolItem[];
  included?: GeckoPoolItem[];
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
      market_cap_usd?: string | null;
      total_reserve_in_usd?: string | null;
      volume_usd?: { h24?: string | null };
    };
    relationships?: {
      top_pools?: { data?: Array<{ id?: string; type?: string }> };
    };
  };
  included?: GeckoPoolItem[];
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

type GeckoPoolMeta = {
  name?: string;
  dex?: string;
  createdAt?: string;
  liquidity?: number;
  volume24h?: number;
  transactions24h?: number;
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

async function enrichTokensWithDexImages(tokens: Token[]) {
  const missingLogo = tokens.filter((token) => !token.logo).slice(0, 30);
  if (!missingLogo.length) return tokens;

  const pairsByMint = new Map<string, DexPair>();
  await Promise.all(
    missingLogo.map(async (token) => {
      try {
        const pair = bestDexPair(await getDexPairs(token.mint), token.mint);
        if (pair) pairsByMint.set(token.mint, pair);
      } catch {
        // Image enrichment is best effort only.
      }
    }),
  );

  return tokens.map((token) => {
    const pair = pairsByMint.get(token.mint);
    if (!pair) return token;
    const dexToken = tokenFromDexPair(pair, token.symbol);
    if (!dexToken) return token;

    return mergeToken(token, {
      logo: token.logo || dexToken.logo,
      symbol: token.symbol || dexToken.symbol,
      name: token.name || dexToken.name,
    });
  });
}

export async function getBestGeckoPool(
  mint: string,
): Promise<{ address: string; tokenSide: "base" | "quote"; meta?: GeckoPoolMeta } | undefined> {
  const cached = poolAddressCache.get(mint);
  if (cached && cached.expiresAt > Date.now()) {
    return { address: cached.address, tokenSide: cached.tokenSide, meta: cached.meta };
  }

  try {
    const payload = await fetchJson<GeckoPoolsResponse>(
      `${GECKO_TERMINAL_BASE}/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1&include=base_token,quote_token,dex`,
      20,
    );
    const pool = bestGeckoPoolForMint(payload.data ?? [], mint);

    if (pool?.item.attributes?.address) {
      const meta = geckoPoolMeta(pool.item);
      poolAddressCache.set(mint, {
        address: pool.item.attributes.address,
        tokenSide: pool.tokenSide,
        meta,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return { address: pool.item.attributes.address, tokenSide: pool.tokenSide, meta };
    }
  } catch {
    // Fall back to DexScreener pool discovery below.
  }

  const pairs = await getDexPairs(mint);
  const pair = bestDexPair(pairs, mint);
  const address = pair?.pairAddress;
  const tokenSide =
    pair?.baseToken?.address === mint
      ? "base"
      : pair?.quoteToken?.address === mint
        ? "quote"
        : null;
  if (address && tokenSide) {
    poolAddressCache.set(mint, {
      address,
      tokenSide,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }
  return address && tokenSide ? { address, tokenSide } : undefined;
}

export async function tokenFromFallbackProviders(mint: string): Promise<Token> {
  const [geckoResult, dexResult] = await Promise.allSettled([
    fetchJson<GeckoTokenResponse>(
      `${GECKO_TERMINAL_BASE}/networks/solana/tokens/${encodeURIComponent(mint)}?include=top_pools`,
      20,
    ),
    getDexPairs(mint),
  ]);
  const attributes =
    geckoResult.status === "fulfilled" ? geckoResult.value.data?.attributes : undefined;
  const topPool =
    geckoResult.status === "fulfilled"
      ? bestGeckoPoolForMint(geckoResult.value.included ?? [], mint)?.item
      : undefined;
  const pair = dexResult.status === "fulfilled" ? bestDexPair(dexResult.value, mint) : undefined;

  if (!attributes && !pair) {
    throw new Error("No fallback market data available");
  }

  return mergeToken(createFallbackToken(mint), {
    symbol: attributes?.symbol ?? pair?.baseToken?.symbol,
    name: attributes?.name ?? pair?.baseToken?.name,
    logo: attributes?.image_url ?? pair?.info?.imageUrl,
    decimals: attributes?.decimals,
    price:
      numberValue(attributes?.price_usd) ??
      geckoPoolTokenPrice(topPool, mint) ??
      numberValue(pair?.priceUsd),
    change24h:
      numberValue(topPool?.attributes?.price_change_percentage?.h24) ?? pair?.priceChange?.h24,
    volume24h:
      numberValue(attributes?.volume_usd?.h24) ?? poolVolume24h(topPool) ?? pair?.volume?.h24,
    marketCap:
      numberValue(attributes?.market_cap_usd) ??
      numberValue(attributes?.fdv_usd) ??
      numberValue(topPool?.attributes?.market_cap_usd) ??
      numberValue(topPool?.attributes?.fdv_usd) ??
      pair?.marketCap ??
      pair?.fdv ??
      undefined,
    liquidity:
      numberValue(attributes?.total_reserve_in_usd) ??
      poolLiquidity(topPool) ??
      pair?.liquidity?.usd,
    source: geckoResult.status === "fulfilled" ? "geckoterminal" : "dexscreener",
  });
}

export async function searchGeckoTerminalTokens(query: string, limit = 30): Promise<Token[]> {
  const payload = await fetchJson<GeckoPoolsResponse>(
    `${GECKO_TERMINAL_BASE}/search/pools?query=${encodeURIComponent(query)}&network=solana&page=1`,
    15,
  );

  return enrichTokensWithDexImages(
    uniqueTokens(
      (payload.data ?? [])
        .map((pool) => tokenFromGeckoPool(pool, query))
        .filter((token): token is Token => Boolean(token)),
    ).slice(0, limit),
  );
}

export async function searchDexScreenerTokens(query: string, limit = 30): Promise<Token[]> {
  const payload = await fetchJson<{ pairs?: DexPair[] }>(
    `${DEX_SCREENER_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
    15,
  );

  return uniqueTokens(
    (payload.pairs ?? [])
      .filter((pair) => pair.chainId === "solana")
      .filter((pair) => pair.baseToken?.address || pair.quoteToken?.address)
      .map((pair) => tokenFromDexPair(pair, query))
      .filter((token): token is Token => Boolean(token)),
  ).slice(0, limit);
}

export async function getGeckoTrendingTokens(limit = 50): Promise<Token[]> {
  const payload = await fetchJson<GeckoPoolsResponse>(
    `${GECKO_TERMINAL_BASE}/networks/solana/trending_pools?include=base_token,quote_token,dex&page=1`,
    20,
  );

  return enrichTokensWithDexImages(
    uniqueTokens(
      (payload.data ?? [])
        .map((pool) => tokenFromGeckoPool(pool))
        .filter((token): token is Token => Boolean(token))
        .map((pool, index) => {
          return { ...pool, rank: index + 1 };
        }),
    ).slice(0, limit),
  );
}

export async function ohlcvFromFallbackProviders(mint: string, interval: FallbackInterval) {
  const pool = await getBestGeckoPool(mint);

  if (!pool) {
    throw new Error("No liquid pool found for chart");
  }

  for (const candidate of ohlcvFallbackOrder[interval]) {
    try {
      const data = await fetchPoolOhlcv(pool.address, pool.tokenSide, candidate);
      if (!data.length) continue;

      return {
        data:
          candidate === interval
            ? data
            : aggregateCandles(data, interval).slice(-intervalConfig[interval].limit),
        provider: "geckoterminal" as const,
        geckoPoolAddress: pool.address,
        geckoTokenSide: pool.tokenSide,
        geckoPoolName: pool.meta?.name,
        geckoPoolDex: pool.meta?.dex,
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
      geckoPoolAddress: pool.address,
      geckoTokenSide: pool.tokenSide,
      geckoPoolName: pool.meta?.name,
      geckoPoolDex: pool.meta?.dex,
      updatedAt: new Date().toISOString(),
    };
  }

  throw new Error("No fallback chart candles available");
}

async function fetchPoolOhlcv(
  poolAddress: string,
  tokenSide: "base" | "quote",
  interval: FallbackInterval,
): Promise<CandlePoint[]> {
  const config = intervalConfig[interval];
  const params = new URLSearchParams({
    aggregate: String(config.aggregate),
    limit: String(config.limit),
    currency: "usd",
    token: tokenSide,
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
    .filter(isSaneCandle)
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
  const pool = await getBestGeckoPool(mint);

  if (!pool) {
    throw new Error("No liquid pool found for live trades");
  }

  const payload = await fetchJson<GeckoTradeResponse>(
    `${GECKO_TERMINAL_BASE}/networks/solana/pools/${encodeURIComponent(pool.address)}/trades`,
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

function bestGeckoPoolForMint(pools: GeckoPoolItem[], mint: string) {
  return pools
    .map((item) => {
      const tokenSide = geckoTokenSide(item, mint);
      return { item, tokenSide };
    })
    .filter(
      (
        entry,
      ): entry is {
        item: GeckoPoolItem;
        tokenSide: "base" | "quote";
      } => Boolean(entry.item.attributes?.address && entry.tokenSide),
    )
    .sort(
      (a, b) =>
        geckoPoolScore(b.item, mint, b.tokenSide) - geckoPoolScore(a.item, mint, a.tokenSide),
    )[0];
}

function geckoPoolScore(pool: GeckoPoolItem, mint: string, tokenSide: "base" | "quote") {
  return (
    geckoPairPriority(pool, mint, tokenSide) * 1_000_000_000_000 +
    poolLiquidity(pool) * 100 +
    poolVolume24h(pool)
  );
}

function geckoPairPriority(pool: GeckoPoolItem, mint: string, tokenSide: "base" | "quote") {
  const baseMint = geckoRelationMint(pool.relationships?.base_token?.data?.id);
  const quoteMint = geckoRelationMint(pool.relationships?.quote_token?.data?.id);
  const otherMint = tokenSide === "base" ? quoteMint : baseMint;

  if (!otherMint) return 0;
  if (mint === "So11111111111111111111111111111111111111112") {
    if (otherMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") return 3;
    if (otherMint === "Es9vMFrzaCERmJfrF4H2FYD4AeYPg9gJYNvU2VwZy5n") return 2;
    return STABLE_OR_NATIVE_MINTS.has(otherMint) ? 1 : 0;
  }

  if (otherMint === "So11111111111111111111111111111111111111112") return 3;
  if (otherMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") return 2;
  if (otherMint === "Es9vMFrzaCERmJfrF4H2FYD4AeYPg9gJYNvU2VwZy5n") return 1;
  return 0;
}

function geckoTokenSide(pool: GeckoPoolItem, mint: string): "base" | "quote" | undefined {
  const baseMint = geckoRelationMint(pool.relationships?.base_token?.data?.id);
  const quoteMint = geckoRelationMint(pool.relationships?.quote_token?.data?.id);
  if (baseMint === mint) return "base";
  if (quoteMint === mint) return "quote";
  return undefined;
}

function tokenFromGeckoPool(pool: GeckoPoolItem, query?: string): Token | null {
  const attributes = pool.attributes;
  if (!attributes?.address) return null;

  const baseMint = geckoRelationMint(pool.relationships?.base_token?.data?.id);
  const quoteMint = geckoRelationMint(pool.relationships?.quote_token?.data?.id);
  if (!baseMint && !quoteMint) return null;

  const queryNeedle = query?.toLowerCase();
  const [baseLabel, quoteLabel] = (attributes.name ?? "").split("/").map((part) => part.trim());
  const exactBase =
    queryNeedle &&
    [baseMint, baseLabel].some((value) => value?.toLowerCase().includes(queryNeedle));
  const exactQuote =
    queryNeedle &&
    [quoteMint, quoteLabel].some((value) => value?.toLowerCase().includes(queryNeedle));
  const side =
    exactBase || (!exactQuote && baseMint && !STABLE_OR_NATIVE_MINTS.has(baseMint))
      ? "base"
      : "quote";
  const mint = side === "base" ? baseMint : quoteMint;
  if (!mint) return null;

  const label = side === "base" ? baseLabel : quoteLabel;
  const price = geckoPoolSidePrice(pool, side);

  return mergeToken(createFallbackToken(mint), {
    symbol: label,
    name: attributes.name ?? (label ? `${label} token` : undefined),
    price,
    change24h: numberValue(attributes.price_change_percentage?.h24),
    volume24h: poolVolume24h(pool),
    marketCap: numberValue(attributes.market_cap_usd) ?? numberValue(attributes.fdv_usd),
    liquidity: poolLiquidity(pool),
    source: "geckoterminal",
    poolDex: pool.relationships?.dex?.data?.id,
    poolCreatedAt: attributes.pool_created_at ?? undefined,
  });
}

function tokenFromDexPair(pair: DexPair, query?: string): Token | null {
  const needle = query?.toLowerCase();
  const base = pair.baseToken;
  const quote = pair.quoteToken;
  const baseMatches =
    needle &&
    [base?.address, base?.name, base?.symbol].some((value) =>
      value?.toLowerCase().includes(needle),
    );
  const quoteMatches =
    needle &&
    [quote?.address, quote?.name, quote?.symbol].some((value) =>
      value?.toLowerCase().includes(needle),
    );
  const side = baseMatches || (!quoteMatches && base?.address) ? base : quote;
  const mint = side?.address;
  if (!mint) return null;

  return mergeToken(createFallbackToken(mint), {
    symbol: side.symbol,
    name: side.name,
    logo: pair.info?.imageUrl,
    price: numberValue(pair.priceUsd),
    change24h: pair.priceChange?.h24,
    volume24h: pair.volume?.h24,
    marketCap: pair.marketCap ?? pair.fdv ?? undefined,
    liquidity: pair.liquidity?.usd,
    source: "dexscreener",
  });
}

function geckoPoolTokenPrice(pool: GeckoPoolItem | undefined, mint: string) {
  if (!pool) return undefined;
  const side = geckoTokenSide(pool, mint);
  return side ? geckoPoolSidePrice(pool, side) : numberValue(pool.attributes?.token_price_usd);
}

function geckoPoolSidePrice(pool: GeckoPoolItem, side: "base" | "quote") {
  return numberValue(
    side === "base"
      ? pool.attributes?.base_token_price_usd
      : pool.attributes?.quote_token_price_usd,
  );
}

function geckoPoolMeta(pool: GeckoPoolItem): GeckoPoolMeta {
  const transactions = pool.attributes?.transactions?.h24;
  return {
    name: pool.attributes?.name,
    dex: pool.relationships?.dex?.data?.id,
    createdAt: pool.attributes?.pool_created_at ?? undefined,
    liquidity: poolLiquidity(pool),
    volume24h: poolVolume24h(pool),
    transactions24h: (transactions?.buys ?? 0) + (transactions?.sells ?? 0),
  };
}

function geckoRelationMint(id: string | undefined) {
  return id?.startsWith(SOLANA_TOKEN_PREFIX) ? id.slice(SOLANA_TOKEN_PREFIX.length) : undefined;
}

function poolVolume24h(pool: GeckoPoolItem | undefined) {
  return numberValue(pool?.attributes?.volume_usd?.h24) ?? 0;
}

function poolLiquidity(pool: GeckoPoolItem | undefined) {
  return numberValue(pool?.attributes?.reserve_in_usd) ?? 0;
}

function uniqueTokens(tokens: Token[]) {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    if (seen.has(token.mint)) return false;
    seen.add(token.mint);
    return true;
  });
}

function isSaneCandle(point: CandlePoint) {
  const values = [point.open, point.high, point.low, point.close];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return false;
  if (point.high < Math.max(point.open, point.close)) return false;
  if (point.low > Math.min(point.open, point.close)) return false;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  if (minValue <= 0) return false;

  return maxValue / minValue < 100;
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
