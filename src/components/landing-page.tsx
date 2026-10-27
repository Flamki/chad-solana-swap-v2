import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { BrandName } from "@/components/brand-name";
import { CinematicScene } from "@/components/landing/cinematic-scene";
import { DownloadAppButton } from "@/components/landing/download-app-button";
import { LazySignInButton } from "@/components/landing/lazy-sign-in-button";
import { StoreBadges } from "@/components/landing/store-badges";
import { TrendingCoinTicker } from "@/components/landing/trending-coin-ticker";
import { BRAND } from "@/lib/brand";

const SOL_TRADE = BRAND.tradeHref;
const HERO_BACKGROUND = "/assets/landing/hero-space-earth.png";
const TRADING_DASHBOARD = "/assets/landing/trading-dashboard.png";
const PHONE_MOCKUP = "/assets/landing/phone-mockup.png";
const FOOTER_IMAGE = BRAND.footer;
const FEATURE_LEADERBOARD = "/assets/landing/features/leaderboard.webp";
const FEATURE_SOCIAL = "/assets/landing/features/social-static.webp";
const FEATURE_ALERTS = "/assets/landing/features/alerts-static.webp";
const FEATURE_APPLE_PAY = "/assets/landing/features/apple-pay-static.webp";

type FeatureCardProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  visualClassName?: string;
};

