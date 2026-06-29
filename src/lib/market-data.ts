import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { env, hasJupiterKey, hasRpcEndpoint, hasSupabase } from "@/lib/env";
import { fetchMarketJson } from "@/lib/market-api";
import { SOL_MINT, USDC_MINT, createFallbackToken, type Token, mergeToken } from "@/lib/tokens";

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
  feeLamports?: number;
  priceImpactPct: number;
  route: string;
  router: string;
  responseMs?: number;
  source: "jupiter-v2" | "jupiter-lite";
};

export type JupiterSwapOrder = JupiterQuote & {
  transaction: string;
  requestId: string;
  lastValidBlockHeight?: string;
  quoteId?: string;
};

export type JupiterSwapExecution = {
  status?: "Success" | "Failed";
  signature?: string;
  slot?: string;
  error?: string;
  code?: number;
  inputAmountResult?: string;
  outputAmountResult?: string;
};

export type SolanaTransactionStatus = {
  signature: string;
  found: boolean;
  confirmed: boolean;
  confirmationStatus: "processed" | "confirmed" | "finalized";
  slot: number | null;
  confirmations: number | null;
  error: unknown;
  explorerUrl: string;
  checkedAt: string;
};

export type TradeReceiptRecord = {
  signature: string;
  status: "paper" | "submitted" | "confirmed" | "finalized";
  slot: number | null;
  wallet: string;
  mode: "paper" | "mainnet";
  side: "buy" | "sell";
  inputSymbol: string;
  outputSymbol: string;
  inputAmount: string;
  outputAmount: number;
  route: string;
  router: string;
  tokenMint: string;
  createdAt: string;
  explorerUrl?: string;
};

export type UserProfileRecord = {
  wallet: string;
  username: string;
  displayName: string;
  bio: string;
  avatarDataUrl: string;
  bannerDataUrl: string;
  updatedAt?: string;
};

export type WalletTransferRecord = {
  signature: string;
  senderWallet: string;
  recipientWallet: string;
  assetSymbol: string;
  assetMint: string;
  amount: string;
  note: string;
  status: "submitted" | "confirmed" | "finalized";
  slot: number | null;
  explorerUrl: string;
  createdAt: string;
};

export type AppLeaderboardUser = {
  wallet: string;
  username: string;
  displayName: string;
  avatarDataUrl: string;
  trades: number;
  buys: number;
  sells: number;
  volumeSol: number;
  latestTokens: string[];
  lastTradeAt: string | null;
  updatedAt: string | null;
};

export type AppLeaderboardPeriod = "24h" | "7d" | "30d" | "all";

export type FollowStats = {
  following: number;
  followers: number;
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
  provider: "birdeye" | "geckoterminal" | "solana-rpc";
  geckoPoolAddress?: string;
  geckoTokenSide?: "base" | "quote";
  geckoPoolName?: string;
  geckoPoolDex?: string;
};

export type MarketTicker = {
  tokens: Token[];
  status: "live" | "cached" | "unavailable";
  updatedAt: string;
  provider:
    | "BirdEye + Jupiter"
    | "BirdEye"
    | "GeckoTerminal + Jupiter"
    | "GeckoTerminal"
    | "Jupiter";
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

export type PortfolioHistoryRange = "24H" | "7D" | "30D" | "ALL";

export type PortfolioHistoryPoint = {
  timestamp: number;
  value: number;
  solBalance: number;
  usdcBalance: number;
  source: "current" | "transaction";
};

type RpcSignatureInfo = {
  signature: string;
  blockTime?: number | null;
  err?: unknown;
};

type RpcTokenBalance = {
  mint?: string;
  owner?: string;
  uiTokenAmount?: {
    uiAmount?: number | null;
    uiAmountString?: string;
  };
};

type RpcParsedTransaction = {
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: RpcTokenBalance[];
    postTokenBalances?: RpcTokenBalance[];
  };
  transaction?: {
    message?: {
      accountKeys?: Array<string | { pubkey?: string }>;
    };
  };
};

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
  return fetchMarketJson<Token[]>("/api/market/trending", { signal });
}

export async function fetchCryptoTokens(signal?: AbortSignal): Promise<Token[]> {
  return fetchMarketJson<Token[]>("/api/market/crypto", { signal });
}

