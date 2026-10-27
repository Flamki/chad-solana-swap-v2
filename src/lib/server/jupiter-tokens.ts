import { createFallbackToken, mergeToken, type Token } from "@/lib/tokens";

const JUPITER_BASE = "https://api.jup.ag";

type JupiterToken = {
  id?: string;
  address?: string;
  mint?: string;
  name?: string;
  symbol?: string;
  icon?: string;
  logoURI?: string;
  decimals?: number;
  holderCount?: number;
  fdv?: number;
  mcap?: number;
  usdPrice?: number;
  liquidity?: number;
  stats24h?: {
    priceChange?: number;
    buyVolume?: number;
    sellVolume?: number;
  };
};

function getJupiterKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

export function tokenFromJupiter(item: JupiterToken): Token | null {
  const mint = item.id ?? item.address ?? item.mint;
  if (!mint) return null;

  return mergeToken(createFallbackToken(mint), {
    decimals: item.decimals,
    symbol: item.symbol,
    name: item.name,
    logo: item.icon ?? item.logoURI,
    price: item.usdPrice,
    liquidity: item.liquidity,
    marketCap: item.mcap ?? item.fdv,
    volume24h: (item.stats24h?.buyVolume ?? 0) + (item.stats24h?.sellVolume ?? 0),
    change24h: item.stats24h?.priceChange,
    holders: item.holderCount,
    source: "jupiter",
  });
}

export async function jupiterTokenJson(path: string) {
  const key = getJupiterKey();
  const response = await fetch(`${JUPITER_BASE}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(key ? { "x-api-key": key } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Jupiter token request failed (${response.status})`);
  }

  return (await response.json()) as JupiterToken[];
}

export async function searchJupiterTokens(query: string, limit = 30) {
  const tokens = await jupiterTokenJson(
    `/tokens/v2/search?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return tokens.map(tokenFromJupiter).filter(Boolean) as Token[];
}

export async function getJupiterTrendingTokens(limit = 50) {
  const tokens = await jupiterTokenJson(`/tokens/v2/toptrending/5m?limit=${limit}`);
  return tokens.map(tokenFromJupiter).filter(Boolean) as Token[];
}

export async function getJupiterVerifiedTokens(limit = 80) {
  const tokens = await jupiterTokenJson("/tokens/v2/tag?query=verified");
  const unique = new Map<string, Token>();

  for (const token of tokens.map(tokenFromJupiter).filter(Boolean) as Token[]) {
    if (
      token.price > 0 &&
      token.marketCap > 0 &&
      token.symbol &&
      (!unique.has(token.mint) || token.marketCap > unique.get(token.mint)!.marketCap)
    ) {
      unique.set(token.mint, token);
    }
  }

  return [...unique.values()]
    .sort((a, b) => {
      const marketCapDiff = b.marketCap - a.marketCap;
      if (marketCapDiff !== 0) return marketCapDiff;
      return (b.liquidity ?? 0) - (a.liquidity ?? 0);
    })
    .slice(0, limit);
}
