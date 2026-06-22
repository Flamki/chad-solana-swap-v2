import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Play, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/hero-astronaut.jpg";
import { ChadLogo } from "@/components/chad-logo";
import { TokenMarquee } from "@/components/token-marquee";
import screenSearch from "@/assets/app store/search.png";
import screenToken from "@/assets/app store/token.png";
import screenPortfolio from "@/assets/app store/portfolio.png";
import screenKol from "@/assets/app store/kol.png";
import screenLaunch from "@/assets/app store/launch.png";
import screenDeposit from "@/assets/app store/deposit.png";
import flowBuySell from "@/assets/flow/buy-sell-4.png";
import flowKol from "@/assets/flow/kol-4.png";
import flowLaunch from "@/assets/flow/launch-4.png";
import flowMeme from "@/assets/flow/memecoin-4.png";
import flowPortfolio from "@/assets/flow/portfolio-4.png";
import flowRelaunch from "@/assets/flow/relaunch-4.png";
import chadVideo from "@/assets/video/chadwallet.mp4";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChadWallet — Trade Solana Like a Chad" },
      { name: "description", content: "The Solana wallet for traders. Buy, sell, and ape any token in seconds. Apple Pay, gasless, social-first." },
      { property: "og:title", content: "ChadWallet — Trade Solana Like a Chad" },
      { property: "og:description", content: "The Solana wallet for traders. Buy, sell, and ape any token in seconds." },
    ],
  }),
  component: Landing,
});

