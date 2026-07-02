import type { ReactNode } from "react";
import Image from "next/image";

import { DownloadAppButton } from "@/components/landing/download-app-button";
import { LazyVideo } from "@/components/landing/lazy-video";
import { LazySignInButton } from "@/components/landing/lazy-sign-in-button";
import { TrendingCoinTicker } from "@/components/landing/trending-coin-ticker";
import { SOL_TOKEN_PATH } from "@/lib/routes";

import chadLogo from "@/assets/logo/dark.png";

const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const STORE_BADGES = "/assets/landing/store-badges-v3-cropped.png";
const HERO_BACKGROUND = "/assets/landing/hero-space-earth.png";
const HERO_CHARACTER = "/assets/landing/astronaut-hq.png";
const TRADING_DASHBOARD = "/assets/landing/trading-dashboard.png";
const PHONE_MOCKUP = "/assets/landing/phone-mockup.png";
const PHONE_VIDEO = "/assets/video/chadwallet.mp4";
const FOOTER_IMAGE = "/assets/landing/chad-footer.png";
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
      quality={90}
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

function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Image
        src={STORE_BADGES}
        alt="Download ChadWallet on the App Store and Google Play"
        width={1482}
        height={264}
        sizes="296px"
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

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="relative min-h-[72vh] w-full overflow-hidden md:min-h-[76vh]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />

        <nav className="relative z-20 flex items-center justify-between px-4 pb-2 pt-3 md:px-6 md:pt-4">
          <div className="-ml-1 flex items-center gap-2.5 sm:gap-3">
            <Image
              src={chadLogo}
              alt="ChadWallet logo"
              width={40}
              height={40}
              priority
              className="h-9 w-9 rounded-full bg-white object-contain ring-1 ring-white/10 sm:h-10 sm:w-10"
            />
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">ChadWallet</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <StoreBadges className="hidden sm:flex" />
            <LazySignInButton redirectTo={SOL_TOKEN_PATH} preferTrending />
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-4 pt-12 text-center md:pb-6 md:pt-16">
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
            <LazySignInButton
              redirectTo={SOL_TOKEN_PATH}
              preferTrending
              label="Start trading"
              className="bg-white/[0.03] px-7 py-2.5 font-semibold ring-white/[0.12] hover:bg-white/[0.07]"
            />
            <DownloadAppButton />
          </div>

          <Image
            src={HERO_CHARACTER}
            alt="ChadWallet trader floating in space with a satellite"
            width={1254}
            height={1254}
            priority
            quality={80}
            sizes="(min-width: 768px) 700px, (min-width: 640px) 640px, 96vw"
            className="pointer-events-none mt-[-3rem] w-[min(560px,96vw)] max-w-none select-none animate-float sm:mt-[-4.75rem] sm:w-[min(640px,88%)] md:mt-[-6rem] md:w-[min(700px,82%)]"
          />
        </div>
      </section>

      <section className="landing-deferred relative -mt-10 select-none px-6 pb-2 pt-0 md:-mt-16 md:pb-4">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-indigo-400">
            NOW AVAILABLE ON WEB
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            trade from anywhere.
            <br />
            never lose a beat.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-200/70">
            Open a trade on your phone, close it on your desktop - all in one app.
          </p>

          <div className="relative mt-8 md:mt-10">
            <div className="absolute inset-x-[8%] bottom-[4%] top-[8%] rounded-full bg-indigo-600/18 blur-3xl" />
            <Image
              src={TRADING_DASHBOARD}
              alt="ChadWallet web trading dashboard with live charts, token list, and swap panel"
              width={1535}
              height={700}
              quality={75}
              sizes="(min-width: 1280px) 1152px, 92vw"
              className="relative mx-auto w-full max-w-[1536px] rounded-xl border border-white/10 shadow-[0_38px_120px_rgba(0,0,0,0.68)]"
            />
            <Image
              src={PHONE_MOCKUP}
              alt="ChadWallet mobile app showing trending tokens"
              width={1167}
              height={1347}
              quality={75}
              sizes="(min-width: 768px) 30vw, 42vw"
              className="pointer-events-none absolute bottom-[2%] right-[-8%] z-20 w-[42%] max-w-[560px] select-none drop-shadow-[0_35px_70px_rgba(99,102,241,0.34)] animate-float sm:bottom-[1%] sm:right-[-3%] sm:w-[35%] md:bottom-0 md:right-[2%] md:w-[30%]"
            />
          </div>
        </div>
      </section>

      <div className="landing-deferred relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-[-24%] top-[24%] bottom-[-8rem] bg-[radial-gradient(ellipse_at_center,rgba(73,72,210,0.2)_0%,rgba(18,16,58,0.18)_42%,rgba(0,0,0,0)_78%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[64%] h-[36rem] w-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-700/18 blur-[130px]" />

        <section className="relative z-10 px-6 pb-3 pt-8 md:pt-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">
                INSIDE THE APP
              </p>
            </div>
            <div className="grid items-end gap-5 md:grid-cols-2">
              <h2 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
                Built for the
                <br />
                <span className="bg-gradient-to-r from-white/40 to-white bg-clip-text text-transparent">
                  fastest fingers
                </span>{" "}
                on Solana.
              </h2>
              <p className="max-w-md text-base text-white/60 sm:text-lg md:justify-self-end">
                Every screen ships with the trader in mind - discover, ape, track and cash out
                without ever leaving the wallet.
              </p>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 flex items-center justify-center bg-transparent px-6 pb-6 pt-14 md:-mt-10 md:pb-8 md:pt-16">
          <div className="relative w-full max-w-[290px] animate-float sm:max-w-[320px] md:max-w-[350px]">
            <div className="absolute inset-x-6 -bottom-10 h-16 rounded-full bg-black/80 blur-2xl" />
            <div className="absolute -inset-8 rounded-[4.5rem] bg-gradient-to-b from-indigo-500/22 via-blue-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-[4.15rem] bg-gradient-to-br from-[#3b3d45] via-[#050507] to-[#242832] p-[10px] shadow-[0_42px_120px_rgba(0,0,0,0.78),0_0_90px_rgba(82,92,255,0.28)] ring-1 ring-white/[0.18]">
              <div className="absolute -left-[5px] top-[18%] h-14 w-[5px] rounded-l-full bg-gradient-to-b from-[#6c7078] to-[#17191f]" />
              <div className="absolute -left-[5px] top-[31%] h-10 w-[5px] rounded-l-full bg-gradient-to-b from-[#6c7078] to-[#17191f]" />
              <div className="absolute -right-[5px] top-[25%] h-20 w-[5px] rounded-r-full bg-gradient-to-b from-[#6c7078] to-[#17191f]" />

              <div className="relative rounded-[3.65rem] bg-[#07080d] p-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_16px_28px_rgba(255,255,255,0.08)]">
                <div
                  className="relative overflow-hidden rounded-[3.2rem] bg-[#0a0c12]"
                  style={{ aspectRatio: "9 / 19.3" }}
                >
                  <LazyVideo
                    sources={[{ src: PHONE_VIDEO, type: "video/mp4" }]}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_18%,rgba(255,255,255,0)_42%)] mix-blend-screen" />
                  <div className="absolute left-1/2 top-3 z-30 h-8 w-28 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_1px_8px_rgba(0,0,0,0.55)]" />
                  <div className="absolute bottom-3 left-1/2 z-30 h-1.5 w-32 -translate-x-1/2 rounded-full bg-white/55 shadow-[0_1px_8px_rgba(0,0,0,0.45)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          <div className="mx-auto grid max-w-[1644px] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard eyebrow="LEADERBOARD" title="become a legend, top the leaderboard">
              <FeatureImage
                src={FEATURE_LEADERBOARD}
                alt="ChadWallet leaderboard preview"
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
                alt="ChadWallet social feed preview"
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
                alt="ChadWallet alert notification preview"
                className="h-auto w-[112%] max-w-none object-contain opacity-95"
              />
            </FeatureCard>

            <FeatureCard eyebrow="APPLE PAY" title="deposit instantly with apple pay">
              <FeatureImage
                src={FEATURE_APPLE_PAY}
                alt="ChadWallet Apple Pay deposit preview"
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
          NOW AVAILABLE ON WEB & MOBILE
        </p>
        <h2 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          trade from anywhere.
          <br />
          never lose a beat.
        </h2>
        <div className="mt-7 flex items-center justify-center">
          <StoreBadges />
        </div>
      </section>

      <TrendingCoinTicker />

      <section
        className="landing-deferred relative w-full overflow-hidden bg-black leading-none"
        style={{ aspectRatio: "1254 / 525" }}
      >
        <Image
          src={FOOTER_IMAGE}
          alt="Chad trader lying on a stack of cash, watching a Solana chart on his phone"
          fill
          quality={75}
          sizes="100vw"
          className="absolute inset-0 block h-full w-full select-none object-cover object-[center_51%]"
        />
      </section>
    </div>
  );
}