export async function fetchMarketTicker(signal?: AbortSignal): Promise<MarketTicker> {
  return fetchMarketJson<MarketTicker>("/api/market/ticker", {
    cache: "no-store",
    signal,
  });
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
  return fetchMarketJson<Token>(`/api/market/token/${encodeURIComponent(mint)}`, {
    signal,
  });
}

export async function fetchWatchlistTokenMarkets(mints: string[], signal?: AbortSignal) {
  const ids = Array.from(new Set(mints)).filter(Boolean).slice(0, 60);
  if (!ids.length) return [];

  const results = await Promise.allSettled(ids.map((mint) => fetchTokenMarket(mint, signal)));
  return results.map((result, index) =>
    result.status === "fulfilled" ? result.value : createFallbackToken(ids[index]),
  );
}

export async function fetchTokenOhlcv(
  mint: string,
  interval: ChartInterval = "15m",
  signal?: AbortSignal,
) {
  return fetchMarketJson<MarketDataset<PricePoint[]>>(
    `/api/market/ohlcv/${encodeURIComponent(mint)}?interval=${interval}`,
    { signal },
  );
}

export async function fetchTokenTrades(mint: string, signal?: AbortSignal) {
  return fetchMarketJson<MarketDataset<LiveTrade[]>>(
    `/api/market/trades/${encodeURIComponent(mint)}`,
    { signal },
  );
}

