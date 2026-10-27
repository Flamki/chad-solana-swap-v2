export const env = {
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  privyClientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
  birdeyeApiKey: process.env.NEXT_PUBLIC_BIRDEYE_API_KEY,
  jupiterApiKey: process.env.NEXT_PUBLIC_JUPITER_API_KEY,
  solanaRpcUrl:
    process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  edgeApiUrl: process.env.NEXT_PUBLIC_EDGE_API_URL?.replace(/\/$/, ""),
  tradeTestMode:
    process.env.NEXT_PUBLIC_TRADE_TEST_MODE === "true" ||
    (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_TRADE_TEST_MODE !== "false"),
};

export const hasPrivy = Boolean(env.privyAppId);
export const hasBirdeye = Boolean(env.birdeyeApiKey);
export const hasJupiterKey = Boolean(env.jupiterApiKey);
export const hasRpcEndpoint = Boolean(env.solanaRpcUrl);
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isTradeTestMode = env.tradeTestMode;
