import { useState } from "react";
import { Apple, Chrome, X } from "lucide-react";

const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? "";

export function SignInButton({ variant = "default" }: { variant?: "default" | "hero" }) {
  const [open, setOpen] = useState(false);
  const base =
    variant === "hero"
      ? "rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground glow-green hover:opacity-90 px-6 py-3 text-base font-semibold"
      : "rounded-full border border-border bg-card/60 hover:bg-card px-4 py-2 text-sm font-medium";
  return (
    <>
      <button onClick={() => setOpen(true)} className={base}>
        Sign in
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl glow-purple"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold">Sign in to ChadWallet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Powered by Privy. One-tap login, embedded Solana wallet.
            </p>
            <div className="mt-5 space-y-2">
              <ProviderButton icon={<Apple className="h-4 w-4" />} label="Continue with Apple" />
              <ProviderButton icon={<Chrome className="h-4 w-4" />} label="Continue with Google" />
            </div>
            {!PRIVY_APP_ID && (
              <p className="mt-4 rounded-md border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground">
                Add <code className="font-mono text-primary">VITE_PRIVY_APP_ID</code> to enable real auth.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ProviderButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={() => alert("Privy login — add VITE_PRIVY_APP_ID to wire this up.")}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm font-medium hover:border-primary/60 hover:bg-background transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}