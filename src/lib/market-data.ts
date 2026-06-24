import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { env, hasBirdeye, hasJupiterKey, hasRpcEndpoint, hasSupabase } from "@/lib/env";
import { SOL_MINT, TOKENS, type Token, createFallbackToken, mergeToken } from "@/lib/tokens";

const BIRDEYE_TRENDING_URL =
  "https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20";

type BirdeyeTrendingResponse = {
  success: boolean;
  data?: {
    updateUnixTime?: number;
    tokens?: Array<{
      address: string;
      decimals?: number;
      liquidity?: number;
      logoURI?: string;
      name?: string;
      rank?: number;
      symbol?: string;
      volume24hUSD?: number;
    }>;
  };
};

type JupiterPriceResponse = Record<
  string,
  {
    usdPrice?: number;
    decimals?: number;
    priceChange24h?: number;
    blockId?: number;
  }
>;

export type JupiterQuote = {
  outAmount: string;
  outUiAmount: number;
  inputUsd?: number;
  outputUsd?: number;
  priceImpactPct: number;
  route: string;
  router: string;
  responseMs?: number;
  source: "jupiter-v2" | "jupiter-lite";
};

export type ChartInterval = "1m" | "5m" | "15m" | "1H" | "4H" | "1D";

export type PricePoint = {
  time: number;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

export type MarketDataStatus = "live" | "cached" | "unavailable";

export type MarketDataset<T> = {
  data: T;
  status: MarketDataStatus;
  updatedAt: string;
  provider: "birdeye";
};

export type LiveTrade = {
  id: string;
  txHash?: string;
  side: "buy" | "sell";
  amountUsd: number;
  tokens: number;
  price: number;
  wallet: string;
  ago: string;
  source?: string;
};

export type LiveHolder = {
  rank: number;
  wallet: string;
  pct: number;
  valueUsd: number;
  tokens?: number;
};

export type TokenPosition = {
  balance: number;
  valueUsd: number;
  source: string;
};

async function fetchLocalJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function fetchJupiterPrices(mints: string[], signal?: AbortSignal) {
  const ids = Array.from(new Set(mints)).filter(Boolean).slice(0, 50);
  if (!ids.length) return {};

  const base = hasJupiterKey ? "https://api.jup.ag" : "https://lite-api.jup.ag";
  const response = await fetch(`${base}/price/v3?ids=${ids.join(",")}`, {
    signal,
    headers: hasJupiterKey ? { "x-api-key": env.jupiterApiKey! } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Jupiter price request failed (${response.status})`);
  }

  return (await response.json()) as JupiterPriceResponse;
}

export async function fetchTrendingTokens(signal?: AbortSignal): Promise<Token[]> {
  try {
    return await fetchLocalJson<Token[]>("/api/market/trending", signal);
  } catch {
    // Fall through to the direct public endpoint/fallback path for local demos.
  }

  if (!hasBirdeye) {
    return enrichTokensWithJupiter(TOKENS, signal);
  }

  const response = await fetch(BIRDEYE_TRENDING_URL, {
    signal,
    headers: {
      accept: "application/json",
      "x-chain": "solana",
      "X-API-KEY": env.birdeyeApiKey!,
    },
  });

  if (!response.ok) {
    throw new Error(`Birdeye trending request failed (${response.status})`);
  }

  const payload = (await response.json()) as BirdeyeTrendingResponse;
  const birdeyeTokens =
    payload.data?.tokens?.map((token) =>
      mergeToken(createFallbackToken(token.address), {
        decimals: token.decimals,
        holders: 0,
        liquidity: token.liquidity ?? 0,
        logo: token.logoURI,
        marketCap: token.liquidity ? token.liquidity * 12 : 0,
        name: token.name,
        rank: token.rank,
        source: "birdeye",
        symbol: token.symbol,
        volume24h: token.volume24hUSD ?? 0,
      }),
    ) ?? [];

  return enrichTokensWithJupiter(birdeyeTokens.length ? birdeyeTokens : TOKENS, signal);
}

export async function enrichTokensWithJupiter(tokens: Token[], signal?: AbortSignal) {
  try {
    const prices = await fetchJupiterPrices(
      tokens.map((token) => token.mint),
      signal,
    );
    return tokens.map((token) => {
      const price = prices[token.mint];
      if (!price) return token;

      return mergeToken(token, {
        change24h: price.priceChange24h ?? token.change24h,
        decimals: price.decimals ?? token.decimals,
        price: price.usdPrice ?? token.price,
        source: token.source === "static" ? "jupiter" : token.source,
      });
    });
  } catch {
    return tokens;
  }
}

export async function fetchTokenMarket(mint: string, signal?: AbortSignal) {
  try {
    return await fetchLocalJson<Token>(`/api/market/token/${encodeURIComponent(mint)}`, signal);
  } catch {
    // Fall through to Jupiter/static fallback.
  }

  const base = TOKENS.find((token) => token.mint === mint) ?? createFallbackToken(mint);
  const [token] = await enrichTokensWithJupiter([base], signal);
  return token;
}

export async function fetchTokenOhlcv(
  mint: string,
  interval: ChartInterval = "15m",
  signal?: AbortSignal,
) {
  return fetchLocalJson<MarketDataset<PricePoint[]>>(
    `/api/market/ohlcv/${encodeURIComponent(mint)}?interval=${interval}`,
    signal,
  );
}

export async function fetchTokenTrades(mint: string, signal?: AbortSignal) {
  return fetchLocalJson<MarketDataset<LiveTrade[]>>(
    `/api/market/trades/${encodeURIComponent(mint)}`,
    signal,
  );
}

export async function fetchTokenHolders(mint: string, signal?: AbortSignal) {
  return fetchLocalJson<MarketDataset<LiveHolder[]>>(
    `/api/market/holders/${encodeURIComponent(mint)}`,
    signal,
  );
}

export async function fetchJupiterQuote({
  inputMint,
  outputMint,
  amount,
  outputDecimals,
  slippageBps,
  taker,
  signal,
}: {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  outputDecimals: number;
  slippageBps: number;
  taker?: string;
  signal?: AbortSignal;
}): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: String(slippageBps),
    swapMode: "ExactIn",
  });

  if (hasJupiterKey) {
    if (taker) params.set("taker", taker);
    const started = performance.now();
    const response = await fetch(`https://api.jup.ag/swap/v2/order?${params}`, {
      signal,
      headers: { "x-api-key": env.jupiterApiKey! },
    });

    if (!response.ok) {
      throw new Error(`Jupiter order failed (${response.status})`);
    }

    const quote = await response.json();
    const route = Array.isArray(quote.routePlan)
      ? quote.routePlan
          .map(
            (leg: { swapInfo?: { label?: string }; percent?: number }) =>
              `${leg.swapInfo?.label ?? "DEX"} ${leg.percent ?? 100}%`,
          )
          .join(" + ")
      : "Jupiter";

    return {
      outAmount: quote.outAmount,
      outUiAmount: Number(quote.outAmount ?? 0) / 10 ** outputDecimals,
      inputUsd: quote.inUsdValue,
      outputUsd: quote.outUsdValue,
      priceImpactPct: Math.abs(Number(quote.priceImpact ?? quote.priceImpactPct ?? 0)) * 100,
      route,
      router: quote.router ?? quote.mode ?? "Jupiter",
      responseMs: Math.round(performance.now() - started),
      source: "jupiter-v2",
    };
  }

  const started = performance.now();
  const response = await fetch(`https://lite-api.jup.ag/swap/v1/quote?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Jupiter lite quote failed (${response.status})`);
  }

  const quote = await response.json();
  const route = Array.isArray(quote.routePlan)
    ? quote.routePlan
        .map(
          (leg: { swapInfo?: { label?: string }; percent?: number }) =>
            `${leg.swapInfo?.label ?? "DEX"} ${leg.percent ?? 100}%`,
        )
        .join(" + ")
    : "Jupiter";

  return {
    outAmount: quote.outAmount,
    outUiAmount: Number(quote.outAmount ?? 0) / 10 ** outputDecimals,
    priceImpactPct: Math.abs(Number(quote.priceImpactPct ?? 0)) * 100,
    route,
    router: "Metis",
    responseMs: Math.round(performance.now() - started),
    source: "jupiter-lite",
  };
}