export async function fetchTokenHolders(mint: string, signal?: AbortSignal) {
  return fetchMarketJson<MarketDataset<LiveHolder[]>>(
    `/api/market/holders/${encodeURIComponent(mint)}`,
    { signal },
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

  params.set("outputDecimals", String(outputDecimals));
  if (taker) params.set("taker", taker);

  const response = await fetch(`/api/trade/quote?${params}`, { signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Jupiter quote failed (${response.status})`);
  }

  return (await response.json()) as JupiterQuote;
}

export async function createJupiterSwapOrder({
  inputMint,
  outputMint,
  amount,
  outputDecimals,
  slippageBps,
  taker,
}: {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  outputDecimals: number;
  slippageBps: number;
  taker: string;
}): Promise<JupiterSwapOrder> {
  const response = await fetch("/api/trade/order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps,
      taker,
    }),
  });

  const order = await response.json();
  if (!response.ok) {
    throw new Error(order?.error ?? `Jupiter order failed (${response.status})`);
  }

  const route = Array.isArray(order.routePlan)
    ? order.routePlan
        .map(
          (leg: { swapInfo?: { label?: string }; percent?: number }) =>
            `${leg.swapInfo?.label ?? "DEX"} ${leg.percent ?? 100}%`,
        )
        .join(" + ")
    : "Jupiter";

  return {
    outAmount: order.outAmount,
    outUiAmount: Number(order.outAmount ?? 0) / 10 ** outputDecimals,
    inputUsd: order.inUsdValue,
    outputUsd: order.outUsdValue,
    feeLamports:
      Number(order.signatureFeeLamports ?? 0) +
      Number(order.prioritizationFeeLamports ?? 0) +
      Number(order.rentFeeLamports ?? 0),
    priceImpactPct: Math.abs(Number(order.priceImpact ?? order.priceImpactPct ?? 0)) * 100,
    route,
    router: order.router ?? order.mode ?? "Jupiter",
    responseMs: order.totalTime,
    source: "jupiter-v2",
    transaction: order.transaction,
    requestId: order.requestId,
    lastValidBlockHeight: order.lastValidBlockHeight,
    quoteId: order.quoteId,
  };
}

export async function executeJupiterSwap({
  signedTransaction,
  requestId,
  lastValidBlockHeight,
}: {
  signedTransaction: string;
  requestId: string;
  lastValidBlockHeight?: string;
}): Promise<JupiterSwapExecution> {
  const response = await fetch("/api/trade/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      signedTransaction,
      requestId,
      lastValidBlockHeight,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error ?? `Jupiter execution failed (${response.status})`);
  }

  if (result.status === "Failed" || result.error) {
    throw new Error(result.error || `Jupiter execution failed (${result.code ?? "unknown"})`);
  }

  return result as JupiterSwapExecution;
}

export async function confirmSolanaTransaction(signature: string) {
  let latestStatus: SolanaTransactionStatus | undefined;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`/api/trade/status/${encodeURIComponent(signature)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Transaction verification failed (${response.status})`);
    }

    latestStatus = (await response.json()) as SolanaTransactionStatus;
    if (latestStatus.confirmed || latestStatus.error) return latestStatus;
    await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  }

  return latestStatus;
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

export async function fetchPortfolioHistory({
  owner,
  range,
  solPrice,
  currentSolBalance,
  currentUsdcBalance,
  signal,
}: {
  owner: string;
  range: PortfolioHistoryRange;
  solPrice: number;
  currentSolBalance: number;
  currentUsdcBalance: number;
  signal?: AbortSignal;
}): Promise<PortfolioHistoryPoint[]> {
  if (!hasRpcEndpoint) {
    throw new Error("Missing Solana RPC endpoint");
  }

  const now = Date.now();
  const rangeStart = now - getPortfolioHistoryRangeSpan(range);
  const currentPoint = toPortfolioHistoryPoint({
    timestamp: now,
    solBalance: currentSolBalance,
    usdcBalance: currentUsdcBalance,
    solPrice,
    source: "current",
  });

  const signatures = await solanaRpc<RpcSignatureInfo[]>(
    "getSignaturesForAddress",
    [owner, { limit: 100, commitment: "confirmed" }],
    signal,
  );
  const historySignatures = signatures
    .filter((item) => item.blockTime && item.blockTime * 1000 >= rangeStart)
    .slice(0, 50);

  if (!historySignatures.length) {
    return [currentPoint];
  }

  const transactions = await Promise.all(
    historySignatures.map(async (item) => {
      try {
        const transaction = await solanaRpc<RpcParsedTransaction | null>(
          "getTransaction",
          [
            item.signature,
            {
              commitment: "confirmed",
              encoding: "jsonParsed",
              maxSupportedTransactionVersion: 0,
            },
          ],
          signal,
        );
        return { signature: item.signature, transaction };
      } catch {
        return { signature: item.signature, transaction: null };
      }
    }),
  );

  let solBalance = currentSolBalance;
  let usdcBalance = currentUsdcBalance;
  const points: PortfolioHistoryPoint[] = [currentPoint];

  for (const { transaction } of transactions) {
    if (!transaction?.blockTime || transaction.meta?.err) continue;

    const solDelta = getSolBalanceDelta(transaction, owner);
    const usdcDelta = getTokenBalanceDelta(transaction, owner, USDC_MINT);
    if (Math.abs(solDelta) < 0.000000001 && Math.abs(usdcDelta) < 0.000001) continue;

    const transactionTime = transaction.blockTime * 1000;
    points.push(
      toPortfolioHistoryPoint({
        timestamp: transactionTime,
        solBalance,
        usdcBalance,
        solPrice,
        source: "transaction",
      }),
    );
    solBalance -= solDelta;
    usdcBalance -= usdcDelta;
    points.push(
      toPortfolioHistoryPoint({
        timestamp: transactionTime - 1,
        solBalance,
        usdcBalance,
        solPrice,
        source: "transaction",
      }),
    );
  }

  return dedupePortfolioHistoryPoints(points)
    .filter((point) => point.timestamp >= rangeStart)
    .sort((left, right) => left.timestamp - right.timestamp);
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

export async function recordTradeReceipt(receipt: TradeReceiptRecord) {
  if (receipt.mode !== "mainnet") return { stored: false };

  try {
    const response = await fetch("/api/trade/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipt),
    });

    if (response.ok) {
      return (await response.json()) as { stored: boolean; reason?: string };
    }
  } catch {
    // Fall back to the direct Supabase client below for older/local environments.
  }

  if (!supabase) return { stored: false };

  const { error } = await supabase.from("trade_receipts").upsert(
    {
      signature: receipt.signature,
      wallet: receipt.wallet,
      status: receipt.status,
      slot: receipt.slot,
      mode: receipt.mode,
      side: receipt.side,
      input_symbol: receipt.inputSymbol,
      output_symbol: receipt.outputSymbol,
      input_amount: receipt.inputAmount,
      output_amount: receipt.outputAmount,
      route: receipt.route,
      router: receipt.router,
      token_mint: receipt.tokenMint,
      created_at: receipt.createdAt,
      explorer_url: receipt.explorerUrl ?? `https://solscan.io/tx/${receipt.signature}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "signature" },
  );

  if (error) throw error;
  return { stored: true };
}

export async function fetchStoredTradeReceipts(wallet: string, signal?: AbortSignal) {
  if (!supabase) return [];

  const query = supabase
    .from("trade_receipts")
    .select(
      "signature,status,slot,wallet,mode,side,input_symbol,output_symbol,input_amount,output_amount,route,router,token_mint,created_at,explorer_url",
    )
    .eq("wallet", wallet)
    .order("created_at", { ascending: false })
    .limit(50);

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(
    (receipt): TradeReceiptRecord => ({
      signature: receipt.signature,
      status: receipt.status,
      slot: receipt.slot,
      wallet: receipt.wallet,
      mode: receipt.mode,
      side: receipt.side,
      inputSymbol: receipt.input_symbol,
      outputSymbol: receipt.output_symbol,
      inputAmount: receipt.input_amount,
      outputAmount: Number(receipt.output_amount ?? 0),
      route: receipt.route,
      router: receipt.router,
      tokenMint: receipt.token_mint,
      createdAt: receipt.created_at,
      explorerUrl: receipt.explorer_url ?? `https://solscan.io/tx/${receipt.signature}`,
    }),
  );
}

export async function fetchStoredWatchlist(wallet: string, signal?: AbortSignal) {
  if (!supabase) return [];
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { data, error } = await supabase
    .from("watchlist_tokens")
    .select("mint")
    .eq("wallet", wallet)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => item.mint).filter(Boolean);
}

export async function syncWatchlistToken({
  wallet,
  mint,
  watched,
}: {
  wallet?: string;
  mint: string;
  watched: boolean;
}) {
  if (!supabase || !wallet) return { stored: false };

  if (watched) {
    const { error } = await supabase.from("watchlist_tokens").upsert(
      {
        wallet,
        mint,
        created_at: new Date().toISOString(),
      },
      { onConflict: "wallet,mint" },
    );
    if (error) throw error;
    return { stored: true };
  }

  const { error } = await supabase
    .from("watchlist_tokens")
    .delete()
    .eq("wallet", wallet)
    .eq("mint", mint);

  if (error) throw error;
  return { stored: true };
}

export async function fetchFollowedTraders(wallet: string, signal?: AbortSignal) {
  if (!supabase) return [];
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { data, error } = await supabase
    .from("user_follows")
    .select("target_wallet")
    .eq("follower_wallet", wallet)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data ?? []).map((item) => item.target_wallet).filter(Boolean);
}

export async function fetchFollowStats(wallet: string, signal?: AbortSignal): Promise<FollowStats> {
  if (!supabase) return { following: 0, followers: 0 };
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const [followingResult, followersResult] = await Promise.all([
    supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_wallet", wallet),
    supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("target_wallet", wallet),
  ]);

  if (followingResult.error) {
    if (followingResult.error.code === "42P01") return { following: 0, followers: 0 };
    throw followingResult.error;
  }
  if (followersResult.error) {
    if (followersResult.error.code === "42P01") return { following: 0, followers: 0 };
    throw followersResult.error;
  }

  return {
    following: followingResult.count ?? 0,
    followers: followersResult.count ?? 0,
  };
}

export async function syncFollowTrader({
  wallet,
  targetWallet,
  following,
}: {
  wallet?: string;
  targetWallet: string;
  following: boolean;
}) {
  if (!supabase || !wallet || wallet === targetWallet) return { stored: false };

  if (following) {
    const { error } = await supabase.from("user_follows").upsert(
      {
        follower_wallet: wallet,
        target_wallet: targetWallet,
        created_at: new Date().toISOString(),
      },
      { onConflict: "follower_wallet,target_wallet" },
    );
    if (error) {
      if (error.code === "42P01") return { stored: false };
      throw error;
    }
    return { stored: true };
  }

  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_wallet", wallet)
    .eq("target_wallet", targetWallet);

  if (error) {
    if (error.code === "42P01") return { stored: false };
    throw error;
  }
  return { stored: true };
}

export async function fetchStoredUserProfile(wallet: string, signal?: AbortSignal) {
  if (!supabase) return null;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { data, error } = await supabase
    .from("user_profiles")
    .select("wallet,username,display_name,bio,avatar_data_url,banner_data_url,updated_at")
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    wallet: data.wallet,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio,
    avatarDataUrl: data.avatar_data_url,
    bannerDataUrl: data.banner_data_url,
    updatedAt: data.updated_at,
  } satisfies UserProfileRecord;
}

