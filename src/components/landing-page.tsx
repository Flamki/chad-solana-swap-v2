"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  Copy,
  Flame,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChadLogo } from "@/components/chad-logo";
import { SignInButton } from "@/components/sign-in-button";
import { TokenMarquee } from "@/components/token-marquee";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";
import { assetUrl } from "@/lib/asset-url";

import screenDeposit from "@/assets/app store/deposit.png";
import screenDiscover from "@/assets/app store/discover.png";
import screenKol from "@/assets/app store/kol.png";
import screenLaunch from "@/assets/app store/launch.png";
import screenPortfolio from "@/assets/app store/portfolio.png";
import screenSearch from "@/assets/app store/search.png";
import screenToken from "@/assets/app store/token.png";
import flowBuySell from "@/assets/flow/buy-sell-4.png";
import flowKol from "@/assets/flow/kol-4.png";
import flowLaunch from "@/assets/flow/launch-4.png";
import flowMeme from "@/assets/flow/memecoin-4.png";
import flowPortfolio from "@/assets/flow/portfolio-4.png";
import flowRelaunch from "@/assets/flow/relaunch-4.png";
import heroPosterImage from "@/assets/hero-astronaut.jpg";

const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const SOL_TRADE = "/trade/So11111111111111111111111111111111111111112";
const HERO_VIDEO = "/assets/video/astronaut-hero.mp4";
const PHONE_VIDEO = "/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm";
const PHONE_VIDEO_FALLBACK = "/assets/video/MAKE_VIDEO_NOT_IMAGE.mp4";
const CHAD_VIDEO = "/assets/video/chadwallet.mp4";
const STORE_BADGES = "/assets/landing/store-badges-v3-cropped.png";
const QR_CODE = "/assets/landing/qr-rounded.svg";
const PHONE_WALLET = "/assets/landing/phone-wallet.png";
const MONEY_1 = "/assets/landing/money-1.png";
const MONEY_2 = "/assets/landing/money-2.png";
const MONEY_3 = "/assets/landing/money-3.png";

const appScreens = [
  { image: screenKol, label: "leaderboard", title: "Find wallets already printing.", icon: Trophy },
  { image: screenDiscover, label: "feed", title: "Catch launches before they trend.", icon: Flame },
  { image: screenLaunch, label: "alerts", title: "Know what top traders buy.", icon: Bell },
  { image: screenDeposit, label: "fund", title: "Fund, buy, sell, rotate.", icon: Wallet },
];

const flowCards = [
  {
    image: flowMeme,
    step: "01 / hunt",
    title: "Find the next memecoin.",
    className: "md:col-span-2",
  },
  { image: flowBuySell, step: "02 / execute", title: "Buy and sell in one tap.", className: "" },
  { image: flowKol, step: "03 / copy", title: "Mirror the winners.", className: "" },
  { image: flowPortfolio, step: "04 / track", title: "Watch the bags move.", className: "" },
  { image: flowLaunch, step: "05 / launch", title: "Be first on every launch.", className: "" },
  {
    image: flowRelaunch,
    step: "06 / rotate",
    title: "Recycle into the next play.",
    className: "md:col-span-2",
  },
];

const rails = [
  {
    icon: Search,
    title: "Live token discovery",
    copy: "BirdEye powers trending lists, search, candles, holders, and trade tape.",
  },
  {
    icon: Zap,
    title: "Jupiter execution",
    copy: "Quotes are routed through Metis with slippage, route, fee, and latency surfaced.",
  },
  {
    icon: ShieldCheck,
    title: "Solana wallet native",
    copy: "Privy creates embedded Solana wallets while Alchemy keeps chain state fresh.",
  },
  {
    icon: Copy,
    title: "Copyable proof",
    copy: "Token addresses, wallet addresses, routes, and receipts are built for verification.",
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
        rel="noreferrer"
        className="absolute inset-y-0 left-0 w-1/2"
        aria-label="Download ChadWallet on the App Store"
      />
      <a
        href={ANDROID}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-y-0 right-0 w-1/2"
        aria-label="Get ChadWallet on Google Play"
      />
    </div>
  );
}

function PhoneShot({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={`rounded-[1.65rem] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.62)] ${className}`}
    />
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
      className="fixed inset-0 z-[100] grid place-items-center bg-black/82 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Download ChadWallet"
    >
      <div
        className="relative w-full max-w-[360px] rounded-[1.75rem] border border-white/10 bg-[#08090d] p-6 text-center shadow-[0_44px_120px_rgba(0,0,0,0.72)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
          aria-label="Close download modal"
        >
          <X className="h-5 w-5" />
        </button>
        <ChadLogo variant="dark" size="md" className="mx-auto justify-center" />
        <img
          src={QR_CODE}
          alt="QR code to download ChadWallet"
          className="mx-auto mt-6 w-full max-w-[260px] rounded-2xl bg-white p-3"
        />
        <p className="mt-5 text-sm leading-6 text-white/58">
          Scan the QR code on your phone to open ChadWallet in the app stores.
        </p>
      </div>
    </div>
  );
}

