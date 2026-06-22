import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Play } from "lucide-react";
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
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Space background image */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/0 to-background/20" />
      </div>

      {/* Top marquee */}
      <TokenMarquee />

      {/* Nav */}
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

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-24 pb-32 text-center">
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

      {/* Social-first trading */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-lime">Social-first trading</p>
        <h2 className="mt-4 max-w-3xl font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Built for the moment<br />before consensus.
        </h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { tag: "Discover", title: "Token discovery that feels like your feed", body: "Swipe through Solana momentum, KOL activity, fresh wallets, and volume spikes before they flatten into old news." },
            { tag: "Trade", title: "Buy and sell from one focused surface", body: "The preview trading UI brings chart, holders, live trades, and position controls together so intent becomes action quickly." },
            { tag: "Follow", title: "See what smart wallets are doing", body: "Designed for social trading: watch wallets, KOLs, token launches, and re-launches without bouncing through ten tabs." },
          ].map((c) => (
            <div key={c.tag} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/30 via-background/60 to-success/20 border border-border/40" />
              <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-lime">{c.tag}</p>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug">{c.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile native */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 grid gap-12 md:grid-cols-2 items-center">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-lime">Mobile native</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Never lose a trade between phone and web.
          </h2>
          <p className="mt-6 max-w-md text-base text-muted-foreground leading-relaxed">
            The landing page mirrors the ChadWallet app story: discover on mobile, track signal, then jump into a focused web trading panel when conviction hits.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-6 space-y-3">
          {[
            { name: "The Disabled Alpha", sub: "$27.25K", right: "$0.0₄27" },
            { name: "Roman", sub: "sold $100.41 on Pump", right: "1m", sell: true },
            { name: "The Disabled Alpha", sub: "$27.25K", right: "$0.0₄27" },
            { name: "Zrool 兆", sub: "sold $142.10 on Pump", right: "1m", sell: true },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/60 to-success/40" />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className={`text-xs ${t.sell ? "text-destructive" : "text-muted-foreground"}`}>{t.sub}</div>
                </div>
              </div>
              <div className="text-sm font-mono text-muted-foreground">{t.right}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sub section */}
      <section id="download" className="relative z-10 mx-auto max-w-3xl px-5 py-24 text-center">
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

      <footer className="relative z-10 mx-auto max-w-7xl px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <ChadLogo />
        <div>© {new Date().getFullYear()} ChadWallet · Solana</div>
      </footer>
    </div>
  );
}
