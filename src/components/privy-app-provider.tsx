"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import type { ReactNode } from "react";

import chadLogoIcon from "@/assets/logo/dark.png";
import { assetUrl } from "@/lib/asset-url";
import { env, hasPrivy } from "@/lib/env";
import {
  SOLANA_MAINNET_CHAIN,
  SOLANA_MAINNET_EXPLORER_URL,
  SOLANA_MAINNET_RPC_FALLBACK,
  solanaRpcSubscriptionsUrl,
} from "@/lib/solana-chain";

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!hasPrivy || !env.privyAppId) {
    return <>{children}</>;
  }

  const solanaRpcUrl = env.solanaRpcUrl || SOLANA_MAINNET_RPC_FALLBACK;

  return (
    <PrivyProvider
      appId={env.privyAppId}
      clientId={env.privyClientId}
      config={{
        appearance: {
          accentColor: "#7C3AED",
          logo: assetUrl(chadLogoIcon),
          showWalletLoginFirst: false,
          walletChainType: "ethereum-and-solana",
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solana: {
          rpcs: {
            [SOLANA_MAINNET_CHAIN]: {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                solanaRpcSubscriptionsUrl(solanaRpcUrl),
              ),
              blockExplorerUrl: SOLANA_MAINNET_EXPLORER_URL,
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