const ANDROID = "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";
const IOS = "https://apps.apple.com/us/app/chadwallet/id6757367474";

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============ HERO + STATS (shared scene) ============ */}
      <div className="relative overflow-hidden">
        {/* Space background — extends through stats */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={heroImg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[32rem] bg-gradient-to-b from-transparent to-background" />
        </div>

        <TokenMarquee />

        <header className="relative z-40">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <ChadLogo variant="dark" size="lg" />
          <div className="flex items-center gap-2">
            <a href={IOS} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 backdrop-blur px-3 py-1.5 hover:bg-background/70 transition">
              <Apple className="h-4 w-4" />
              <div className="text-left leading-tight">
                <div className="text-[9px] text-muted-foreground">Download on the</div>
                <div className="text-xs font-semibold">App Store</div>
              </div>
            </a>
            <a href={ANDROID} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 backdrop-blur px-3 py-1.5 hover:bg-background/70 transition">
              <Play className="h-4 w-4" />
              <div className="text-left leading-tight">
                <div className="text-[9px] text-muted-foreground">Get it on</div>
                <div className="text-xs font-semibold">Google Play</div>
              </div>
            </a>
            <Link
              to="/trade/$mint"
              params={{ mint: "So11111111111111111111111111111111111111112" }}
              className="rounded-lg border border-border/60 bg-background/40 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-background/70 transition"
            >
              Login
            </Link>
          </div>
        </div>
        </header>

        {/* Hero copy */}
        <section className="relative z-10 mx-auto max-w-3xl px-5 pt-24 pb-40 text-center">
        <h1 className="font-display text-7xl md:text-9xl font-semibold tracking-tight text-foreground/90">
          chad
        </h1>
        <p className="mt-8 text-2xl md:text-3xl font-medium">
          where traders become legends.
        </p>
        <p className="mt-3 text-base text-muted-foreground">
          From memecoins to viral tokens, trade any Solana token in seconds.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/trade/$mint"
            params={{ mint: "So11111111111111111111111111111111111111112" }}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Start trading
          </Link>
          <a
            href="#download"
            className="rounded-lg border border-border bg-background/40 backdrop-blur px-6 py-3 text-sm font-semibold hover:bg-background/70 transition"
          >
            Download app
          </a>
        </div>
        </section>


      {/* ============ STATS ============ */}
      <section className="relative px-5 py-24">
        <div className="mx-auto max-w-5xl grid gap-12 sm:grid-cols-3 text-center">
          {[
            { k: "$2.4B+", v: "volume routed" },
            { k: "180k+", v: "chads onboarded" },
            { k: "<400ms", v: "median swap" },
          ].map((s) => (
            <div key={s.v}>
              <div className="font-display text-5xl md:text-6xl font-semibold text-primary">{s.k}</div>
              <div className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">{s.v}</div>
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* ============ FEATURES — phone screenshots ============ */}
      <section className="relative border-t border-border/40 px-5 py-32 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
                <span className="inline-block h-1 w-1 rounded-full bg-primary mr-2 align-middle" />
                inside the app
              </p>
              <h2 className="mt-6 font-display text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight">
                Built for the<br/>
                <span className="text-muted-foreground">fastest fingers</span> on Solana.
              </h2>
            </div>
            <p className="md:col-span-5 text-base md:text-lg text-foreground/70 leading-relaxed">
              Every screen ships with the trader in mind — discover, ape, track and cash out without ever leaving the wallet.
            </p>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-12">
            {/* Big left feature */}
            <article className="md:col-span-7 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/[0.08] via-foreground/[0.03] to-transparent p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">discover</span>
                  <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                    Search anything.<br/>Ape in seconds.
                  </h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Token, ticker, CA or wallet — surface the next move before the timeline does.
                  </p>
                </div>
                <div className="relative">
                  <img src={screenSearch} alt="Search any token" className="mx-auto w-[220px] md:w-[260px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/20" />
                </div>
              </div>
            </article>

            {/* Right tall portfolio */}
            <article className="md:col-span-5 group relative overflow-hidden rounded-3xl border border-border/50 bg-foreground/[0.03] p-8 md:p-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">portfolio</span>
              <h3 className="mt-4 font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
                Every bag.<br/>One pane of glass.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">Live PnL, holdings, history. Zero spreadsheet.</p>
              <div className="mt-6 flex justify-center">
                <img src={screenPortfolio} alt="Portfolio" className="w-[200px] md:w-[230px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/10" />
              </div>
            </article>

            {/* Three smaller cards */}
            {[
              { img: screenToken, k: "trade", t: "Charts that don't lie.", d: "Sub-second routing on Jupiter, native swap UX." },
              { img: screenKol, k: "copy", t: "Mirror the printers.", d: "Track and copy KOL wallets in one tap." },
              { img: screenLaunch, k: "launch", t: "First on every launch.", d: "New pairs surfaced the second they go live." },
            ].map(({ img, k, t, d }) => (
              <article key={k} className="md:col-span-4 group relative overflow-hidden rounded-3xl border border-border/50 bg-foreground/[0.03] p-7">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">{k}</span>
                <h3 className="mt-3 font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                <div className="mt-5 flex justify-center">
                  <img src={img} alt={t} className="w-[170px] rounded-[1.5rem] border border-border/60 shadow-xl shadow-black/40" />
                </div>
              </article>
            ))}

            {/* Deposit wide */}
            <article className="md:col-span-12 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-foreground/[0.05] to-transparent p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">funding</span>
                  <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                    Apple Pay → SOL.<br/><span className="text-muted-foreground">No tutorial required.</span>
                  </h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
                    Top up with card, Apple Pay or transfer. Funds land trade-ready, not bridge-ready.
                  </p>
                </div>
                <div className="flex justify-center md:justify-end">
                  <img src={screenDeposit} alt="Deposit" className="w-[220px] md:w-[260px] rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/20" />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ THE FLOW — editorial strip ============ */}
      <section className="relative border-t border-border/40 px-5 py-32">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
                <span className="inline-block h-1 w-1 rounded-full bg-primary mr-2 align-middle" />
                the flow
              </p>
              <h2 className="mt-6 font-display text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight">
                One wallet.<br/>Every play.
              </h2>
            </div>
            <p className="max-w-sm text-sm md:text-base text-muted-foreground">
              From the first deposit to the next launch — the entire trader loop, designed end-to-end.
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
            ].map(({ img, k, t }) => (
              <article key={k} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-foreground/[0.02]">
                <img src={img} alt={t} className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">{k}</span>
                  <h3 className="mt-2 font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">{t}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">on the timeline</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            what chads are saying.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { q: "switched from phantom and never looked back. fills are insane.", a: "@solwhale" },
              { q: "apple pay → SOL in 10 seconds. this shouldn't be legal.", a: "@degenmom" },
              { q: "first wallet that doesn't make me feel like i'm doing taxes.", a: "@chartfrog" },
            ].map((t) => (
              <figure key={t.a} className="rounded-2xl border border-border/40 bg-background/40 p-6">
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
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">faq</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            questions, briefly.
          </h2>
          <div className="mt-12 divide-y divide-border/40 border-y border-border/40">
            {[
              { q: "Is ChadWallet self-custody?", a: "Yes. Keys are generated and stored client-side via Privy. We never see them." },
              { q: "Which chains do you support?", a: "Solana, with more rolling out. SPL tokens and Jupiter routing are first-class." },
              { q: "Do I need a seed phrase?", a: "No. Sign in with Apple or Google. Export keys whenever you want." },
              { q: "Fees?", a: "We pass through Jupiter and network fees. No swap markup on launch." },
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
      <section id="download" className="relative border-t border-border/40 px-5 py-32 text-center overflow-hidden">
        <div className="mx-auto max-w-5xl">
          <video
            src={chadVideo}
            autoPlay
            muted
            loop
            playsInline
            className="mx-auto mb-12 w-full max-w-3xl rounded-3xl border border-border/50 shadow-2xl shadow-primary/20"
          />
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Now available on web & mobile</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-semibold tracking-tight">
            trade from anywhere.<br />never lose a beat.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href={IOS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-background/40 backdrop-blur px-5 py-3 hover:bg-background/70 transition">
            <Apple className="h-5 w-5" />
            <div className="text-left leading-tight">
              <div className="text-[10px] text-muted-foreground">Download on the</div>
              <div className="text-sm font-semibold">App Store</div>
            </div>
          </a>
          <a href={ANDROID} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-background/40 backdrop-blur px-5 py-3 hover:bg-background/70 transition">
            <Play className="h-5 w-5" />
            <div className="text-left leading-tight">
              <div className="text-[10px] text-muted-foreground">Get it on</div>
              <div className="text-sm font-semibold">Google Play</div>
            </div>
          </a>
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
