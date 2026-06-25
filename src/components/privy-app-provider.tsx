"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import type { ReactNode } from "react";

import chadLogoIcon from "@/assets/logo/dark.png";
import { assetUrl } from "@/lib/asset-url";
import { env, hasPrivy } from "@/lib/env";

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!hasPrivy || !env.privyAppId) {
    return <>{children}</>;
  }

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
      }}
    >
      {children}
    </PrivyProvider>
  );
}
