export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface Token {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
  liquidity?: number;
  rank?: number;
  source?: "static" | "birdeye" | "jupiter";
}

export const TOKENS: Token[] = [
  {
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    decimals: 9,
    price: 184.32,
    change24h: 4.21,
    volume24h: 2_450_000_000,
    marketCap: 88_000_000_000,
    holders: 1_240_000,
    liquidity: 420_000_000,
    source: "static",
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    decimals: 5,
    price: 0.0000231,
    change24h: 12.4,
    volume24h: 145_000_000,
    marketCap: 1_700_000_000,
    holders: 740_000,
    liquidity: 42_000_000,
    source: "static",
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    name: "dogwifhat",
    logo: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
    decimals: 6,
    price: 1.82,
    change24h: -3.1,
    volume24h: 280_000_000,
    marketCap: 1_820_000_000,
    holders: 220_000,
    liquidity: 36_000_000,
    source: "static",
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    name: "Jupiter",
    logo: "https://static.jup.ag/jup/icon.png",
    decimals: 6,
    price: 0.78,
    change24h: 8.9,
    volume24h: 110_000_000,
    marketCap: 1_050_000_000,
    holders: 480_000,
    liquidity: 58_000_000,
    source: "static",
  },
  {
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    symbol: "PYTH",
    name: "Pyth Network",
    logo: "https://pyth.network/token.svg",
    decimals: 6,
    price: 0.21,
    change24h: 1.6,
    volume24h: 32_000_000,
    marketCap: 760_000_000,
    holders: 92_000,
    liquidity: 18_000_000,
    source: "static",
  },
  {
    mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    symbol: "JTO",
    name: "Jito",
    logo: "https://metadata.jito.network/token/jto/image",
    decimals: 9,
    price: 2.45,
    change24h: 6.3,
    volume24h: 48_000_000,
    marketCap: 540_000_000,
    holders: 64_000,
    liquidity: 24_000_000,
    source: "static",
  },
  {
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    symbol: "POPCAT",
    name: "Popcat",
    logo: "https://arweave.net/A1etRNBuQIa11uTczjVlZUyMUWUiQbWk4F-cZJZ4d-c",
    decimals: 9,
    price: 0.42,
    change24h: 18.7,
    volume24h: 88_000_000,
    marketCap: 410_000_000,
    holders: 145_000,
    liquidity: 16_000_000,
    source: "static",
  },
  {
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    symbol: "MEW",
    name: "cat in a dogs world",
    logo: "https://img-v1.raydium.io/icon/MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5.png",
    decimals: 5,
    price: 0.0072,
    change24h: -5.4,
    volume24h: 22_000_000,
    marketCap: 64_000_000,
    holders: 88_000,
    liquidity: 7_400_000,
    source: "static",
  },
  {
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    symbol: "PNUT",
    name: "Peanut",
    logo: "https://ipfs.io/ipfs/QmZTSk6cVQiYpKpyy46k8q3GsGFEzPx5dHFV2JKzv9R3Ld",
    decimals: 6,
    price: 0.62,
    change24h: 24.1,
    volume24h: 195_000_000,
    marketCap: 620_000_000,
    holders: 168_000,
    liquidity: 29_000_000,
    source: "static",
  },
  {
    mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
    symbol: "GOAT",
    name: "Goatseus Maximus",
    logo: "https://ipfs.io/ipfs/QmYsg7yNkVUzz1uybvFwLUMa1ck5cF9KQfxRrSyaR9pgmK",
    decimals: 6,
    price: 0.58,
    change24h: -8.2,
    volume24h: 62_000_000,
    marketCap: 580_000_000,
    holders: 71_000,
    liquidity: 14_000_000,
    source: "static",
  },
];

export const getToken = (mint: string) => TOKENS.find((token) => token.mint === mint);

export function createFallbackToken(mint: string): Token {
  const short = mint.length > 8 ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : mint;
  return {
    mint,
    symbol: short,
    name: `Solana token ${short}`,
    logo: "",
    decimals: mint === SOL_MINT ? 9 : 6,
    price: 0,
    change24h: 0,
    volume24h: 0,
    marketCap: 0,
    holders: 0,
    source: "static",
  };
}

export function mergeToken(token: Token, patch: Partial<Token>): Token {
  return {
    ...token,
    ...Object.fromEntries(
      Object.entries(patch).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
    ),
  };
}

export const formatUsd = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return "$0.00";
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.01) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

export const formatCompact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export const rawAmountFromUi = (amount: number, decimals: number) => {
  if (!Number.isFinite(amount) || amount <= 0) return 0n;
  return BigInt(Math.floor(amount * 10 ** decimals));
};

export function generatePriceHistory(
  token: Token,
  points = 180,
): { time: number; value: number }[] {
  const out: { time: number; value: number }[] = [];
  const safePrice = token.price || 1;
  let price = safePrice * (1 - token.change24h / 100);
  const now = Math.floor(Date.now() / 1000);
  const step = (24 * 60 * 60) / points;
  let seed = token.mint.charCodeAt(0) + token.mint.charCodeAt(5);

  for (let i = 0; i <= points; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const drift = token.change24h / 100 / points;
    price = price * (1 + drift + (r - 0.5) * 0.025);
    out.push({
      time: Math.floor(now - (points - i) * step),
      value: Math.max(price, safePrice * 0.2),
    });
  }

  out[out.length - 1] = { time: now, value: safePrice };
  return out;
}

export function generateTrades(token: Token, count = 25) {
  const trades = [];
  const safePrice = token.price || 1;
  let seed = token.mint.charCodeAt(2) * 7;

  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const isBuy = r > 0.45;
    const amount = r * 5000 + 50;
    trades.push({
      id: `${token.mint}-${i}`,
      side: isBuy ? ("buy" as const) : ("sell" as const),
      amountUsd: amount,
      tokens: amount / safePrice,
      price: safePrice * (1 + (r - 0.5) * 0.005),
      wallet: `${token.mint.slice(0, 4)}...${Math.floor(r * 9999)}`,
      ago: `${Math.floor(r * 60) + i}s`,
    });
  }

  return trades;
}

export function generateHolders(token: Token, count = 10) {
  const holders = [];
  let seed = token.mint.charCodeAt(1) * 13;
  let pct = 18;

  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    pct = pct * (0.55 + r * 0.3);
    holders.push({
      rank: i + 1,
      wallet: `${(seed.toString(36) + token.mint.slice(0, 3)).slice(0, 4)}...${Math.floor(r * 9999)}`,
      pct: Math.max(0.05, pct),
      valueUsd: (token.marketCap * pct) / 100,
    });
  }

  return holders;
}
