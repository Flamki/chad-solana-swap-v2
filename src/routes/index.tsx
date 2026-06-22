import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Play, Zap, Shield, Trophy, Rocket, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-chad.jpg";
import { ChadLogo } from "@/components/chad-logo";
import { TokenMarquee } from "@/components/token-marquee";
import { SignInButton } from "@/components/sign-in-button";

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
    <div className="min-h-screen bg-cosmic">
      {/* Top marquee */}
      <TokenMarquee />

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/40 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <ChadLogo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <Link to="/trade/$mint" params={{ mint: "So11111111111111111111111111111111111111112" }} className="hover:text-foreground">Trade</Link>
            <a href="#download" className="hover:text-foreground">Download</a>
          </nav>
          <div className="flex items-center gap-2">
            <SignInButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-secondary/30 blur-[120px]" />
          <div className="absolute right-0 top-60 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Now live on Solana
            </span>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight">
              trade like a<br />
              <span className="text-gradient-chad">chad.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              The Solana wallet built for traders. Snipe memecoins, ape new launches, and flex your bags — all in one app.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/trade/$mint"
                params={{ mint: "So11111111111111111111111111111111111111112" }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-primary-foreground glow-green hover:opacity-90 transition"
              >
                <Rocket className="h-4 w-4" /> Start trading
              </Link>
              <a href="#download" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 font-semibold hover:bg-card transition">
                Download app
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={IOS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 hover:bg-card transition">
                <Apple className="h-5 w-5" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-muted-foreground">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </a>
              <a href={ANDROID} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 hover:bg-card transition">
                <Play className="h-5 w-5" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-muted-foreground">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/30 via-secondary/30 to-transparent blur-2xl animate-pulse-glow" />
            <img
              src={heroImg}
              alt="ChadWallet astronaut holding a Solana coin"
              width={1024}
              height={1024}
              className="relative rounded-3xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Built for degens</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
            no chains. no gas. no cope.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The fastest way to trade Solana. Powered by Privy, Jupiter, and BirdEye under the hood.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={<Zap />} title="Lightning swaps" body="Jupiter-powered routes across every Solana DEX. Best price, every time." />
          <Feature icon={<Shield />} title="Self-custody, no friction" body="Privy embedded wallets. Apple ID, Google — your keys, no seed phrase headache." />
          <Feature icon={<Trophy />} title="Leaderboards" body="Top the chart. Get paid in clout when degens copy your trades." />
          <Feature icon={<Rocket />} title="Snipe new launches" body="Real-time alerts on pump.fun launches and viral tokens before they moon." />
          <Feature icon={<Sparkles />} title="Apple Pay onramp" body="Fund your wallet in 10 seconds. No KYC walls. No waiting." />
          <Feature icon={<Play />} title="Mobile + web" body="Open a trade on your phone, close it on desktop. One account everywhere." />
        </div>
      </section>

      {/* CTA */}
      <section id="download" className="relative overflow-hidden border-y border-border bg-card/30">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-cosmic" />
        <div className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            join the <span className="text-gradient-chad">chads.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Download ChadWallet and start trading Solana like the legend you were born to be.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={IOS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-5 py-3 hover:bg-background transition glow-purple">
              <Apple className="h-6 w-6" />
              <div className="text-left leading-tight">
                <div className="text-[10px] text-muted-foreground">Download on the</div>
                <div className="text-base font-semibold">App Store</div>
              </div>
            </a>
            <a href={ANDROID} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-5 py-3 hover:bg-background transition glow-green">
              <Play className="h-6 w-6" />
              <div className="text-left leading-tight">
                <div className="text-[10px] text-muted-foreground">Get it on</div>
                <div className="text-base font-semibold">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Bottom marquee */}
      <TokenMarquee reverse />

      <footer className="mx-auto max-w-7xl px-5 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <ChadLogo />
        <div>© {new Date().getFullYear()} ChadWallet. Wallet · Privy. Solana inside.</div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card/50 p-6 hover:border-primary/40 hover:bg-card transition-colors">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-primary [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