function FeatureCard({
  eyebrow,
  title,
  children,
  className = "",
  visualClassName = "",
}: FeatureCardProps) {
  return (
    <article
      className={`relative flex aspect-[1/1] min-h-[440px] flex-col overflow-hidden rounded-[25px] border border-white/[0.06] bg-[#12111a] px-7 pb-0 pt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-9 lg:min-h-[478px] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#151420] via-[#101018]/75 to-transparent" />
      <p className="relative z-10 font-mono text-[13px] font-bold uppercase tracking-[0.17em] text-[#5f7cff] sm:text-[14px]">
        {eyebrow}
      </p>
      <h3 className="relative z-10 mt-5 max-w-[430px] text-[clamp(2rem,2.25vw,2.62rem)] font-bold leading-[1.08] text-white">
        {title}
      </h3>
      <div
        className={`absolute inset-x-0 bottom-0 z-0 flex h-[56%] items-end justify-center ${visualClassName}`}
      >
        {children}
      </div>
    </article>
  );
}

function FeatureImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={780}
      quality={80}
      sizes="(min-width: 1280px) 31vw, (min-width: 768px) 46vw, 92vw"
      className={`pointer-events-none select-none object-contain ${className}`}
    />
  );
}

function AssetsVisual() {
  return (
    <div className="relative mb-[-54px] h-[285px] w-full">
      <div className="absolute left-[16%] top-[18%] h-24 w-56 -rotate-12 rounded-[18px] border border-white/30 bg-gradient-to-br from-cyan-100 via-sky-500 to-violet-600 opacity-95 shadow-[0_0_46px_rgba(85,160,255,0.45)]" />
      <div className="absolute left-[23%] top-[39%] h-20 w-48 -rotate-12 rounded-[16px] border border-white/25 bg-gradient-to-br from-white via-cyan-300 to-violet-500 opacity-90 shadow-[0_0_34px_rgba(137,92,246,0.35)]" />
      <div className="absolute right-[18%] top-[12%] h-44 w-44 rotate-6 rounded-[30px] border border-white/35 bg-gradient-to-br from-cyan-200 via-blue-500 to-violet-700 opacity-95 shadow-[0_0_58px_rgba(59,130,246,0.45)]" />
      <div className="absolute bottom-[-8%] left-[30%] h-24 w-32 rotate-12 rounded-[20px] bg-gradient-to-br from-amber-200 via-amber-500 to-orange-700 opacity-90 shadow-[0_0_38px_rgba(251,191,36,0.28)]" />
      <div className="absolute bottom-[-13%] right-[28%] h-36 w-36 -rotate-12 rounded-[28px] border border-white/30 bg-gradient-to-br from-white via-violet-300 to-indigo-700 opacity-95 shadow-[0_0_50px_rgba(168,85,247,0.45)]" />
    </div>
  );
}

function SignInVisual() {
  return (
    <div className="relative mb-8 flex w-[82%] max-w-[408px] flex-col gap-3">
      <div className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-white text-lg font-bold text-black shadow-[0_16px_44px_rgba(255,255,255,0.13)]">
        <span className="text-xl">Apple</span>
        <span>Sign in with Apple</span>
      </div>
      <div className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#151515] text-lg font-bold text-white shadow-[0_16px_44px_rgba(59,130,246,0.16)]">
        <span className="text-xl text-[#4285f4]">G</span>
        <span>Sign in with Google</span>
      </div>
      <div className="pointer-events-none absolute -bottom-28 right-[24%] h-44 w-14 rounded-t-full bg-gradient-to-b from-[#ffd7ca] via-[#e7a18e] to-[#9a574c] shadow-[0_-18px_50px_rgba(255,210,190,0.18)]" />
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="soll-hero relative w-full overflow-hidden">
        <div className="soll-hero-backdrop">
          <Image
            src={HERO_BACKGROUND}
            alt=""
            fill
            priority
            fetchPriority="high"
            quality={80}
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />

        <nav className="relative z-20 flex items-center justify-between px-4 pb-2 pt-3 md:px-6 md:pt-4">
          <Link href="/" aria-label="soll home" className="py-2">
            <BrandName size="lg" showTagline={false} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <StoreBadges className="hidden sm:flex" />
            <LazySignInButton redirectTo={SOL_TRADE} preferTrending />
          </div>
        </nav>

        <div className="soll-hero-copy relative z-20 mx-auto flex max-w-6xl flex-col items-center px-6 pt-12 text-center md:pt-16">
          <h1 className="soll-wordmark">{BRAND.name}</h1>
          <p className="mt-5 text-xl font-semibold sm:text-2xl md:text-3xl">
            The fastest way to trade Solana.
          </p>
          <p className="mt-3 max-w-xl text-xs text-blue-200/70 sm:text-sm">
            Trade SOL and USDC. Your next move starts here.
          </p>

          <div className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-3">
            <DownloadAppButton />
            <div className="soll-cta-primary">
              <LazySignInButton redirectTo={SOL_TRADE} preferTrending label="Start trading" />
            </div>
          </div>
        </div>
        <CinematicScene />
      </section>

      <section className="landing-deferred relative select-none overflow-hidden px-6 pb-10 pt-4 md:pb-16 md:pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_75%,rgba(76,70,220,0.25),transparent_58%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-indigo-400">
            NOW AVAILABLE ON WEB
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            trade on the web.
            <br />
            never lose a beat.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-200/70">
            Explore markets and trade SOL and USDC from your desktop.
          </p>

          <div className="relative mt-8 md:mt-10">
            <div className="pointer-events-none absolute -inset-x-[8%] -bottom-[12%] top-[10%] rounded-full bg-indigo-600/30 blur-[100px]" />
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#06070b] shadow-[0_38px_120px_rgba(0,0,0,0.68)]">
              <div className="flex h-14 items-center border-b border-white/10 px-5 text-xl font-bold tracking-tight text-white sm:px-7">
                {BRAND.name}
                <span className="ml-auto hidden rounded-full border border-white/10 px-4 py-1.5 text-xs font-normal text-white/40 sm:block">
                  Web trading preview
                </span>
              </div>
              <div className="relative aspect-[1535/630] overflow-hidden">
                <Image
                  src={TRADING_DASHBOARD}
                  alt="Preview of a Solana trading dashboard with charts, tokens, and a swap panel"
                  width={1535}
                  height={700}
                  quality={75}
                  sizes="(min-width: 1280px) 1152px, 92vw"
                  className="absolute bottom-0 left-0 w-full max-w-none"
                />
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-[-5%] right-[-8%] z-20 w-[42%] max-w-[460px] animate-float sm:right-[-3%] sm:w-[35%] md:bottom-[-7%] md:right-[-3%] md:w-[30%]">
              <Image
                src={PHONE_MOCKUP}
                alt="Illustrative mobile trading preview"
                width={1167}
                height={1347}
                quality={75}
                sizes="(min-width: 768px) 30vw, 42vw"
                className="w-full select-none drop-shadow-[0_35px_70px_rgba(99,102,241,0.5)]"
              />
              <span className="absolute bottom-[5%] right-[3%] rounded-full border border-white/20 bg-[#0a0b18]/75 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-xl sm:text-[10px]">
                Mobile coming soon
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-deferred relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-[-24%] top-[24%] bottom-[-8rem] bg-[radial-gradient(ellipse_at_center,rgba(73,72,210,0.2)_0%,rgba(18,16,58,0.18)_42%,rgba(0,0,0,0)_78%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[64%] h-[36rem] w-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-700/18 blur-[130px]" />

        <section className="relative z-10 mx-auto max-w-7xl px-6 pb-8 pt-16 md:pb-12 md:pt-24">
          <div className="grid items-end gap-6 border-t border-white/10 pt-8 md:grid-cols-2 md:gap-12 md:pt-12">
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.25em] text-indigo-400">
                BUILT FOR THE MOMENT
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                The market moves fast.
                <span className="block text-white/45">Stay in your element.</span>
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-white/60 sm:text-lg md:justify-self-end">
              Discover opportunities, follow the market, and make your next move with soll.
            </p>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          <div className="mx-auto grid max-w-[1644px] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard eyebrow="LEADERBOARD" title="become a legend, top the leaderboard">
              <FeatureImage
                src={FEATURE_LEADERBOARD}
                alt="soll leaderboard preview"
                className="h-full w-full object-cover object-bottom opacity-95"
              />
            </FeatureCard>

            <FeatureCard
              eyebrow="SOCIAL FEED"
              title="discover and follow top traders"
              visualClassName="h-[66%]"
            >
              <FeatureImage
                src={FEATURE_SOCIAL}
                alt="soll social feed preview"
                className="h-full w-[102%] object-contain object-bottom opacity-95"
              />
            </FeatureCard>

            <FeatureCard
              eyebrow="ALERTS"
              title="real time notifications for what the best are buying"
              visualClassName="items-center px-0 pb-10"
            >
              <FeatureImage
                src={FEATURE_ALERTS}
                alt="soll alert notification preview"
                className="h-auto w-[112%] max-w-none object-contain opacity-95"
              />
            </FeatureCard>

            <FeatureCard eyebrow="APPLE PAY" title="deposit instantly with apple pay">
              <FeatureImage
                src={FEATURE_APPLE_PAY}
                alt="soll Apple Pay deposit preview"
                className="h-full w-full object-cover object-bottom opacity-90"
              />
            </FeatureCard>

            <FeatureCard eyebrow="ASSETS" title="track your full portfolio at a glance">
              <AssetsVisual />
            </FeatureCard>

            <FeatureCard
              eyebrow="SIGN IN"
              title="get started in seconds, no seed phrase"
              visualClassName="items-end"
            >
              <SignInVisual />
            </FeatureCard>
          </div>
        </section>
      </div>

      <section className="landing-deferred relative px-6 pb-8 pt-8 text-center md:pt-10">
        <p className="mb-4 font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">
          ON WEB NOW. MOBILE COMING SOON.
        </p>
        <h2 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          trade on the web.
          <br />
          stay in the moment.
        </h2>
        <div className="mt-7 flex items-center justify-center">
          <StoreBadges />
        </div>
      </section>

      <TrendingCoinTicker />

      <section className="soll-outro landing-deferred" aria-label="soll astronaut in space">
        <div className="soll-outro-halo" aria-hidden="true" />
        <div className="soll-outro-orbit soll-outro-orbit-one" aria-hidden="true" />
        <div className="soll-outro-orbit soll-outro-orbit-two" aria-hidden="true" />
        <div className="soll-outro-word" aria-hidden="true">
          {BRAND.name}
        </div>
        <Image
          src={FOOTER_IMAGE}
          alt="soll astronaut sitting on a floating asteroid with a tablet"
          width={1536}
          height={1024}
          quality={80}
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="soll-outro-astronaut"
        />
      </section>
    </div>
  );
}