export async function recordUserProfile(profile: UserProfileRecord) {
  if (!supabase) return { stored: false };

  const { error } = await supabase.from("user_profiles").upsert(
    {
      wallet: profile.wallet,
      username: profile.username,
      display_name: profile.displayName,
      bio: profile.bio,
      avatar_data_url: profile.avatarDataUrl,
      banner_data_url: profile.bannerDataUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet" },
  );

  if (error) throw error;
  return { stored: true };
}

export async function recordWalletTransfer(transfer: WalletTransferRecord) {
  try {
    const response = await fetch("/api/wallet-transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(transfer),
    });

    if (response.ok) {
      return (await response.json()) as { stored: boolean };
    }
  } catch {
    // Fall back to the direct Supabase client below for older/local environments.
  }

  if (!supabase) return { stored: false };

  const { error } = await supabase.from("wallet_transfers").upsert(
    {
      signature: transfer.signature,
      sender_wallet: transfer.senderWallet,
      recipient_wallet: transfer.recipientWallet,
      asset_symbol: transfer.assetSymbol,
      asset_mint: transfer.assetMint,
      amount: transfer.amount,
      note: transfer.note,
      status: transfer.status,
      slot: transfer.slot,
      explorer_url: transfer.explorerUrl,
      created_at: transfer.createdAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "signature" },
  );

  if (error) throw error;
  return { stored: true };
}

