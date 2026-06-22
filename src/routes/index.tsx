import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Play } from "lucide-react";
import heroImg from "@/assets/hero-space.jpg";
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
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/10 to-background/30" />
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