export async function fetchSolanaRpcHealth(signal?: AbortSignal) {
  const [slot, version] = await Promise.all([
    solanaRpc<number>("getSlot", [{ commitment: "confirmed" }], signal),
    solanaRpc<{ "solana-core": string }>("getVersion", [], signal),
  ]);

  return {
    slot,
    version: version["solana-core"],
    endpoint: env.solanaRpcUrl.includes("alchemy.com") ? "Alchemy RPC" : "Solana RPC",
  };
}

async function solanaRpc<T>(method: string, params: unknown[] = [], signal?: AbortSignal) {
  const response = await fetch(env.solanaRpcUrl, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: method,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC ${method} failed (${response.status})`);
  }

  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) {
    throw new Error(payload.error.message ?? `RPC ${method} failed`);
  }

  return payload.result as T;
}

export async function fetchTokenPosition({
  owner,
  mint,
  decimals,
  price,
  signal,
}: {
  owner: string;
  mint: string;
  decimals: number;
  price: number;
  signal?: AbortSignal;
}): Promise<TokenPosition> {
  if (!hasRpcEndpoint) {
    throw new Error("Missing Solana RPC endpoint");
  }

  if (mint === SOL_MINT) {
    const result = await solanaRpc<{ value: number }>(
      "getBalance",
      [owner, { commitment: "confirmed" }],
      signal,
    );
    const balance = result.value / 10 ** decimals;
    return {
      balance,
      valueUsd: balance * price,
      source: env.solanaRpcUrl.includes("alchemy.com") ? "Alchemy RPC" : "Solana RPC",
    };
  }

  const result = await solanaRpc<{
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              tokenAmount?: {
                uiAmount?: number | null;
                uiAmountString?: string;
              };
            };
          };
        };
      };
    }>;
  }>(
    "getTokenAccountsByOwner",
    [owner, { mint }, { encoding: "jsonParsed", commitment: "confirmed" }],
    signal,
  );

  const balance = (result.value ?? []).reduce((total, item) => {
    const amount = item.account?.data?.parsed?.info?.tokenAmount;
    return total + Number(amount?.uiAmountString ?? amount?.uiAmount ?? 0);
  }, 0);

  return {
    balance,
    valueUsd: balance * price,
    source: env.solanaRpcUrl.includes("alchemy.com") ? "Alchemy RPC" : "Solana RPC",
  };
}

const supabase =
  hasSupabase && env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey)
    : null;

export async function recordTokenIntent(intent: {
  wallet?: string;
  mint: string;
  symbol: string;
  side: "buy" | "sell";
  amount: string;
}) {
  if (!supabase) return { stored: false };

  const { error } = await supabase.from("trade_intents").insert({
    wallet: intent.wallet ?? null,
    mint: intent.mint,
    symbol: intent.symbol,
    side: intent.side,
    amount: intent.amount,
  });

  if (error) throw error;
  return { stored: true };
}

export function useTrendingTokens() {
  return useQuery({
    queryKey: ["trending-tokens"],
    queryFn: ({ signal }) => fetchTrendingTokens(signal),
    initialData: TOKENS,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useTokenMarket(mint: string, initialToken?: Token) {
  return useQuery({
    queryKey: ["token-market", mint],
    queryFn: ({ signal }) => fetchTokenMarket(mint, signal),
    initialData: initialToken,
    staleTime: 30_000,
  });
}

export function useTokenOhlcv(mint: string, interval: ChartInterval = "15m") {
  return useQuery({
    queryKey: ["token-ohlcv", mint, interval],
    queryFn: ({ signal }) => fetchTokenOhlcv(mint, interval, signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useTokenTrades(mint: string, enabled = true) {
  return useQuery({
    queryKey: ["token-trades", mint],
    queryFn: ({ signal }) => fetchTokenTrades(mint, signal),
    enabled,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useTokenHolders(mint: string, enabled = true) {
  return useQuery({
    queryKey: ["token-holders", mint],
    queryFn: ({ signal }) => fetchTokenHolders(mint, signal),
    enabled,
    refetchInterval: 60_000,
    staleTime: 45_000,
    retry: 1,
  });
}

export function useSolanaRpcHealth() {
  return useQuery({
    queryKey: ["solana-rpc-health", env.solanaRpcUrl],
    queryFn: ({ signal }) => fetchSolanaRpcHealth(signal),
    enabled: hasRpcEndpoint,
    retry: 1,
    refetchInterval: 45_000,
  });
}

export function useTokenPosition({
  owner,
  mint,
  decimals,
  price,
}: {
  owner?: string;
  mint: string;
  decimals: number;
  price: number;
}) {
  return useQuery({
    queryKey: ["token-position", owner, mint, decimals, price],
    queryFn: ({ signal }) =>
      fetchTokenPosition({
        owner: owner!,
        mint,
        decimals,
        price,
        signal,
      }),
    enabled: Boolean(owner && hasRpcEndpoint),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });
}
