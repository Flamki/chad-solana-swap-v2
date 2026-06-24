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
  Zap,
} from "lucide-react";
import { AppStoreBadge, PlayStoreBadge } from "@/components/store-badges";
import { ChadLogo } from "@/components/chad-logo";
import { SignInButton } from "@/components/sign-in-button";
import { TokenMarquee } from "@/components/token-marquee";
import { useEffect, useRef } from "react";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";
import { assetUrl } from "@/lib/asset-url";

import screenSearch from "@/assets/app store/search.png";
import screenPortfolio from "@/assets/app store/portfolio.png";
import screenDeposit from "@/assets/app store/deposit.png";
import screenDiscover from "@/assets/app store/discover.png";
import screenToken from "@/assets/app store/token.png";
import screenKol from "@/assets/app store/kol.png";
import screenLaunch from "@/assets/app store/launch.png";
import flowBuySell from "@/assets/flow/buy-sell-4.png";
import flowKol from "@/assets/flow/kol-4.png";
import flowLaunch from "@/assets/flow/launch-4.png";
import flowMeme from "@/assets/flow/memecoin-4.png";
import heroAstronaut from "@/assets/hero-astronaut.jpg";

const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const HERO_VIDEO = "/assets/video/astronaut-hero.mp4";
const CHAD_VIDEO = "/assets/video/chadwallet.mp4";
const FEATURE_VIDEO = "/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm";
const FEATURE_VIDEO_FALLBACK = "/assets/video/MAKE_VIDEO_NOT_IMAGE.mp4";
const SOL_TRADE = "/trade/So11111111111111111111111111111111111111112";

const stats = [
  { value: "sub-sec", label: "Jupiter quotes" },
  { value: "live", label: "BirdEye tokens" },
  { value: "Solana", label: "native wallet" },
];

const featureCards = [
  {
    label: "leaderboard",
    title: "Find the wallets already printing.",
    icon: Trophy,
    image: screenKol,
  },
  {
    label: "feed",
    title: "Catch launches before they trend.",
    icon: Flame,
    image: screenDiscover,
  },
  {
    label: "alerts",
    title: "Know what top traders buy in real time.",
    icon: Bell,
    image: screenLaunch,
  },
  {
    label: "one click",
    title: "Fund, buy, sell, and rotate faster.",
    icon: Wallet,
    image: screenDeposit,
  },
];

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
      className={`rounded-[2rem] border border-white/10 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.58)] ${className}`}
    />
  );
}

