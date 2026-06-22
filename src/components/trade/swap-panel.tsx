import { useState } from "react";
import { ArrowDownUp, Wallet } from "lucide-react";
import type { Token } from "@/lib/tokens";
import { formatUsd } from "@/lib/tokens";

export function SwapPanel({ token }: { token: Token }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.5");
  const [slippage, setSlippage] = useState("1");

  const amt = parseFloat(amount) || 0;
  // Mock Jupiter quote
  const solPrice = 184.32;
  const inputUsd = side === "buy" ? amt * solPrice : amt * token.price;
  const outputTokens = side === "buy" ? inputUsd / token.price : inputUsd / solPrice;
  const fee = inputUsd * 0.003;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/60 p-1">
        <button
          onClick={() => setSide("buy")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            side === "buy" ? "bg-primary text-primary-foreground glow-green" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`rounded-lg py-2 text-sm font-semibold transition ${
            side === "sell" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>You {side === "buy" ? "pay" : "sell"}</span>
          <span>Balance: 0.00</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full bg-transparent text-2xl font-mono font-semibold outline-none"
          />
          <div className="flex items-center gap-1.5 rounded-full bg-card border border-border px-2.5 py-1 text-sm font-semibold">
            {side === "buy" ? "SOL" : token.symbol}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">≈ {formatUsd(inputUsd)}</div>
      </div>

      <div className="my-2 grid grid-cols-4 gap-1.5 text-xs">
        {["25%", "50%", "75%", "MAX"].map((p) => (
          <button key={p} className="rounded-lg border border-border bg-background/40 py-1.5 hover:border-primary/50 hover:bg-background transition font-mono">
            {p}
          </button>
        ))}
      </div>

      <div className="flex justify-center -my-1">
        <div className="grid place-items-center h-8 w-8 rounded-lg border border-border bg-background">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-3">
        <div className="text-xs text-muted-foreground">You receive</div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-2xl font-mono font-semibold">
            {outputTokens.toLocaleString(undefined, { maximumFractionDigits: outputTokens < 1 ? 6 : 2 })}
          </div>
          <div className="rounded-full bg-card border border-border px-2.5 py-1 text-sm font-semibold">
            {side === "buy" ? token.symbol : "SOL"}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <Row label="Price impact" value="< 0.10%" good />
        <Row label="Route" value="Jupiter v6" />
        <Row label="Network fee" value={formatUsd(fee)} />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Slippage</span>
          <div className="flex gap-1">
            {["0.5", "1", "2"].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`rounded-md border px-2 py-0.5 font-mono ${
                  slippage === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3.5 font-semibold text-primary-foreground glow-green hover:opacity-90 transition">
        <Wallet className="h-4 w-4" />
        Connect wallet to {side}
      </button>

      {/* Position */}
      <div className="mt-5 rounded-xl border border-border bg-background/40 p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Your position</div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl font-mono font-semibold">0.00 {token.symbol}</div>
          <div className="text-sm font-mono text-muted-foreground">$0.00</div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">No open position. Make your first trade.</div>
      </div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${good ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}