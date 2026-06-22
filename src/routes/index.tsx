import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Play, Zap, Shield, Smartphone, TrendingUp, Wallet, Globe } from "lucide-react";
import heroImg from "@/assets/hero-astronaut.jpg";
import { ChadLogo } from "@/components/chad-logo";
import { TokenMarquee } from "@/components/token-marquee";

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
      {/* ============ HERO (scene confined here) ============ */}
      <div className="relative overflow-hidden">
        {/* Space background — confined to hero only */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={heroImg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
        </div>

        <TokenMarquee />

        <header className="relative z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <ChadLogo />
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
      </div>

      {/* ============ FEATURES ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">why chad</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-semibold tracking-tight text-center">
            no chains. no gas. no cope.
          </h2>
          <div className="mt-16 grid gap-px bg-border/40 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden border border-border/40">
            {[
              { icon: Zap, t: "Sub-second swaps", d: "Jupiter-routed orders confirm before the meme cycles." },
              { icon: Shield, t: "Self-custody", d: "Privy keys. You own them. We can't touch them." },
              { icon: Smartphone, t: "Apple Pay onramp", d: "Fiat → SOL in two taps. No KYC theater." },
              { icon: TrendingUp, t: "Live token feed", d: "BirdEye-powered prices, charts and holders." },
              { icon: Wallet, t: "Social-first", d: "Sign in with Apple or Google. No seed phrases." },
              { icon: Globe, t: "Trade anywhere", d: "iOS, Android, and now the web. Same wallet." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="bg-background p-8">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
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

      {/* ============ HOW IT WORKS ============ */}
      <section className="relative border-t border-border/40 px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary text-center">how it works</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            three steps to chad.
          </h2>
          <ol className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Sign in", d: "Apple or Google through Privy. Wallet ready in seconds." },
              { n: "02", t: "Fund it", d: "Apple Pay, card or transfer SOL. No tutorial required." },
              { n: "03", t: "Ape", d: "Search any token, hit buy. Track your bags in one place." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-border/40 bg-background/40 p-8">
                <div className="font-mono text-xs text-primary">{s.n}</div>
                <div className="mt-3 font-display text-2xl font-semibold">{s.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
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
      <section id="download" className="relative border-t border-border/40 px-5 py-24 text-center">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Now available on web</p>
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
      </section>

      {/* Bottom marquee */}
      <TokenMarquee reverse />

      <footer className="mx-auto max-w-7xl px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <ChadLogo />
        <div>© {new Date().getFullYear()} ChadWallet · Solana</div>
      </footer>
    </div>
  );
}
