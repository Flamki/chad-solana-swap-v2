"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SignInButton } from "@/components/sign-in-button";
import { assetUrl } from "@/lib/asset-url";

import buySell from "@/assets/flow/buy-sell-4.png";
import kol from "@/assets/flow/kol-4.png";
import launch from "@/assets/flow/launch-4.png";
import memecoin from "@/assets/flow/memecoin-4.png";
import portfolio from "@/assets/flow/portfolio-4.png";
import relaunch from "@/assets/flow/relaunch-4.png";
import chadLogo from "@/assets/logo/dark.png";

const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const SOL_TRADE = "/trade/So11111111111111111111111111111111111111112";
const STORE_BADGES = "/assets/landing/store-badges-v3-cropped.png";
const QR_CODE = "/assets/landing/qr-rounded.svg";
const HERO_BACKGROUND = "/assets/landing/hero-space-earth.png";
const HERO_CHARACTER = "/assets/landing/astronaut.png";
const TRADING_DASHBOARD = "/assets/landing/trading-dashboard.png";
const PHONE_MOCKUP = "/assets/landing/phone-mockup.png";
const PHONE_CLEAN = "/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm";
const PHONE_CLEAN_FALLBACK = "/assets/video/MAKE_VIDEO_NOT_IMAGE.mp4";
const PHONE_VIDEO = "/assets/video/chadwallet.mp4";
const FOOTER_IMAGE = "/assets/landing/chad-footer.png";

const tickerOne = [
  {
    mint: "So11111111111111111111111111111111111111112",
    sym: "SOL",
    price: "$184.32",
    chg: "+4.20%",
    up: true,
    color: "bg-emerald-500",
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    sym: "BONK",
    price: "$0.00002140",
    chg: "+12.30%",
    up: true,
    color: "bg-orange-500",
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    sym: "WIF",
    price: "$1.85",
    chg: "+3.45%",
    up: true,
    color: "bg-purple-500",
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    sym: "JUP",
    price: "$0.2170",
    chg: "+8.90%",
    up: true,
    color: "bg-blue-500",
  },
  {
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgU8",
    sym: "SAMO",
    price: "$0.0064",
    chg: "-2.67%",
    up: false,
    color: "bg-indigo-500",
  },
  {
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    sym: "PNUT",
    price: "$0.6200",
    chg: "+24.10%",
    up: true,
    color: "bg-amber-500",
  },
  {
    mint: "MEW1gQWJ3nEXg2qgERi8k2wmxPtwM7LtGJmK3aN4VXS",
    sym: "MEW",
    price: "$0.00720000",
    chg: "-5.40%",
    up: false,
    color: "bg-rose-500",
  },
  {
    mint: "7GCihgDB8feMnnnGNiBRdgtZ4Fe7Gqw7fNnvLDbGpump",
    sym: "POPCAT",
    price: "$0.4200",
    chg: "+18.70%",
    up: true,
    color: "bg-cyan-500",
  },
];

const tickerTwo = [
  {
    mint: "HZ1JovNiVvGrGNiiYvEozEVgPLZ6vX8JELtP3WwYv9w",
    sym: "PYTH",
    price: "$0.2100",
    chg: "+1.60%",
    up: true,
  },
  {
    mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    sym: "JTO",
    price: "$2.45",
    chg: "+6.30%",
    up: true,
  },
  {
    mint: "7GCihgDB8feMnnnGNiBRdgtZ4Fe7Gqw7fNnvLDbGpump",
    sym: "POPCAT",
    price: "$0.4200",
    chg: "+18.70%",
    up: true,
  },
  {
    mint: "MEW1gQWJ3nEXg2qgERi8k2wmxPtwM7LtGJmK3aN4VXS",
    sym: "MEW",
    price: "$0.00720000",
    chg: "-5.40%",
    up: false,
  },
  {
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    sym: "PNUT",
    price: "$0.6200",
    chg: "+24.10%",
    up: true,
  },
  {
    mint: "CzLSujWBLFsP7m8pXkhYK9J8aK5W7qVWBXU6XVGpump",
    sym: "GOAT",
    price: "$0.5800",
    chg: "-8.20%",
    up: false,
  },
  {
    mint: "So11111111111111111111111111111111111111112",
    sym: "SOL",
    price: "$184.32",
    chg: "+4.20%",
    up: true,
  },
];

