import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Monitor } from "lucide-react";

import chadLogoIcon from "@/assets/logo/dark.png";
import { assetUrl } from "@/lib/asset-url";
import { Providers } from "@/app/providers";
import { ChadLogo } from "@/components/chad-logo";
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
    icon: [{ url: assetUrl(chadLogoIcon), type: "image/png" }],
    apple: [{ url: assetUrl(chadLogoIcon), type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {/* Mobile Viewport Blocker Overlay */}
          <div className="mobile-blocker-overlay hidden flex-col items-center justify-between h-screen w-screen bg-[#08060f] text-[#f4f1ff] px-6 py-8 select-none z-50 fixed inset-0">
            {/* Top spacer */}
            <div className="flex-1" />

            {/* Central content */}
            <div className="flex flex-col items-center text-center gap-6">
              {/* Brand Logo */}
              <div className="flex items-center">
                <ChadLogo variant="dark" size="lg" showTagline={false} />
              </div>

              {/* Tagline */}
              <div className="flex flex-col gap-2 max-w-[280px]">
                <h2 className="text-[20px] font-bold text-white leading-tight">
                  Download the app to start trading
                </h2>
              </div>

              {/* App store download buttons */}
              <div className="flex flex-col gap-3 mt-4 w-full max-w-[220px]">
                {/* iOS App Store */}
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 bg-[#000000] border border-[#252137] rounded-xl px-4 py-2 text-left hover:bg-[#12111a] transition duration-200"
                >
                  <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.64.73-1.2 1.87-1.05 2.97 1.1.09 2.24-.57 3-1.41z" />
                  </svg>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#7a7488]">
                      Download on the
                    </div>
                    <div className="text-[13px] font-bold text-white leading-none">App Store</div>
                  </div>
                </a>

                {/* Google Play */}
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 bg-[#000000] border border-[#252137] rounded-xl px-4 py-2 text-left hover:bg-[#12111a] transition duration-200"
                >
                  <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M3 5.27v13.46c0 .87.8 1.45 1.57 1.1l11.45-6.73c.7-.41.7-1.42 0-1.84L4.57 4.17c-.77-.35-1.57.23-1.57 1.1z" />
                  </svg>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#7a7488]">
                      Get it on
                    </div>
                    <div className="text-[13px] font-bold text-white leading-none">Google Play</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Bottom spacer */}
            <div className="flex-1 flex flex-col justify-end w-full max-w-[340px]">
              {/* Desktop info pill */}
              <div className="bg-[#12111a] border border-[#1b1726]/60 rounded-xl px-4 py-2.5 text-[11px] text-[#7a7488] font-bold flex items-center justify-center gap-2 text-center w-full">
                <Monitor className="h-3.5 w-3.5 text-[#7a7488]" />
                <span>chadwallet on Web is only available on desktop.</span>
              </div>
            </div>
          </div>

          {/* Normal children content */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