function MiniTradeTape() {
  const rows = [
    { token: "BONK", side: "buy", amount: "$18.4K", change: "+24.6%" },
    { token: "WIF", side: "sell", amount: "$7.2K", change: "-3.1%" },
    { token: "JUP", side: "buy", amount: "$42.0K", change: "+8.9%" },
  ];

  return (
    <div className="absolute -right-3 top-[18%] hidden w-56 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl md:block">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          live tape
        </span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.token}-${row.side}`} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">{row.token}</div>
              <div className="font-mono text-[10px] uppercase text-white/40">{row.side}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-white">{row.amount}</div>
              <div
                className={`font-mono text-[10px] ${row.change.startsWith("+") ? "text-emerald-300" : "text-red-300"}`}
              >
                {row.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  useRevealOnScroll();
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const heroPhonesRef = useRef<HTMLDivElement | null>(null);
  const productStageRef = useRef<HTMLDivElement | null>(null);
  const productVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroPoster = assetUrl(heroAstronaut);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let raf = 0;

    const resetMotion = () => {
      if (heroBgRef.current) heroBgRef.current.style.transform = "translate3d(0,0,0) scale(1)";
      if (heroVideoRef.current) heroVideoRef.current.style.transform = "scale(1.03)";
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = "translate3d(0,0,0)";
        heroCopyRef.current.style.opacity = "1";
      }
      if (heroPhonesRef.current) heroPhonesRef.current.style.transform = "translate3d(0,0,0)";
      if (productStageRef.current) {
        productStageRef.current.style.transform = "rotateX(0deg) translate3d(0,0,0) scale(1)";
      }
      if (productVideoRef.current) {
        productVideoRef.current.style.transform = "translate3d(0,0,68px) scale(1.08)";
      }
    };

    const renderMotion = () => {
      raf = 0;

      if (prefersReducedMotion.matches) {
        resetMotion();
        return;
      }

      currentY += (targetY - currentY) * 0.12;
      const intensity = window.innerWidth < 768 ? 0.55 : 1;
      const progress = Math.min(currentY / 780, 1);

      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translate3d(0, ${currentY * 0.18 * intensity}px, 0) scale(${1.04 + progress * 0.05})`;
      }
      if (heroVideoRef.current) {
        heroVideoRef.current.style.transform = `translate3d(0, ${currentY * -0.02 * intensity}px, 0) scale(${1.03 + progress * 0.02})`;
      }
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = `translate3d(0, ${currentY * -0.08 * intensity}px, 0)`;
        heroCopyRef.current.style.opacity = `${1 - progress * 0.3}`;
      }
      if (heroPhonesRef.current) {
        heroPhonesRef.current.style.transform = `translate3d(0, ${currentY * -0.045 * intensity}px, 0) rotate(${progress * -1.2}deg)`;
      }
      if (productStageRef.current && productVideoRef.current) {
        const rect = productStageRef.current.getBoundingClientRect();
        const sceneProgress = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
        );
        const center = 1 - Math.min(1, Math.abs(sceneProgress - 0.48) * 2.2);
        productStageRef.current.style.transform = `rotateX(${(sceneProgress - 0.5) * -5}deg) translate3d(0, ${(sceneProgress - 0.5) * -22}px, 0) scale(${0.985 + center * 0.025})`;
        productVideoRef.current.style.transform = `translate3d(0, ${(sceneProgress - 0.5) * -5}%, ${54 + center * 58}px) scale(${1.04 + center * 0.13})`;
      }

      if (Math.abs(targetY - currentY) > 0.1) raf = requestAnimationFrame(renderMotion);
    };

    const requestMotion = () => {
      targetY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(renderMotion);
    };

    requestMotion();
    window.addEventListener("scroll", requestMotion, { passive: true });
    window.addEventListener("resize", requestMotion, { passive: true });
    prefersReducedMotion.addEventListener("change", requestMotion);

    return () => {
      window.removeEventListener("scroll", requestMotion);
      window.removeEventListener("resize", requestMotion);
      prefersReducedMotion.removeEventListener("change", requestMotion);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative min-h-screen overflow-hidden border-b border-white/10">
        <div ref={heroBgRef} className="pointer-events-none absolute inset-0 will-change-transform">
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO}
            poster={heroPoster}
            preload="metadata"
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-cover bg-center object-cover opacity-55 will-change-transform"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(94,103,255,0.22),transparent_34%),linear-gradient(180deg,rgba(2,2,6,0.58),rgba(4,5,10,0.78)_48%,#050507_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
        </div>

        <TokenMarquee />

        <header className="relative z-40 px-4 pt-5 sm:px-6">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-[1.35rem] border border-white/10 bg-black/34 px-3 shadow-2xl shadow-black/35 backdrop-blur-xl sm:px-5">
            <ChadLogo variant="dark" size="md" />
            <div className="ml-auto flex items-center justify-end gap-2.5">
              <AppStoreBadge
                variant="light"
                href={IOS}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex scale-[0.88]"
              />
              <PlayStoreBadge
                variant="light"
                href={ANDROID}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex scale-[0.88]"
              />
              <SignInButton redirectTo={SOL_TRADE} />
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-8.25rem)] max-w-7xl gap-12 px-5 pb-20 pt-14 md:grid-cols-[0.94fr_1.06fr] md:items-center md:px-6 md:pt-8">
          <div ref={heroCopyRef} className="max-w-3xl will-change-transform">
            <div className="reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
              Social Solana trading app
            </div>
            <h1 className="reveal reveal-delay-1 mt-6 font-display text-[4.5rem] font-black leading-[0.82] tracking-tight text-white sm:text-[6rem] md:text-[7rem] lg:text-[8.5rem]">
              where traders become chads.
            </h1>
            <p className="reveal reveal-delay-2 mt-7 max-w-2xl text-lg font-medium leading-8 text-white/70 md:text-xl">
              Trade viral Solana tokens, copy wallets that print, and move from discovery to
              execution before the timeline catches up.
            </p>
            <div className="reveal reveal-delay-3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={SOL_TRADE}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:scale-[1.02] hover:bg-white/90"
              >
                Start trading
              </Link>
              <a
                href="#download"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[0.1]"
              >
                Download app
              </a>
            </div>
            <div className="reveal reveal-delay-4 mt-12 grid max-w-xl grid-cols-3 gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/28 p-4"
                >
                  <div className="font-display text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={heroPhonesRef} className="relative min-h-[520px] will-change-transform">
            <div className="absolute left-[12%] top-[10%] h-[72%] w-[68%] rounded-[3rem] bg-primary/20 blur-3xl" />
            <PhoneShot
              src={assetUrl(screenSearch)}
              alt="ChadWallet token search"
              priority
              className="absolute left-[7%] top-[18%] z-10 w-[42%] rotate-[-10deg] opacity-95"
            />
            <PhoneShot
              src={assetUrl(screenToken)}
              alt="ChadWallet token screen"
              priority
              className="absolute left-[29%] top-[4%] z-20 w-[47%]"
            />
            <PhoneShot
              src={assetUrl(screenPortfolio)}
              alt="ChadWallet portfolio screen"
              priority
              className="absolute right-[3%] top-[21%] z-10 w-[40%] rotate-[9deg] opacity-95"
            />
            <MiniTradeTape />
            <div className="absolute bottom-[8%] left-[11%] z-30 hidden rounded-2xl border border-white/10 bg-black/70 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Jupiter route locked</div>
                  <div className="font-mono text-[11px] text-white/40">metis - 382ms quote</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="relative border-b border-white/10 px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[0.92fr_1.08fr] md:items-center">
            <div className="reveal">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
                now available on web
              </p>
              <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
                trade from anywhere.
                <br />
                never lose a beat.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/58">
                Open a token on your phone, close the trade on desktop, and keep the same wallet,
                watchlist, receipts, and positions in one flow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <AppStoreBadge variant="dark" href={IOS} target="_blank" rel="noreferrer" />
                <PlayStoreBadge variant="dark" href={ANDROID} target="_blank" rel="noreferrer" />
              </div>
            </div>

            <div className="reveal reveal-delay-2 relative min-h-[420px]">
              <div className="absolute inset-x-[8%] top-[17%] h-[62%] rounded-[2.5rem] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.46)]" />
              <PhoneShot
                src={assetUrl(screenDiscover)}
                alt="Discover tokens"
                className="absolute left-[5%] top-[17%] w-[30%] rotate-[-8deg]"
              />
              <PhoneShot
                src={assetUrl(screenPortfolio)}
                alt="Portfolio"
                className="absolute left-[35%] top-[4%] z-10 w-[32%]"
              />
              <PhoneShot
                src={assetUrl(screenDeposit)}
                alt="Deposit"
                className="absolute right-[5%] top-[17%] w-[30%] rotate-[8deg]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
              never miss out again
            </p>
            <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
              the social-first trading app for Solana.
            </h2>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-4">
            {featureCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className={`reveal reveal-delay-${(index % 4) + 1} group relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20`}
                >
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/14 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="relative z-10 mt-5 font-display text-2xl font-black leading-tight text-white">
                    {item.title}
                  </h3>
                  <img
                    src={assetUrl(item.image)}
                    alt={item.title}
                    loading="lazy"
                    className="absolute bottom-[-7%] left-1/2 w-[76%] -translate-x-1/2 rounded-[2rem] border border-white/10 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.55)] transition duration-700 group-hover:bottom-[-4%]"
                  />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
            <div className="reveal">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
                real market rails
              </p>
              <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
                charts, quotes, wallets.
                <br />
                no fake theater.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/58">
                BirdEye feeds the market surface, Alchemy checks the chain, Jupiter routes the
                trade, and ChadWallet turns the signed swap into a receipt you can verify.
              </p>
            </div>

            <div className="reveal reveal-delay-2 grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: Search,
                  title: "Search any token",
                  copy: "Name, ticker, or contract address with live fallback routing.",
                },
                {
                  icon: Copy,
                  title: "Copy wallets",
                  copy: "Follow the traders already moving volume before the crowd.",
                },
                {
                  icon: ShieldCheck,
                  title: "Receipts on chain",
                  copy: "Signature, slot, route, wallet, and Solscan link after execution.",
                },
                {
                  icon: Sparkles,
                  title: "Edge fast market reads",
                  copy: "Cloudflare caches read-only market data while trades stay uncached.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-[1.6rem] border border-white/10 bg-black/28 p-6"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-xl font-black text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/52">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="reveal flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
                the trader loop
              </p>
              <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
                hunt.
                <br />
                execute.
                <br />
                rotate.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-white/55">
              A landing page should sell the product in seconds. These are the actual flows inside
              the wallet.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { img: flowMeme, eyebrow: "hunt", title: "Spot the new pair." },
              { img: flowBuySell, eyebrow: "execute", title: "Route through Jupiter." },
              { img: flowKol, eyebrow: "copy", title: "Follow the wallet." },
              { img: flowLaunch, eyebrow: "launch", title: "Be first on every launch." },
            ].map((item, index) => (
              <article
                key={item.title}
                className={`reveal reveal-delay-${(index % 4) + 1} group relative min-h-[360px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/30 ${index === 0 ? "md:col-span-2" : ""}`}
              >
                <img
                  src={assetUrl(item.img)}
                  alt={item.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-78 transition duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                    {item.eyebrow}
                  </span>
                  <h3 className="mt-2 font-display text-3xl font-black leading-tight text-white">
                    {item.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-white/10 px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="reveal">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
                mobile native
              </p>
              <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
                a wallet that feels like a trading app.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/58">
                Not a browser extension wearing a suit. ChadWallet is built around the behavior of
                token traders: fast search, fast funding, fast routes, and a clean profile.
              </p>
            </div>
            <div
              ref={productStageRef}
              className="reveal reveal-delay-2 relative h-[420px] overflow-visible [perspective:1400px] will-change-transform sm:h-[500px] lg:h-[580px]"
            >
              <div className="absolute inset-x-[4%] top-[12%] bottom-[9%] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_42%,rgba(99,102,241,0.2),transparent_38%),linear-gradient(180deg,#0a0a0f,#020203)] shadow-2xl shadow-black">
                <div className="absolute inset-0 opacity-18 [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:48px_48px]" />
              </div>
              <video
                ref={productVideoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="ChadWallet mobile trading experience"
                className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain object-center will-change-transform"
              >
                <source src={FEATURE_VIDEO} type="video/webm" />
                <source src={FEATURE_VIDEO_FALLBACK} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute bottom-[8%] left-1/2 z-10 h-10 w-[34%] -translate-x-1/2 rounded-[50%] bg-black/80 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="download"
        className="relative overflow-hidden border-b border-white/10 px-5 py-24 text-center md:py-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.16),transparent_34%)]" />
        <div className="relative mx-auto max-w-5xl">
          <video
            src={CHAD_VIDEO}
            autoPlay
            muted
            loop
            preload="none"
            playsInline
            className="reveal mx-auto mb-12 aspect-video w-full max-w-4xl rounded-[2rem] border border-white/10 object-cover shadow-2xl shadow-black/40"
          />
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">
            available on web and mobile
          </p>
          <h2 className="mt-5 font-display text-5xl font-black leading-[0.9] tracking-tight text-white md:text-7xl">
            trade like the timeline is watching.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={SOL_TRADE}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:bg-white/90"
            >
              Start trading
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <AppStoreBadge variant="dark" href={IOS} target="_blank" rel="noreferrer" />
            <PlayStoreBadge variant="dark" href={ANDROID} target="_blank" rel="noreferrer" />
          </div>
        </div>
      </section>

      <TokenMarquee reverse />

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-8 text-xs text-muted-foreground">
        <ChadLogo variant="dark" size="md" />
        <div className="flex flex-wrap items-center gap-4">
          <span>© {new Date().getFullYear()} ChadWallet</span>
          <span>Solana native</span>
          <span>Powered by Privy, BirdEye, Jupiter, Alchemy</span>
        </div>
      </footer>
    </div>
  );
}
