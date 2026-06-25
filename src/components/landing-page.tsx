import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { DownloadAppButton } from "@/components/landing/download-app-button";
import { FAQSection } from "@/components/landing/faq-section";
import { LazyVideo } from "@/components/landing/lazy-video";
import { LazySignInButton } from "@/components/landing/lazy-sign-in-button";
import { MarketTicker } from "@/components/landing/market-ticker";

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
const HERO_BACKGROUND = "/assets/landing/hero-space-earth.png";
const HERO_CHARACTER = "/assets/landing/astronaut-hq.png";
const TRADING_DASHBOARD = "/assets/landing/trading-dashboard.png";
const PHONE_MOCKUP = "/assets/landing/phone-mockup.png";
const PHONE_CLEAN = "/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm";
const PHONE_CLEAN_FALLBACK = "/assets/video/MAKE_VIDEO_NOT_IMAGE.mp4";
const PHONE_VIDEO = "/assets/video/chadwallet.mp4";
const FOOTER_IMAGE = "/assets/landing/chad-footer.png";

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
    <div className="min-h-screen overflow-x-hidden bg-black font-[Inter,system-ui,sans-serif] text-white">
      <section className="relative min-h-[85vh] w-full overflow-hidden">
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

        <nav className="relative z-20 flex items-center justify-between px-4 pb-2 pt-3 md:px-5">
          <div className="-ml-1 flex items-center gap-2">
            <Image
              src={chadLogo}
              alt="ChadWallet logo"
              width={24}
              height={24}
              priority
              className="h-6 w-6 rounded-full bg-white object-contain ring-1 ring-white/10"
            />
            <span className="text-lg font-extrabold tracking-tight">ChadWallet</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <StoreBadges className="hidden sm:flex" />
            <LazySignInButton redirectTo={SOL_TRADE} />
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
            <DownloadAppButton />
          </div>

          <Image
            src={HERO_CHARACTER}
            alt="ChadWallet trader floating in space with a satellite"
            width={1254}
            height={1254}
            priority
            quality={80}
            sizes="(min-width: 768px) 840px, (min-width: 640px) 760px, 108vw"
            className="pointer-events-none mt-[-4.15rem] w-[min(680px,108vw)] max-w-none select-none animate-float sm:mt-[-6.65rem] sm:w-[min(760px,105%)] md:mt-[-8.15rem] md:w-[min(840px,100%)]"
          />
        </div>
      </section>

      <section className="landing-deferred relative px-6 pb-16 pt-2 md:pb-24 md:pt-4">
        <div className="relative -mt-16 md:-mt-24">
          <MarketTicker />
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
              className="pointer-events-none absolute bottom-[-17%] right-[-8%] z-10 w-[42%] max-w-[560px] select-none drop-shadow-[0_35px_70px_rgba(99,102,241,0.34)] animate-float sm:bottom-[-19%] sm:right-[-3%] sm:w-[35%] md:bottom-[-22%] md:right-[2%] md:w-[30%]"
            />
          </div>
        </div>
      </section>

      <section className="landing-deferred border-t border-white/5 px-6 pb-8 pt-24">
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

      <section className="landing-deferred relative mt-12 overflow-hidden py-16 md:py-24">
        <div className="relative mx-auto h-[58vw] min-h-[460px] max-h-[820px] w-full max-w-7xl overflow-visible [perspective:1400px]">
          <div className="relative h-full w-full overflow-visible [transform-style:preserve-3d] animate-phone-depth">
            <LazyVideo
              sources={[
                { src: PHONE_CLEAN, type: "video/webm" },
                { src: PHONE_CLEAN_FALLBACK, type: "video/mp4" },
              ]}
              className="absolute inset-0 z-10 block h-full w-full scale-[1.15] object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="landing-deferred relative border-t border-white/5 px-6 pb-24 pt-8">
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
                src: memecoin,
                title: "Catch early trends on X",
                step: "01 / HUNT",
                tagline: "Find the next memecoin.",
              },
              {
                src: buySell,
                title: "Buy & sell trending tokens",
                step: "02 / EXECUTE",
                tagline: "Buy & sell in one tap.",
              },
              {
                src: kol,
                title: "Follow KOL traders",
                step: "03 / COPY",
                tagline: "Mirror the winners.",
              },
              {
                src: portfolio,
                title: "Manage your assets",
                step: "04 / TRACK",
                tagline: "Watch the bags move.",
              },
              {
                src: launch,
                title: "Launch a memecoin from a tweet",
                step: "05 / LAUNCH",
                tagline: "Be early. Every time.",
              },
              {
                src: relaunch,
                title: "Relaunch a memecoin",
                step: "06 / ROTATE",
                tagline: "Recycle into the next.",
              },
            ].map(
              (card: { src: StaticImageData; title: string; step: string; tagline: string }) => (
                <div
                  key={card.title}
                  className="group relative flex aspect-[16/10] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-sky-400 via-sky-500/80 to-black ring-1 ring-white/10"
                >
                  <p className="relative z-10 pt-5 text-center text-sm font-semibold text-white sm:text-base">
                    {card.title}
                  </p>
                  <div className="relative mt-3 flex flex-1 items-end justify-center px-4 sm:px-6">
                    <Image
                      src={card.src}
                      alt={card.title}
                      fill
                      quality={70}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="pointer-events-none select-none object-contain object-bottom"
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
              ),
            )}
          </div>
        </div>
      </section>

      <section className="landing-deferred relative border-t border-white/5 px-6 py-28">
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

      <section className="landing-deferred relative border-t border-white/5 px-6 pb-12 pt-28 text-center">
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

      <section className="landing-deferred relative flex items-center justify-center px-6 pb-20 pt-16 md:pb-32 md:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
        <div className="relative w-full max-w-[420px] animate-float sm:max-w-[520px] md:max-w-[600px]">
          <div className="relative rounded-[3.5rem] bg-black p-1.5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.08]">
            <div
              className="relative overflow-hidden rounded-[3rem] bg-black"
              style={{ aspectRatio: "9 / 19.3" }}
            >
              <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
              <LazyVideo
                sources={[{ src: PHONE_VIDEO, type: "video/mp4" }]}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </section>

      <FAQSection />
      <MarketTicker compact reverse />

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
