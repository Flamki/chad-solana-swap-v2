import { Link } from "@tanstack/react-router";
import { TOKENS, formatUsd } from "@/lib/tokens";

export function TokenMarquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...TOKENS, ...TOKENS]; // duplicate for seamless loop
  return (
    <div className="relative overflow-hidden border-y border-border bg-card/40 backdrop-blur-sm py-3 group">
      <div
        className={`flex w-max gap-3 ${reverse ? "animate-marquee-reverse" : "animate-marquee"} group-hover:[animation-play-state:paused]`}
      >
        {items.map((t, i) => {
          const up = t.change24h >= 0;
          return (
            <Link
              key={`${t.mint}-${i}`}
              to="/trade/$mint"
              params={{ mint: t.mint }}
              className="flex items-center gap-2.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm hover:border-primary/60 hover:bg-card transition-colors whitespace-nowrap"
            >
              <img
                src={t.logo}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                className="h-5 w-5 rounded-full bg-muted"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
              />
              <span className="font-semibold">{t.symbol}</span>
              <span className="font-mono text-muted-foreground">{formatUsd(t.price)}</span>
              <span className={`font-mono text-xs ${up ? "text-primary" : "text-destructive"}`}>
                {up ? "+" : ""}{t.change24h.toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}