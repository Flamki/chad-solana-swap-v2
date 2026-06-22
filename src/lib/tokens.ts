export interface Token {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
}

// Realistic mock Solana tokens (real mints / logos so plugging BirdEye later is a 1-line swap).
export const TOKENS: Token[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL", name: "Solana",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    price: 184.32, change24h: 4.21, volume24h: 2_450_000_000, marketCap: 88_000_000_000, holders: 1_240_000,
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK", name: "Bonk",
    logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    price: 0.0000231, change24h: 12.4, volume24h: 145_000_000, marketCap: 1_700_000_000, holders: 740_000,
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF", name: "dogwifhat",
    logo: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
    price: 1.82, change24h: -3.1, volume24h: 280_000_000, marketCap: 1_820_000_000, holders: 220_000,
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP", name: "Jupiter",
    logo: "https://static.jup.ag/jup/icon.png",
    price: 0.78, change24h: 8.9, volume24h: 110_000_000, marketCap: 1_050_000_000, holders: 480_000,
  },
  {
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    symbol: "PYTH", name: "Pyth Network",
    logo: "https://pyth.network/token.svg",
    price: 0.21, change24h: 1.6, volume24h: 32_000_000, marketCap: 760_000_000, holders: 92_000,
  },
  {
    mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    symbol: "JTO", name: "Jito",
    logo: "https://metadata.jito.network/token/jto/image",
    price: 2.45, change24h: 6.3, volume24h: 48_000_000, marketCap: 540_000_000, holders: 64_000,
  },
  {
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    symbol: "POPCAT", name: "Popcat",
    logo: "https://arweave.net/A1etRNBuQIa11uTczjVlZUyMUWUiQbWk4F-cZJZ4d-c",
    price: 0.42, change24h: 18.7, volume24h: 88_000_000, marketCap: 410_000_000, holders: 145_000,
  },
  {
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    symbol: "MEW", name: "cat in a dogs world",
    logo: "https://img-v1.raydium.io/icon/MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5.png",
    price: 0.0072, change24h: -5.4, volume24h: 22_000_000, marketCap: 64_000_000, holders: 88_000,
  },
  {
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    symbol: "PNUT", name: "Peanut the Squirrel",
    logo: "https://ipfs.io/ipfs/QmZTSk6cVQiYpKpyy46k8q3GsGFEzPx5dHFV2JKzv9R3Ld",
    price: 0.62, change24h: 24.1, volume24h: 195_000_000, marketCap: 620_000_000, holders: 168_000,
  },
  {
    mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
    symbol: "GOAT", name: "Goatseus Maximus",
    logo: "https://ipfs.io/ipfs/QmYsg7yNkVUzz1uybvFwLUMa1ck5cF9KQfxRrSyaR9pgmK",
    price: 0.58, change24h: -8.2, volume24h: 62_000_000, marketCap: 580_000_000, holders: 71_000,
  },
];

export const getToken = (mint: string) => TOKENS.find(t => t.mint === mint);

export const formatUsd = (n: number) => {
  if (n < 0.01) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

export const formatCompact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

// Deterministic seeded price history for charts
export function generatePriceHistory(token: Token, points = 180): { time: number; value: number }[] {
  const out: { time: number; value: number }[] = [];
  let price = token.price * (1 - token.change24h / 100);
  const now = Math.floor(Date.now() / 1000);
  const step = (24 * 60 * 60) / points;
  let seed = token.mint.charCodeAt(0) + token.mint.charCodeAt(5);
  for (let i = 0; i < points; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const drift = (token.change24h / 100) / points;
    price = price * (1 + drift + (r - 0.5) * 0.025);
    out.push({ time: now - (points - i) * step, value: price });
  }
  out.push({ time: now, value: token.price });
  return out;
}

export function generateTrades(token: Token, count = 25) {
  const trades = [];
  let seed = token.mint.charCodeAt(2) * 7;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const isBuy = r > 0.45;
    const amount = (r * 5000 + 50);
    trades.push({
      id: `${token.mint}-${i}`,
      side: isBuy ? "buy" as const : "sell" as const,
      amountUsd: amount,
      tokens: amount / token.price,
      price: token.price * (1 + (r - 0.5) * 0.005),
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