function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <img
        src={STORE_BADGES}
        alt="Download ChadWallet on the App Store and Google Play"
        className="h-14 w-auto object-contain"
      />
      <a
        href={IOS}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-y-0 left-0 w-1/2"
        aria-label="Download on the App Store"
      />
      <a
        href={ANDROID}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-y-0 right-0 w-1/2"
        aria-label="Get it on Google Play"
      />
    </div>
  );
}

function TokenTicker({
  items,
  compact = false,
}: {
  items: Array<{
    mint: string;
    sym: string;
    price: string;
    chg: string;
    up: boolean;
    color?: string;
  }>;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden border-y border-white/5 bg-black ${compact ? "py-4" : "py-5"}`}
    >
      <div
        className={`flex whitespace-nowrap ${compact ? "gap-8 animate-[scroll_40s_linear_infinite]" : "gap-4 animate-[scroll_35s_linear_infinite]"}`}
      >
        {[...Array(2)].map((_, dup) => (
          <div key={dup} className={`flex shrink-0 ${compact ? "gap-8" : "gap-4"}`}>
            {items.map((token) => (
              <Link
                key={`${token.sym}-${dup}`}
                href={`/trade/${token.mint}`}
                className={`flex items-center rounded-full ring-1 ring-white/10 transition hover:bg-white/[0.08] ${compact ? "gap-3 bg-white/[0.02] px-5 py-1.5" : "gap-3 bg-white/[0.04] px-4 py-2.5"}`}
              >
                {!compact && (
                  <div
                    className={`h-6 w-6 shrink-0 rounded-full ${token.color ?? "bg-indigo-500"}`}
                  />
                )}
                <span className="text-sm font-bold tracking-wide text-white/90">{token.sym}</span>
                <span className="font-mono text-sm text-white/50">{token.price}</span>
                <span
                  className={`font-mono text-sm ${token.up ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {token.chg}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function QRModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Download app"
    >
      <div
        className="relative w-full max-w-[340px] rounded-3xl bg-[#0b0b0f] p-6 text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.08]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 text-white/50 transition hover:text-white"
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/[0.12]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="text-sm font-semibold text-white">Download app</span>
        </div>

        <img
          src={QR_CODE}
          alt="QR code to download ChadWallet"
          className="mx-auto mb-5 h-auto w-full max-w-[260px]"
        />
        <p className="text-sm leading-relaxed text-white/60">
          Scan the QR code to download the app on your phone.
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Is ChadWallet self-custody?",
      a: "Yes. Keys are generated and stored client-side through Privy.",
    },
    {
      q: "Which chain does it support?",
      a: "Solana first, with the trading experience tuned for Solana tokens.",
    },
    {
      q: "Do I need a seed phrase?",
      a: "No. Sign in with email or socials and your wallet is secured under the hood.",
    },
    {
      q: "Does the trading page use real data?",
      a: "Yes. BirdEye, Alchemy, Jupiter, Supabase, and live chart data power the core flow.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative border-t border-white/5 px-6 py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">FAQ</p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          questions, briefly.
        </h2>
        <div className="mt-12 text-left">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q} className="border-t border-white/10 last:border-b">
                <button
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="group flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-base font-semibold text-white sm:text-lg">{faq.q}</span>
                  <span
                    className={`text-xl text-indigo-400 transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-6 text-sm leading-relaxed text-white/60 sm:text-base">{faq.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black font-[Inter,system-ui,sans-serif] text-white">
      <section className="relative min-h-[85vh] w-full overflow-hidden">
        <img
          src={HERO_BACKGROUND}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />

        <nav className="relative z-20 flex items-center justify-between px-4 pb-2 pt-3 md:px-5">
          <div className="-ml-1 flex items-center gap-2">
            <img
              src={assetUrl(chadLogo)}
              alt="ChadWallet logo"
              className="h-6 w-6 rounded-full bg-white object-contain ring-1 ring-white/10"
            />
            <span className="text-lg font-extrabold tracking-tight">ChadWallet</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <StoreBadges className="hidden sm:flex" />
            <SignInButton redirectTo={SOL_TRADE} />
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-12 pt-16 text-center md:pb-16 md:pt-24">
          <h1 className="text-[12vw] font-black leading-none tracking-tight text-white/90 drop-shadow-[0_0_60px_rgba(120,140,255,0.25)] sm:text-[9rem] md:text-[11rem]">
            ChadWallet
          </h1>
          <p className="mt-2 text-xl font-semibold sm:text-2xl md:text-3xl">
            The fastest way to trade Solana.
          </p>
          <p className="mt-3 max-w-xl text-xs text-blue-200/70 sm:text-sm">
            Buy, sell, and copy-trade any token - from viral launches to the wallets that print.
          </p>

          <div className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={SOL_TRADE}
              className="rounded-full bg-white/[0.06] px-7 py-2.5 text-sm font-semibold ring-1 ring-white/[0.18] backdrop-blur transition hover:bg-white/[0.10]"
            >
              Start trading
            </Link>
            <button
              onClick={() => setShowQr(true)}
              className="cursor-pointer rounded-full bg-white/[0.03] px-7 py-2.5 text-sm font-semibold ring-1 ring-white/[0.12] backdrop-blur transition hover:bg-white/[0.07]"
            >
              Get the app
            </button>
          </div>

          <img
            src={HERO_CHARACTER}
            alt="ChadWallet trader floating in space with a satellite"
            className="pointer-events-none mt-[-4rem] w-[min(560px,90%)] select-none animate-float sm:mt-[-6rem] md:mt-[-7rem]"
          />
        </div>
      </section>

      <section className="relative px-6 pb-16 pt-2 md:pb-24 md:pt-4">
        <div className="relative -mt-16 md:-mt-24">
          <TokenTicker items={tickerOne} />
        </div>

        <div className="mx-auto mt-12 max-w-6xl text-center md:mt-16">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-indigo-400">
            NOW AVAILABLE ON WEB
          </p>
          <h2 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            trade from anywhere.
            <br />
            never lose a beat.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-200/70">
            Open a trade on your phone, close it on your desktop - all in one app.
          </p>

          <div className="relative mt-20">
            <div className="absolute inset-x-[8%] bottom-[4%] top-[8%] rounded-full bg-indigo-600/18 blur-3xl" />
            <img
              src={TRADING_DASHBOARD}
              alt="ChadWallet web trading dashboard with live charts, token list, and swap panel"
              className="relative mx-auto w-full max-w-[1536px] rounded-xl border border-white/10 shadow-[0_38px_120px_rgba(0,0,0,0.68)]"
            />
            <img
              src={PHONE_MOCKUP}
              alt="ChadWallet mobile app showing trending tokens"
              className="pointer-events-none absolute bottom-[-17%] right-[-8%] z-10 w-[42%] max-w-[560px] select-none drop-shadow-[0_35px_70px_rgba(99,102,241,0.34)] animate-float sm:bottom-[-19%] sm:right-[-3%] sm:w-[35%] md:bottom-[-22%] md:right-[2%] md:w-[30%]"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 px-6 pb-8 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <p className="font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">
              INSIDE THE APP
            </p>
          </div>
          <div className="grid items-end gap-8 md:grid-cols-2">
            <h2 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              Built for the
              <br />
              <span className="bg-gradient-to-r from-white/40 to-white bg-clip-text text-transparent">
                fastest fingers
              </span>{" "}
              on Solana.
            </h2>
            <p className="max-w-md text-base text-white/60 sm:text-lg md:justify-self-end">
              Every screen ships with the trader in mind - discover, ape, track and cash out without
              ever leaving the wallet.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mt-12 overflow-hidden py-16 md:py-24">
        <div className="relative mx-auto h-[58vw] min-h-[460px] max-h-[820px] w-full max-w-7xl overflow-visible [perspective:1400px]">
          <div className="relative h-full w-full overflow-visible [transform-style:preserve-3d] animate-phone-depth">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 z-10 block h-full w-full scale-[1.15] object-cover object-center"
            >
              <source src={PHONE_CLEAN} type="video/webm" />
              <source src={PHONE_CLEAN_FALLBACK} type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 px-6 pb-24 pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <p className="font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">THE FLOW</p>
          </div>
          <div className="mb-14 grid items-end gap-8 md:grid-cols-2">
            <h2 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              One wallet.
              <br />
              Every play.
            </h2>
            <p className="max-w-md text-base text-white/50 sm:text-lg md:justify-self-end">
              From the first deposit to the next launch - the entire trader loop, designed
              end-to-end.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                src: assetUrl(memecoin),
                title: "Catch early trends on X",
                step: "01 / HUNT",
                tagline: "Find the next memecoin.",
              },
              {
                src: assetUrl(buySell),
                title: "Buy & sell trending tokens",
                step: "02 / EXECUTE",
                tagline: "Buy & sell in one tap.",
              },
              {
                src: assetUrl(kol),
                title: "Follow KOL traders",
                step: "03 / COPY",
                tagline: "Mirror the winners.",
              },
              {
                src: assetUrl(portfolio),
                title: "Manage your assets",
                step: "04 / TRACK",
                tagline: "Watch the bags move.",
              },
              {
                src: assetUrl(launch),
                title: "Launch a memecoin from a tweet",
                step: "05 / LAUNCH",
                tagline: "Be early. Every time.",
              },
              {
                src: assetUrl(relaunch),
                title: "Relaunch a memecoin",
                step: "06 / ROTATE",
                tagline: "Recycle into the next.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group relative flex aspect-[16/10] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-sky-400 via-sky-500/80 to-black ring-1 ring-white/10"
              >
                <p className="relative z-10 pt-5 text-center text-sm font-semibold text-white sm:text-base">
                  {card.title}
                </p>
                <div className="relative mt-3 flex flex-1 items-end justify-center px-4 sm:px-6">
                  <img
                    src={card.src}
                    alt={card.title}
                    loading="lazy"
                    className="max-h-full w-full select-none object-contain object-bottom pointer-events-none"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6 z-10 sm:bottom-7 sm:left-8">
                  <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.3em] text-indigo-300 sm:text-xs">
                    {card.step}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                    {card.tagline}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 px-6 py-28">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">
            ON THE TIMELINE
          </p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            what chads are saying.
          </h2>
          <div className="mt-14 grid gap-5 text-left md:grid-cols-3">
            {[
              {
                quote: "switched from phantom and never looked back. fills are insane.",
                handle: "@solwhale",
              },
              {
                quote: "apple pay to SOL in 10 seconds. this should not be legal.",
                handle: "@degenmom",
              },
              {
                quote: "first wallet that does not make me feel like i am doing taxes.",
                handle: "@chartfrog",
              },
            ].map((item) => (
              <div
                key={item.handle}
                className="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.04] hover:ring-indigo-400/30"
              >
                <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                  &quot;{item.quote}&quot;
                </p>
                <p className="mt-6 font-mono text-xs text-white/40">{item.handle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 px-6 pb-12 pt-28 text-center">
        <p className="mb-5 font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">
          NOW AVAILABLE ON WEB & MOBILE
        </p>
        <h2 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          trade from anywhere.
          <br />
          never lose a beat.
        </h2>
        <div className="mt-10 flex items-center justify-center">
          <StoreBadges />
        </div>
      </section>

      <section className="relative flex items-center justify-center px-6 pb-20 pt-16 md:pb-32 md:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
        <div className="relative w-full max-w-[420px] animate-float sm:max-w-[520px] md:max-w-[600px]">
          <div className="relative rounded-[3.5rem] bg-black p-1.5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.08]">
            <div
              className="relative overflow-hidden rounded-[3rem] bg-black"
              style={{ aspectRatio: "9 / 19.3" }}
            >
              <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
              <video
                src={PHONE_VIDEO}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </section>

      <FAQSection />
      <TokenTicker items={tickerTwo} compact />

      <section
        className="relative w-full overflow-hidden bg-black leading-none"
        style={{ aspectRatio: "1254 / 525" }}
      >
        <img
          src={FOOTER_IMAGE}
          alt="Chad trader lying on a stack of cash, watching a Solana chart on his phone"
          className="absolute inset-0 block h-full w-full select-none object-cover object-[center_51%]"
        />
      </section>

      {showQr && <QRModal onClose={() => setShowQr(false)} />}
    </div>
  );
}
