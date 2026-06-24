"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
import flowBuySell from "@/assets/flow/buy-sell-4.png";
import flowKol from "@/assets/flow/kol-4.png";
import flowLaunch from "@/assets/flow/launch-4.png";
import flowMeme from "@/assets/flow/memecoin-4.png";
import flowPortfolio from "@/assets/flow/portfolio-4.png";
import flowRelaunch from "@/assets/flow/relaunch-4.png";
import heroAstronaut from "@/assets/hero-astronaut.jpg";

const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const HERO_VIDEO = "/assets/video/astronaut-hero.mp4";
const CHAD_VIDEO = "/assets/video/chadwallet.mp4";
const FEATURE_VIDEO = "/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm";
const FEATURE_VIDEO_FALLBACK = "/assets/video/MAKE_VIDEO_NOT_IMAGE.mp4";

export function Landing() {
  useRevealOnScroll();
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroAtmosphereRef = useRef<HTMLDivElement | null>(null);
  const heroCopyRef = useRef<HTMLElement | null>(null);
  const heroStatsRef = useRef<HTMLElement | null>(null);
  const featureAnchorRef = useRef<HTMLDivElement | null>(null);
  const featureFrameRef = useRef<HTMLDivElement | null>(null);
  const featureVideoRef = useRef<HTMLVideoElement | null>(null);
  const featureShadeRef = useRef<HTMLDivElement | null>(null);
  const featureShadowRef = useRef<HTMLDivElement | null>(null);
  const heroPoster = assetUrl(heroAstronaut);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let raf = 0;

    const resetMotion = () => {
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = "translate3d(0, 0, 0) scale(1)";
      }
      if (heroVideoRef.current) {
        heroVideoRef.current.style.transform = "translate3d(0, 0, 0) scale(1.025)";
      }
      if (heroAtmosphereRef.current) {
        heroAtmosphereRef.current.style.transform = "translate3d(0, 0, 0)";
        heroAtmosphereRef.current.style.opacity = "1";
      }
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = "translate3d(0, 0, 0) scale(1)";
        heroCopyRef.current.style.opacity = "1";
      }
      if (heroStatsRef.current) {
        heroStatsRef.current.style.transform = "translate3d(0, 0, 0)";
      }
      if (featureFrameRef.current) {
        featureFrameRef.current.style.transform = "rotateX(0deg) translate3d(0, 0, 0) scale(1)";
      }
      if (featureVideoRef.current) {
        featureVideoRef.current.style.transform = "translate3d(0, -2%, 120px) scale(1.72)";
      }
      if (featureShadeRef.current) {
        featureShadeRef.current.style.opacity = "1";
      }
      if (featureShadowRef.current) {
        featureShadowRef.current.style.transform = "translate3d(-50%, 0, 20px) scale(1)";
        featureShadowRef.current.style.opacity = "0.55";
      }
    };

    const renderMotion = () => {
      raf = 0;

      if (prefersReducedMotion.matches) {
        resetMotion();
        return;
      }

      currentY += (targetY - currentY) * 0.11;

      const intensity = window.innerWidth < 768 ? 0.68 : 1;
      const progress = Math.min(currentY / 720, 1);
      const depthScale = 1 + progress * 0.1 * intensity;

      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translate3d(0, ${currentY * 0.27 * intensity}px, 0) scale(${depthScale})`;
      }
      if (heroVideoRef.current) {
        const videoScale = 1.025 + progress * 0.012 * intensity;
        heroVideoRef.current.style.transform = `translate3d(0, ${currentY * -0.035 * intensity}px, 0) scale(${videoScale})`;
      }
      if (heroAtmosphereRef.current) {
        heroAtmosphereRef.current.style.transform = `translate3d(0, ${currentY * 0.08 * intensity}px, 0)`;
        heroAtmosphereRef.current.style.opacity = `${1 - progress * 0.22}`;
      }
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = `translate3d(0, ${currentY * -0.11 * intensity}px, 0) scale(${1 - progress * 0.025})`;
        heroCopyRef.current.style.opacity = `${1 - progress * 0.62}`;
      }
      if (heroStatsRef.current) {
        heroStatsRef.current.style.transform = `translate3d(0, ${currentY * -0.035 * intensity}px, 0)`;
      }
      if (featureAnchorRef.current && featureFrameRef.current && featureVideoRef.current) {
        const rect = featureAnchorRef.current.getBoundingClientRect();
        const featureProgress = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
        );
        const centeredProgress = featureProgress - 0.5;
        const featureIntensity = window.innerWidth < 768 ? 0.62 : 1;
        const centerFocus = 1 - Math.min(1, Math.abs(centeredProgress) * 2);
        const focusScale = 1.64 + centerFocus * 0.18 * featureIntensity;

        featureFrameRef.current.style.transform = `rotateX(${centeredProgress * -7 * featureIntensity}deg) translate3d(0, ${centeredProgress * -38 * featureIntensity}px, 0) scale(${0.985 + centerFocus * 0.025})`;
        featureVideoRef.current.style.transform = `translate3d(0, ${-2 + centeredProgress * -9 * featureIntensity}%, ${90 + centerFocus * 90 * featureIntensity}px) scale(${focusScale})`;

        if (featureShadeRef.current) {
          featureShadeRef.current.style.opacity = `${0.68 + centerFocus * 0.32}`;
        }
        if (featureShadowRef.current) {
          featureShadowRef.current.style.transform = `translate3d(-50%, ${centeredProgress * 24 * featureIntensity}px, 20px) scale(${0.88 + centerFocus * 0.24})`;
          featureShadowRef.current.style.opacity = `${0.32 + centerFocus * 0.32}`;
        }
      }

      if (Math.abs(targetY - currentY) > 0.1) {
        raf = requestAnimationFrame(renderMotion);
      }
    };

    const requestMotion = () => {
      targetY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(renderMotion);
    };

    const handleMotionPreference = () => {
      currentY = window.scrollY;
      targetY = window.scrollY;
      if (prefersReducedMotion.matches) {
        cancelAnimationFrame(raf);
        raf = 0;
        resetMotion();
      } else {
        requestMotion();
      }
    };

    requestMotion();
    window.addEventListener("scroll", requestMotion, { passive: true });
    window.addEventListener("resize", requestMotion, { passive: true });
    prefersReducedMotion.addEventListener("change", handleMotionPreference);

    return () => {
      window.removeEventListener("scroll", requestMotion);
      window.removeEventListener("resize", requestMotion);
      prefersReducedMotion.removeEventListener("change", handleMotionPreference);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============ HERO + STATS (shared scene) ============ */}
      <div className="relative overflow-hidden">
        {/* Space background — extends through stats */}
        <div
          ref={heroBgRef}
          className="pointer-events-none absolute inset-0 z-0 will-change-transform"
        >
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO}
            poster={heroPoster}
            preload="metadata"
            autoPlay
            muted
            playsInline
            style={{ backgroundImage: `url(${heroPoster})` }}
            aria-hidden
            className="absolute inset-0 h-full w-full bg-cover bg-center object-cover object-center will-change-transform"
          />
          <div ref={heroAtmosphereRef} className="absolute inset-0 will-change-transform">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[32rem] bg-gradient-to-b from-transparent to-background" />
          </div>
        </div>

        <TokenMarquee />

        <header className="relative z-40">
          <div className="flex h-20 w-full items-center justify-between px-4 sm:px-6">
            <ChadLogo variant="dark" size="lg" />
            <div className="ml-auto flex items-center justify-end gap-2">
              <AppStoreBadge
                variant="light"
                href={IOS}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex"
              />
              <PlayStoreBadge
                variant="light"
                href={ANDROID}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex"
              />
              <SignInButton redirectTo="/trade/So11111111111111111111111111111111111111112" />
            </div>
          </div>
        </header>

        {/* Hero copy */}
        <section
          ref={heroCopyRef}
          className="relative z-10 mx-auto max-w-3xl px-5 pt-24 pb-40 text-center will-change-transform"
        >
          <h1 className="reveal font-display text-7xl md:text-9xl font-semibold tracking-tight text-foreground/90">
            ChadWallet
          </h1>
          <p className="reveal reveal-delay-1 mt-8 text-2xl md:text-3xl font-medium">
            The fastest way to trade Solana.
          </p>
          <p className="reveal reveal-delay-2 mt-3 text-base text-muted-foreground">
            Buy, sell, and copy-trade any token — from viral launches to the wallets that print.
          </p>
          <div className="reveal reveal-delay-3 mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/trade/So11111111111111111111111111111111111111112"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              Start trading
            </Link>
            <a
              href="#download"
              className="rounded-lg border border-border bg-background/40 backdrop-blur px-6 py-3 text-sm font-semibold hover:bg-background/70 transition"
            >
              Get the app
            </a>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <section ref={heroStatsRef} className="relative px-5 py-24 will-change-transform">
          <div className="mx-auto max-w-5xl grid gap-12 sm:grid-cols-3 text-center">
            {[
              { k: "$2.4B+", v: "volume routed" },
              { k: "180k+", v: "chads onboarded" },
              { k: "<400ms", v: "median swap" },
            ].map((s, i) => (
              <div key={s.v} className={`reveal reveal-delay-${i + 1}`}>
                <div className="font-display text-5xl md:text-6xl font-semibold text-primary">
                  {s.k}
                </div>
                <div className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ============ ABOUT / MANIFESTO ============ */}
      <section className="relative border-t border-border/40 px-5 py-32 text-center">
        <div className="mx-auto max-w-3xl reveal">
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
            <span className="inline-block h-1 w-1 rounded-full bg-primary mr-2 align-middle" />
            about chadwallet
          </p>
          <h2 className="mt-8 font-display text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight">
            Hunt every
            <br />
            <span className="text-muted-foreground">memecoin.</span> Every chain.
            <br />
            One wallet.
          </h2>
          <p className="mt-8 text-lg md:text-xl text-foreground/70 leading-relaxed">
            ChadWallet is the trader-first wallet for people who actually print. Built to outrun the
            bots, copy the wallets that matter, and turn every fill into rewards.
          </p>
          <a
            href="#"
            className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition group"
          >
            Read the manifesto
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              v1.0 — live
            </span>
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </section>

      {/* ============ FEATURES — phone screenshots ============ */}
      <section className="relative border-t border-border/40 px-5 py-32 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-12 md:items-end reveal">
            <div className="md:col-span-7">
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
                <span className="inline-block h-1 w-1 rounded-full bg-primary mr-2 align-middle" />
                inside the app
              </p>
              <h2 className="mt-6 font-display text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight">
                Built for the
                <br />
                <span className="text-muted-foreground">fastest fingers</span> on Solana.
              </h2>
            </div>
            <p className="md:col-span-5 text-base md:text-lg text-foreground/70 leading-relaxed">
              Every screen ships with the trader in mind — discover, ape, track and cash out without
              ever leaving the wallet.
            </p>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-12">
            {/* Big left feature */}
            <article className="reveal md:col-span-7 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/[0.08] via-foreground/[0.03] to-transparent p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                    discover
                  </span>
                  <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                    Search anything.
                    <br />
                    Ape in seconds.
                  </h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Token, ticker, CA or wallet — surface the next move before the timeline does.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src={assetUrl(screenSearch)}
                    alt="Search any token"
                    className="mx-auto w-[220px] md:w-[260px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/20"
                  />
                </div>
              </div>
            </article>

            {/* Right tall portfolio */}
            <article className="reveal reveal-delay-1 md:col-span-5 group relative overflow-hidden rounded-3xl border border-border/50 bg-foreground/[0.03] p-8 md:p-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                portfolio
              </span>
              <h3 className="mt-4 font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
                Every bag.
                <br />
                One pane of glass.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Live PnL, holdings, history. Zero spreadsheet.
              </p>
              <div className="mt-6 flex justify-center">
                <img
                  src={assetUrl(screenPortfolio)}
                  alt="Portfolio"
                  className="w-[200px] md:w-[230px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/10"
                />
              </div>
            </article>

            <div
              ref={featureAnchorRef}
              className="reveal reveal-delay-1 md:col-span-12 md:-mx-10 xl:-mx-24 [perspective:1400px]"
            >
              <div
                ref={featureFrameRef}
                className="relative h-[520px] sm:h-[620px] lg:h-[720px] [transform-style:preserve-3d] will-change-transform"
              >
                <div className="absolute inset-x-[2%] top-[10%] bottom-[8%] overflow-hidden rounded-lg border border-border/70 bg-black shadow-2xl shadow-black">
                  <div
                    className="absolute inset-0 scale-110 bg-cover bg-center opacity-65"
                    style={{ backgroundImage: `url(${heroPoster})` }}
                  />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-primary/70 shadow-[0_0_28px_rgba(20,241,149,0.8)]" />
                </div>
                <video
                  ref={featureVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="ChadWallet trading, copy trading, and token launch experience"
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain object-center will-change-transform"
                >
                  <source src={FEATURE_VIDEO} type="video/webm" />
                  <source src={FEATURE_VIDEO_FALLBACK} type="video/mp4" />
                </video>
                <div
                  ref={featureShadeRef}
                  className="pointer-events-none absolute inset-x-[2%] top-[10%] bottom-[8%] z-10 rounded-lg shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] will-change-[opacity]"
                />
                <div
                  ref={featureShadowRef}
                  className="pointer-events-none absolute bottom-[4%] left-1/2 z-10 h-12 w-[34%] -translate-x-1/2 rounded-[50%] bg-black/80 blur-2xl will-change-transform"
                />
                <div className="pointer-events-none absolute inset-x-[7%] bottom-[7%] z-30 h-px bg-white/20" />
              </div>
            </div>

            {/* Deposit wide */}
            <article className="reveal md:col-span-12 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-foreground/[0.05] to-transparent p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                    funding
                  </span>
                  <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                    Apple Pay → SOL.
                    <br />
                    <span className="text-muted-foreground">No tutorial required.</span>
                  </h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
                    Top up with card, Apple Pay or transfer. Funds land trade-ready, not
                    bridge-ready.
                  </p>
                </div>
                <div className="flex justify-center md:justify-end">
                  <img
                    src={assetUrl(screenDeposit)}
                    alt="Deposit"
                    className="w-[220px] md:w-[260px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/20"
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ THE FLOW — editorial strip ============ */}
      <section className="relative border-t border-border/40 px-5 py-32">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6 reveal">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
                <span className="inline-block h-1 w-1 rounded-full bg-primary mr-2 align-middle" />
                the flow
              </p>
              <h2 className="mt-6 font-display text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight">
                One wallet.
                <br />
                Every play.
              </h2>
            </div>
            <p className="max-w-sm text-sm md:text-base text-muted-foreground">
              From the first deposit to the next launch — the entire trader loop, designed
              end-to-end.
            </p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {[
              { img: flowMeme, k: "01 — hunt", t: "Find the next memecoin." },
              { img: flowBuySell, k: "02 — execute", t: "Buy & sell in one tap." },
              { img: flowKol, k: "03 — copy", t: "Mirror the winners." },
              { img: flowPortfolio, k: "04 — track", t: "Watch the bags move." },
              { img: flowLaunch, k: "05 — launch", t: "Be early. Every time." },
              { img: flowRelaunch, k: "06 — rotate", t: "Recycle into the next." },
            ].map(({ img, k, t }, i) => (
              <article
                key={k}
                className={`reveal reveal-delay-${(i % 5) + 1} group relative overflow-hidden rounded-2xl border border-border/50 bg-foreground/[0.02]`}
              >
                <img
                  src={assetUrl(img)}
                  alt={t}
                  className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                    {k}
                  </span>
                  <h3 className="mt-2 font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
                    {t}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">
            on the timeline
          </p>
          <h2 className="reveal mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            what chads are saying.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                q: "switched from phantom and never looked back. fills are insane.",
                a: "@solwhale",
              },
              { q: "apple pay → SOL in 10 seconds. this shouldn't be legal.", a: "@degenmom" },
              {
                q: "first wallet that doesn't make me feel like i'm doing taxes.",
                a: "@chartfrog",
              },
            ].map((t, i) => (
              <figure
                key={t.a}
                className={`reveal reveal-delay-${i + 1} rounded-2xl border border-border/40 bg-background/40 p-6`}
              >
                <blockquote className="text-base">"{t.q}"</blockquote>
                <figcaption className="mt-4 text-sm text-muted-foreground">{t.a}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">
            faq
          </p>
          <h2 className="reveal mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            questions, briefly.
          </h2>
          <div className="reveal reveal-delay-1 mt-12 divide-y divide-border/40 border-y border-border/40">
            {[
              {
                q: "Is ChadWallet self-custody?",
                a: "Yes. Keys are generated and stored client-side via Privy. We never see them.",
              },
              {
                q: "Which chains do you support?",
                a: "Solana, with more rolling out. SPL tokens and Jupiter routing are first-class.",
              },
              {
                q: "Do I need a seed phrase?",
                a: "No. Sign in with Apple or Google. Export keys whenever you want.",
              },
              {
                q: "Fees?",
                a: "We pass through Jupiter and network fees. No swap markup on launch.",
              },
            ].map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
                  {f.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DOWNLOAD ============ */}
      <section
        id="download"
        className="relative border-t border-border/40 px-5 py-32 text-center overflow-hidden"
      >
        <div className="mx-auto max-w-5xl">
          <video
            src={CHAD_VIDEO}
            autoPlay
            muted
            loop
            preload="none"
            playsInline
            className="mx-auto mb-12 w-full max-w-3xl rounded-3xl border border-border/50 shadow-2xl shadow-primary/20"
          />
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
            Now available on web & mobile
          </p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-semibold tracking-tight">
            trade from anywhere.
            <br />
            never lose a beat.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <AppStoreBadge variant="light" href={IOS} target="_blank" rel="noreferrer" />
            <PlayStoreBadge variant="light" href={ANDROID} target="_blank" rel="noreferrer" />
          </div>
        </div>
      </section>

      {/* Bottom marquee */}
      <TokenMarquee reverse />

      <footer className="mx-auto max-w-7xl px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <ChadLogo variant="dark" size="md" />
        <div>© {new Date().getFullYear()} ChadWallet · Solana</div>
      </footer>
    </div>
  );
}