export function Landing() {
  useRevealOnScroll();

  const [showQr, setShowQr] = useState(false);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const heroFloatRef = useRef<HTMLDivElement | null>(null);
  const phoneStageRef = useRef<HTMLDivElement | null>(null);
  const phoneVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroPoster = assetUrl(heroPosterImage);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let raf = 0;

    const render = () => {
      raf = 0;

      if (reducedMotion.matches) {
        for (const node of [
          heroBgRef.current,
          heroVideoRef.current,
          heroCopyRef.current,
          heroFloatRef.current,
        ]) {
          if (node) node.style.transform = "translate3d(0,0,0) scale(1)";
        }
        if (heroCopyRef.current) heroCopyRef.current.style.opacity = "1";
        if (phoneStageRef.current) phoneStageRef.current.style.transform = "rotateX(0deg) scale(1)";
        if (phoneVideoRef.current)
          phoneVideoRef.current.style.transform = "translate3d(0,0,70px) scale(1.05)";
        return;
      }

      currentY += (targetY - currentY) * 0.12;
      const intensity = window.innerWidth < 768 ? 0.48 : 1;
      const progress = Math.min(currentY / 780, 1);

      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translate3d(0, ${currentY * 0.17 * intensity}px, 0) scale(${1.02 + progress * 0.06})`;
      }
      if (heroVideoRef.current) {
        heroVideoRef.current.style.transform = `translate3d(0, ${currentY * -0.025 * intensity}px, 0) scale(${1.02 + progress * 0.03})`;
      }
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = `translate3d(0, ${currentY * -0.075 * intensity}px, 0)`;
        heroCopyRef.current.style.opacity = `${1 - progress * 0.24}`;
      }
      if (heroFloatRef.current) {
        heroFloatRef.current.style.transform = `translate3d(0, ${currentY * -0.045 * intensity}px, 0) rotate(${progress * -1.4}deg)`;
      }
      if (phoneStageRef.current && phoneVideoRef.current) {
        const rect = phoneStageRef.current.getBoundingClientRect();
        const sceneProgress = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
        );
        const center = 1 - Math.min(1, Math.abs(sceneProgress - 0.5) * 2.1);
        phoneStageRef.current.style.transform = `rotateX(${(sceneProgress - 0.5) * -7}deg) translate3d(0, ${(sceneProgress - 0.5) * -22}px, 0) scale(${0.985 + center * 0.028})`;
        phoneVideoRef.current.style.transform = `translate3d(0, ${(sceneProgress - 0.5) * -4}%, ${50 + center * 65}px) scale(${1.03 + center * 0.13})`;
      }

      if (Math.abs(targetY - currentY) > 0.1) raf = requestAnimationFrame(render);
    };

    const requestRender = () => {
      targetY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(render);
    };

    requestRender();
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    reducedMotion.addEventListener("change", requestRender);

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestRender);
      reducedMotion.removeEventListener("change", requestRender);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="relative min-h-[88vh] overflow-hidden border-b border-white/10">
        <div ref={heroBgRef} className="pointer-events-none absolute inset-0 will-change-transform">
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO}
            poster={heroPoster}
            autoPlay
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover opacity-85 will-change-transform"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_23%,rgba(92,107,255,0.18),transparent_31%),linear-gradient(180deg,rgba(0,0,0,0.34),rgba(0,0,0,0.08)_38%,#050506_96%)]" />
        </div>

        <TokenMarquee />

        <header className="relative z-30 px-4 pt-4 sm:px-5">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <ChadLogo variant="dark" size="md" />
            <div className="flex items-center gap-2 sm:gap-3">
              <StoreBadges className="hidden sm:inline-flex" />
              <SignInButton redirectTo={SOL_TRADE} />
            </div>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-5 pb-20 pt-16 text-center sm:pt-20 md:min-h-[calc(88vh-8rem)] md:justify-center md:pt-8">
          <div ref={heroCopyRef} className="max-w-6xl will-change-transform">
            <h1 className="reveal text-[18vw] font-black leading-none tracking-tight text-white/94 drop-shadow-[0_0_80px_rgba(111,128,255,0.2)] sm:text-[8.5rem] md:text-[10.5rem] lg:text-[12rem]">
              ChadWallet
            </h1>
            <p className="reveal reveal-delay-1 mt-3 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              The fastest way to trade Solana.
            </p>
            <p className="reveal reveal-delay-2 mx-auto mt-4 max-w-2xl text-sm leading-6 text-blue-100/72 sm:text-base md:text-lg">
              Buy, sell, and copy-trade any token from viral launches to the wallets that print.
            </p>
            <div className="reveal reveal-delay-3 mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={SOL_TRADE}
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-bold text-black transition hover:scale-[1.02] hover:bg-white/90"
              >
                Start trading
              </Link>
              <button
                onClick={() => setShowQr(true)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[0.1]"
              >
                Get the app
              </button>
            </div>
          </div>

          <div
            ref={heroFloatRef}
            className="pointer-events-none relative mt-[-5rem] h-[220px] w-full max-w-4xl will-change-transform sm:mt-[-8rem] sm:h-[300px] md:mt-[-10rem]"
          >
            <div className="absolute left-1/2 top-1/2 h-[42%] w-[58%] -translate-x-1/2 rounded-[50%] bg-black/75 blur-3xl" />
            <img
              src={PHONE_WALLET}
              alt=""
              className="absolute left-[6%] top-[32%] hidden w-[20%] rotate-[-12deg] rounded-[2rem] opacity-92 shadow-[0_28px_80px_rgba(0,0,0,0.48)] md:block"
            />
            <div className="absolute right-[8%] top-[29%] hidden rounded-2xl border border-white/10 bg-black/58 p-3 text-left shadow-2xl backdrop-blur md:block">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                route
              </div>
              <div className="mt-1 text-sm font-bold">Jupiter Metis</div>
              <div className="font-mono text-[11px] text-emerald-300">382ms quote</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 px-5 py-20 sm:py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="reveal">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
              now available on web
            </p>
            <h2 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              trade from anywhere.
              <br />
              never lose a beat.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/58">
              Open a token on your phone, close the trade on desktop, and keep the same wallet,
              receipts, positions, and search flow in one place.
            </p>
            <div className="mt-8">
              <StoreBadges />
            </div>
          </div>

          <div className="reveal reveal-delay-2 relative min-h-[440px] [perspective:1400px]">
            <div className="absolute inset-x-[4%] top-[7%] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#05060a] p-3 shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
              <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/55">
                  <Search className="h-4 w-4" />
                  Search tokens, traders, or contract address
                </div>
                <span className="rounded-md bg-white/8 px-2 py-1 font-mono text-[10px] text-white/42">
                  /
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.38fr_0.62fr]">
                <div className="space-y-2">
                  {[
                    ["BONK", "+12.4%", "$0.000023"],
                    ["WIF", "-3.1%", "$1.57"],
                    ["JUP", "+8.9%", "$0.217"],
                    ["POPCAT", "+18.7%", "$0.42"],
                  ].map(([symbol, change, price]) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3"
                    >
                      <div>
                        <div className="text-sm font-bold">{symbol}</div>
                        <div className="font-mono text-[11px] text-white/42">{price}</div>
                      </div>
                      <div
                        className={`font-mono text-xs ${change.startsWith("+") ? "text-emerald-300" : "text-red-300"}`}
                      >
                        {change}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-white/8 bg-black">
                  <img
                    src={assetUrl(screenToken)}
                    alt="ChadWallet trading token screen"
                    className="absolute inset-0 h-full w-full object-cover object-top opacity-82"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                </div>
              </div>
            </div>
            <PhoneShot
              src={assetUrl(screenPortfolio)}
              alt="ChadWallet portfolio screen"
              className="absolute bottom-[-2%] right-[2%] w-[30%] rotate-[8deg]"
            />
            <PhoneShot
              src={assetUrl(screenSearch)}
              alt="ChadWallet search screen"
              className="absolute bottom-[3%] left-[1%] w-[26%] rotate-[-9deg]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-20 sm:py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="reveal grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
                inside the app
              </p>
              <h2 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl">
                Built for the
                <br />
                fastest fingers on Solana.
              </h2>
            </div>
            <p className="max-w-lg text-lg leading-8 text-white/55 md:justify-self-end">
              Every screen is designed for the trader loop: discover, ape, follow, fund, cash out,
              and rotate without leaving the wallet.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {appScreens.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className={`reveal reveal-delay-${(index % 4) + 1} group relative min-h-[500px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25`}
                >
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-400/14 text-indigo-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="relative z-10 mt-5 text-2xl font-black leading-tight">
                    {item.title}
                  </h3>
                  <img
                    src={assetUrl(item.image)}
                    alt={item.title}
                    loading="lazy"
                    className="absolute bottom-[-6%] left-1/2 w-[78%] -translate-x-1/2 rounded-[1.7rem] border border-white/10 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.55)] transition duration-700 group-hover:bottom-[-3%]"
                  />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-20 sm:py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="reveal">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
              mobile native
            </p>
            <h2 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl">
              a wallet that feels like a trading app.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/56">
              The phone video is not decoration. It shows the product motion: funding, discovery,
              token views, and the quick actions a Solana trader expects.
            </p>
          </div>

          <div
            ref={phoneStageRef}
            className="reveal reveal-delay-2 relative h-[440px] overflow-visible [perspective:1500px] will-change-transform sm:h-[540px] lg:h-[650px]"
          >
            <div className="absolute inset-x-[2%] top-[12%] bottom-[10%] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_42%,rgba(99,102,241,0.2),transparent_38%),linear-gradient(180deg,#0a0a0f,#020203)] shadow-[0_40px_130px_rgba(0,0,0,0.72)]">
              <div className="absolute inset-0 opacity-18 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
            </div>
            <img
              src={MONEY_1}
              alt=""
              className="pointer-events-none absolute left-[2%] top-[7%] z-0 w-[30%] rotate-[-14deg] opacity-45 blur-[1px]"
            />
            <img
              src={MONEY_2}
              alt=""
              className="pointer-events-none absolute bottom-[8%] right-[0%] z-0 w-[28%] rotate-[12deg] opacity-42 blur-[1px]"
            />
            <video
              ref={phoneVideoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="ChadWallet mobile trading experience"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain object-center will-change-transform"
            >
              <source src={PHONE_VIDEO} type="video/webm" />
              <source src={PHONE_VIDEO_FALLBACK} type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute bottom-[8%] left-1/2 z-10 h-10 w-[34%] -translate-x-1/2 rounded-[50%] bg-black/80 blur-2xl" />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-20 sm:py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="reveal grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
                the flow
              </p>
              <h2 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl">
                One wallet.
                <br />
                Every play.
              </h2>
            </div>
            <p className="max-w-lg text-lg leading-8 text-white/55 md:justify-self-end">
              From the first deposit to the next launch, ChadWallet makes the entire trader loop
              feel connected.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {flowCards.map((card, index) => (
              <article
                key={card.title}
                className={`reveal reveal-delay-${(index % 4) + 1} group relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-sky-400 via-sky-600/75 to-black shadow-2xl shadow-black/25 ${card.className}`}
              >
                <p className="relative z-10 pt-5 text-center text-sm font-semibold text-white/90">
                  {card.title}
                </p>
                <div className="absolute inset-x-5 bottom-0 top-12 flex items-end justify-center">
                  <img
                    src={assetUrl(card.image)}
                    alt={card.title}
                    loading="lazy"
                    className="max-h-full w-full object-contain object-bottom transition duration-700 group-hover:scale-[1.025]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/82 to-transparent" />
                <div className="absolute bottom-6 left-6 z-10 sm:left-8 sm:bottom-7">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-200">
                    {card.step}
                  </p>
                  <h3 className="max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                    {card.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-20 sm:py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
          <div className="reveal">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
              real market rails
            </p>
            <h2 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl">
              charts, quotes, wallets.
              <br />
              no fake theater.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/56">
              The trading page is powered by BirdEye, TradingView Lightweight Charts, Alchemy RPC,
              Jupiter routes, Supabase receipts, and Privy Solana wallets.
            </p>
          </div>
          <div className="reveal reveal-delay-2 grid gap-4 md:grid-cols-2">
            {rails.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-indigo-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/52">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="download"
        className="relative overflow-hidden border-b border-white/10 px-5 py-20 text-center sm:py-24 md:py-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.16),transparent_34%)]" />
        <div className="relative mx-auto max-w-5xl">
          <video
            src={CHAD_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className="reveal mx-auto mb-12 aspect-video w-full max-w-4xl rounded-[1.75rem] border border-white/10 object-cover shadow-2xl shadow-black/40"
          />
          <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-indigo-300">
            available on web and mobile
          </p>
          <h2 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl">
            trade like the timeline is watching.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={SOL_TRADE}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black transition hover:bg-white/90"
            >
              Start trading
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setShowQr(true)}
              className="inline-flex h-12 items-center rounded-full border border-white/15 bg-white/[0.06] px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[0.1]"
            >
              Get app QR
            </button>
            <StoreBadges />
          </div>
        </div>
      </section>

      <TokenMarquee reverse />

      <footer className="relative overflow-hidden px-5 py-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
          <ChadLogo variant="dark" size="md" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/42">
            <span>Copyright {new Date().getFullYear()} ChadWallet</span>
            <span>Solana native</span>
            <span>Privy / BirdEye / Jupiter / Alchemy / Supabase / Cloudflare</span>
          </div>
        </div>
        <img
          src={MONEY_3}
          alt=""
          className="pointer-events-none absolute bottom-[-42%] right-[3%] hidden w-[23rem] rotate-[10deg] opacity-20 blur-[1px] lg:block"
        />
      </footer>

      {showQr && <QRModal onClose={() => setShowQr(false)} />}
    </div>
  );
}
