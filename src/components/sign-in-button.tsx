"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { LogOut, Wallet } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { hasPrivy } from "@/lib/env";

export function SignInButton({
  variant = "default",
  redirectTo,
  autoLogin = false,
  label = "Sign in",
}: {
  variant?: "default" | "hero";
  redirectTo?: string;
  autoLogin?: boolean;
  label?: string;
}) {
  if (!hasPrivy) {
    return <PrivySetupButton variant={variant} label={label} />;
  }

  return (
    <ConnectedPrivyButton
      variant={variant}
      redirectTo={redirectTo}
      autoLogin={autoLogin}
      label={label}
    />
  );
}

function ConnectedPrivyButton({
  variant,
  redirectTo,
  autoLogin,
  label,
}: {
  variant: "default" | "hero";
  redirectTo?: string;
  autoLogin: boolean;
  label: string;
}) {
  const router = useRouter();
  const loginStarted = useRef(false);
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      if (redirectTo) {
        router.replace(redirectTo as Route);
      }
    },
    onError: (error) => {
      if (isLoginCancellation(error)) {
        return;
      }

      alert(`Privy login failed: ${String(error)}`);
    },
  });
  const { logout } = useLogout();
  const { wallets } = useWallets();

  useEffect(() => {
    if (ready && authenticated && redirectTo) {
      router.replace(redirectTo as Route);
    }
  }, [authenticated, ready, redirectTo, router]);

  useEffect(() => {
    if (autoLogin && ready && !authenticated && !loginStarted.current) {
      loginStarted.current = true;
      login();
    }
  }, [authenticated, autoLogin, login, ready]);

  const wallet = wallets[0];
  const address = wallet?.address ?? user?.wallet?.address;
  const base =
    variant === "hero"
      ? "rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground glow-green hover:opacity-90 px-6 py-3 text-base font-semibold"
      : "rounded-full border border-border bg-card/60 hover:bg-card px-4 py-2 text-sm font-medium";

  if (!authenticated) {
    return (
      <button
        onClick={() => ready && login()}
        disabled={!ready}
        className={`${base} inline-flex min-h-10 items-center gap-2 disabled:cursor-default disabled:opacity-80`}
      >
        {label}
      </button>
    );
  }

  return (
    <button onClick={() => logout()} className={`${base} inline-flex items-center gap-2`}>
      <Wallet className="h-4 w-4" />
      <span className="max-w-28 truncate">
        {address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Signed in"}
      </span>
      <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

function isLoginCancellation(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : String(error);

  return /exited_auth_flow|user_canceled|user_cancelled|login_cancelled/i.test(message);
}

function PrivySetupButton({ variant, label }: { variant: "default" | "hero"; label: string }) {
  const base =
    variant === "hero"
      ? "rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground glow-green px-6 py-3 text-base font-semibold"
      : "rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium";

  return (
    <button
      onClick={() =>
        alert(
          "Add NEXT_PUBLIC_PRIVY_APP_ID to enable Privy login with Apple, Google, and Solana wallets.",
        )
      }
      className={`${base} inline-flex items-center gap-2`}
    >
      {label}
    </button>
  );
}
