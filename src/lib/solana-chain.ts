export const SOLANA_MAINNET_CHAIN = "solana:mainnet";
export const SOLANA_MAINNET_EXPLORER_URL = "https://explorer.solana.com";
export const SOLANA_MAINNET_RPC_FALLBACK = "https://api.mainnet-beta.solana.com";

export function solanaRpcSubscriptionsUrl(rpcUrl: string) {
  if (rpcUrl.startsWith("https://")) return rpcUrl.replace(/^https:\/\//, "wss://");
  if (rpcUrl.startsWith("http://")) return rpcUrl.replace(/^http:\/\//, "ws://");
  return "wss://api.mainnet-beta.solana.com";
}
