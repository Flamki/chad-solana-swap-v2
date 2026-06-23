import type { Metadata } from "next";
import type { ReactNode } from "react";

import chadLogoIcon from "@/assets/chad-logo.png";
import { assetUrl } from "@/lib/asset-url";
import { Providers } from "@/app/providers";
import "@/styles.css";

export const metadata: Metadata = {
  title: "ChadWallet - Trade Solana Like a Chad",
  description:
    "The Solana wallet for traders. Buy and sell any token in seconds. Apple Pay, gasless, social-first.",
  authors: [{ name: "ChadWallet" }],
  openGraph: {
    title: "ChadWallet - Trade Solana Like a Chad",
    description: "The Solana wallet for traders. Buy and sell any token in seconds.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@chadwallet",
  },
  icons: {
    icon: assetUrl(chadLogoIcon),
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