export async function fetchWalletTransfers(wallet: string, signal?: AbortSignal) {
  if (!supabase) return [];
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { data, error } = await supabase
    .from("wallet_transfers")
    .select(
      "signature,sender_wallet,recipient_wallet,asset_symbol,asset_mint,amount,note,status,slot,explorer_url,created_at",
    )
    .or(`sender_wallet.eq.${wallet},recipient_wallet.eq.${wallet}`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map(
    (transfer): WalletTransferRecord => ({
      signature: transfer.signature,
      senderWallet: transfer.sender_wallet,
      recipientWallet: transfer.recipient_wallet,
      assetSymbol: transfer.asset_symbol,
      assetMint: transfer.asset_mint,
      amount: transfer.amount,
      note: transfer.note ?? "",
      status: transfer.status,
      slot: transfer.slot,
      explorerUrl: transfer.explorer_url,
      createdAt: transfer.created_at,
    }),
  );
}

export async function fetchAppLeaderboard(
  period: AppLeaderboardPeriod = "all",
  signal?: AbortSignal,
) {
  if (!supabase) return [];
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const since = leaderboardPeriodStart(period);
  let receiptQuery = supabase
    .from("trade_receipts")
    .select(
      "wallet,side,input_symbol,output_symbol,input_amount,output_amount,created_at,mode,status",
    )
    .eq("mode", "mainnet")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (since) {
    receiptQuery = receiptQuery.gte("created_at", since);
  }

  const [{ data: profiles, error: profileError }, { data: receipts, error: receiptError }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("wallet,username,display_name,avatar_data_url,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100),
      receiptQuery,
    ]);

  if (profileError) throw profileError;
  if (receiptError) throw receiptError;

  const users = new Map<string, AppLeaderboardUser>();

  for (const profile of profiles ?? []) {
    users.set(profile.wallet, {
      wallet: profile.wallet,
      username: profile.username,
      displayName: profile.display_name,
      avatarDataUrl: profile.avatar_data_url,
      trades: 0,
      buys: 0,
      sells: 0,
      volumeSol: 0,
      latestTokens: [] as string[],
      lastTradeAt: null,
      updatedAt: profile.updated_at,
    });
  }

  for (const receipt of receipts ?? []) {
    const wallet = receipt.wallet;
    const current =
      users.get(wallet) ??
      ({
        wallet,
        username: shortWalletAddress(wallet),
        displayName: shortWalletAddress(wallet),
        avatarDataUrl: "",
        trades: 0,
        buys: 0,
        sells: 0,
        volumeSol: 0,
        latestTokens: [] as string[],
        lastTradeAt: null,
        updatedAt: null,
      } satisfies AppLeaderboardUser);

    current.trades += 1;
    if (receipt.side === "buy") {
      current.buys += 1;
    } else {
      current.sells += 1;
    }
    current.volumeSol += receiptVolumeSol(receipt);
    const tokenSymbol = receipt.side === "buy" ? receipt.output_symbol : receipt.input_symbol;
    if (tokenSymbol && !current.latestTokens.includes(tokenSymbol)) {
      current.latestTokens = [tokenSymbol, ...current.latestTokens].slice(0, 3);
    }
    if (!current.lastTradeAt || receipt.created_at > current.lastTradeAt) {
      current.lastTradeAt = receipt.created_at;
    }
    users.set(wallet, current);
  }

  return Array.from(users.values())
    .filter((user) => user.trades > 0)
    .sort((left, right) => {
      if (right.volumeSol !== left.volumeSol) return right.volumeSol - left.volumeSol;
      if (right.trades !== left.trades) return right.trades - left.trades;
      const rightTime = new Date(right.lastTradeAt ?? right.updatedAt ?? 0).getTime();
      const leftTime = new Date(left.lastTradeAt ?? left.updatedAt ?? 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 50);
}

function receiptVolumeSol(receipt: {
  input_symbol?: string;
  output_symbol?: string;
  input_amount?: string;
  output_amount?: number;
}) {
  const inputSymbol = receipt.input_symbol?.toUpperCase();
  const outputSymbol = receipt.output_symbol?.toUpperCase();
  if (inputSymbol === "SOL") return Number(receipt.input_amount ?? 0) || 0;
  if (outputSymbol === "SOL") return Number(receipt.output_amount ?? 0) || 0;
  return 0;
}

function leaderboardPeriodStart(period: AppLeaderboardPeriod) {
  if (period === "all") return null;
  const now = Date.now();
  const durationMs =
    period === "24h"
      ? 24 * 60 * 60 * 1000
      : period === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  return new Date(now - durationMs).toISOString();
}

export function useTrendingTokens() {
  return useQuery({
    queryKey: ["trending-tokens"],
    queryFn: ({ signal }) => fetchTrendingTokens(signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useCryptoTokens() {
  return useQuery({
    queryKey: ["crypto-tokens"],
    queryFn: ({ signal }) => fetchCryptoTokens(signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useMarketTicker() {
  return useQuery({
    queryKey: ["landing-market-ticker"],
    queryFn: ({ signal }) => fetchMarketTicker(signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
  });
}

export function useTokenMarket(mint: string, initialToken?: Token) {
  return useQuery({
    queryKey: ["token-market", mint],
    queryFn: ({ signal }) => fetchTokenMarket(mint, signal),
    initialData: initialToken,
    initialDataUpdatedAt: initialToken ? 0 : undefined,
    refetchOnMount: true,
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

export function useStoredTradeReceipts(wallet?: string) {
  return useQuery({
    queryKey: ["trade-receipts", wallet],
    queryFn: ({ signal }) => fetchStoredTradeReceipts(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useStoredWatchlist(wallet?: string) {
  return useQuery({
    queryKey: ["watchlist", wallet],
    queryFn: ({ signal }) => fetchStoredWatchlist(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useWatchlistTokenMarkets(mints: string[]) {
  const key = useMemo(() => Array.from(new Set(mints)).filter(Boolean).sort(), [mints]);

  return useQuery({
    queryKey: ["watchlist-token-markets", key],
    queryFn: ({ signal }) => fetchWatchlistTokenMarkets(key, signal),
    enabled: key.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useStoredFollowedTraders(wallet?: string) {
  return useQuery({
    queryKey: ["followed-traders", wallet],
    queryFn: ({ signal }) => fetchFollowedTraders(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useFollowStats(wallet?: string) {
  return useQuery({
    queryKey: ["follow-stats", wallet],
    queryFn: ({ signal }) => fetchFollowStats(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useStoredUserProfile(wallet?: string) {
  return useQuery({
    queryKey: ["user-profile", wallet],
    queryFn: ({ signal }) => fetchStoredUserProfile(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useWalletTransfers(wallet?: string) {
  return useQuery({
    queryKey: ["wallet-transfers", wallet],
    queryFn: ({ signal }) => fetchWalletTransfers(wallet!, signal),
    enabled: Boolean(wallet && supabase),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useAppLeaderboard(period: AppLeaderboardPeriod = "all") {
  return useQuery({
    queryKey: ["app-leaderboard", period],
    queryFn: ({ signal }) => fetchAppLeaderboard(period, signal),
    enabled: Boolean(supabase),
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

export function usePortfolioHistory({
  owner,
  range,
  solPrice,
  currentSolBalance,
  currentUsdcBalance,
  enabled = true,
}: {
  owner?: string;
  range: PortfolioHistoryRange;
  solPrice: number;
  currentSolBalance: number;
  currentUsdcBalance: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["portfolio-history", owner, range, solPrice, currentSolBalance, currentUsdcBalance],
    queryFn: ({ signal }) =>
      fetchPortfolioHistory({
        owner: owner!,
        range,
        solPrice,
        currentSolBalance,
        currentUsdcBalance,
        signal,
      }),
    enabled: Boolean(owner && hasRpcEndpoint && enabled),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

function getSolBalanceDelta(transaction: RpcParsedTransaction, owner: string) {
  const accountIndex = transaction.transaction?.message?.accountKeys?.findIndex(
    (account) => getRpcAccountKey(account)?.toLowerCase() === owner.toLowerCase(),
  );

  if (accountIndex === undefined || accountIndex < 0) return 0;

  const preBalance = transaction.meta?.preBalances?.[accountIndex] ?? 0;
  const postBalance = transaction.meta?.postBalances?.[accountIndex] ?? 0;
  return (postBalance - preBalance) / 1_000_000_000;
}

function getTokenBalanceDelta(transaction: RpcParsedTransaction, owner: string, mint: string) {
  const preBalance = getOwnedTokenBalance(transaction.meta?.preTokenBalances ?? [], owner, mint);
  const postBalance = getOwnedTokenBalance(transaction.meta?.postTokenBalances ?? [], owner, mint);
  return postBalance - preBalance;
}

function getOwnedTokenBalance(balances: RpcTokenBalance[], owner: string, mint: string) {
  return balances.reduce((total, balance) => {
    if (balance.owner?.toLowerCase() !== owner.toLowerCase()) return total;
    if (balance.mint !== mint) return total;
    return (
      total + Number(balance.uiTokenAmount?.uiAmountString ?? balance.uiTokenAmount?.uiAmount ?? 0)
    );
  }, 0);
}

function shortWalletAddress(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

function toPortfolioHistoryPoint({
  timestamp,
  solBalance,
  usdcBalance,
  solPrice,
  source,
}: {
  timestamp: number;
  solBalance: number;
  usdcBalance: number;
  solPrice: number;
  source: PortfolioHistoryPoint["source"];
}): PortfolioHistoryPoint {
  const safeSolBalance = Math.max(0, solBalance);
  const safeUsdcBalance = Math.max(0, usdcBalance);

  return {
    timestamp,
    solBalance: safeSolBalance,
    usdcBalance: safeUsdcBalance,
    value: safeUsdcBalance + safeSolBalance * solPrice,
    source,
  };
}

function dedupePortfolioHistoryPoints(points: PortfolioHistoryPoint[]) {
  const byTimestamp = new Map<number, PortfolioHistoryPoint>();
  for (const point of points) {
    byTimestamp.set(point.timestamp, point);
  }
  return Array.from(byTimestamp.values());
}

function getRpcAccountKey(account: string | { pubkey?: string }) {
  return typeof account === "string" ? account : account.pubkey;
}

function getPortfolioHistoryRangeSpan(range: PortfolioHistoryRange) {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (range === "24H") return day;
  if (range === "7D") return 7 * day;
  if (range === "30D") return 30 * day;
  return 180 * day;
}
