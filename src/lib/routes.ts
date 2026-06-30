import type { Route } from "next";

import { SOL_MINT } from "@/lib/tokens";

export { SOL_MINT };

export const SOLANA_TOKEN_PATH = "/tokens/solana";

export function solanaTokenPath(mint: string): Route {
  return `${SOLANA_TOKEN_PATH}/${encodeURIComponent(mint)}` as Route;
}

export const SOL_TOKEN_PATH = solanaTokenPath(SOL_MINT);
