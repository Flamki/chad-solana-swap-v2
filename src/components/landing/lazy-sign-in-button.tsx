"use client";

import { lazy, Suspense, useMemo, useState } from "react";

const loadPrivySignIn = () => import("@/components/landing/privy-sign-in");
const PrivySignIn = lazy(loadPrivySignIn);
const PENDING_AUTH_REDIRECT_KEY = "chadwallet:pending-auth-redirect";

function LoadingButton({ label }: { label: string }) {
  return (
    <button
      disabled
      className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white/75 backdrop-blur"
    >
      {label}
    </button>
  );
}

export function LazySignInButton({
  redirectTo,
  label = "Sign in",
  className = "",
  preferTrending = false,
}: {
  redirectTo: string;
  label?: string;
  className?: string;
  preferTrending?: boolean;
}) {
  const pendingRedirect = useMemo(() => getPendingRedirect(), []);
  const [active, setActive] = useState(() => Boolean(pendingRedirect || hasPrivyOAuthCallback()));
  const [resolvedRedirectTo, setResolvedRedirectTo] = useState(pendingRedirect ?? redirectTo);
  const [resolving, setResolving] = useState(false);

  if (active) {
    return (
      <Suspense fallback={<LoadingButton label={label} />}>
        <PrivySignIn redirectTo={resolvedRedirectTo} label={label} />
      </Suspense>
    );
  }

  const startLogin = async () => {
    if (resolving) return;

    setResolving(true);
    const nextRedirect = preferTrending ? await resolveTrendingRedirect(redirectTo) : redirectTo;
    setResolvedRedirectTo(nextRedirect);
    setPendingRedirect(nextRedirect);
    setActive(true);
  };

  return (
    <button
      onClick={startLogin}
      disabled={resolving}
      onPointerEnter={() => void loadPrivySignIn()}
      onFocus={() => void loadPrivySignIn()}
      onTouchStart={() => void loadPrivySignIn()}
      className={`inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {label}
    </button>
  );
}

async function resolveTrendingRedirect(fallback: string) {
  try {
    const response = await fetch("/api/market/trending", { cache: "no-store" });
    if (!response.ok) return fallback;

    const payload: unknown = await response.json();
    const tokens = Array.isArray(payload)
      ? payload
      : hasTokenList(payload) && Array.isArray(payload.tokens)
        ? payload.tokens
        : [];
    const token = tokens.find(
      (item): item is { mint: string } =>
        typeof item === "object" &&
        item !== null &&
        "mint" in item &&
        typeof item.mint === "string" &&
        item.mint.length > 0,
    );

    return token ? `/tokens/solana/${encodeURIComponent(token.mint)}` : fallback;
  } catch {
    return fallback;
  }
}

function hasTokenList(payload: unknown): payload is { tokens: unknown } {
  return typeof payload === "object" && payload !== null && "tokens" in payload;
}

function getPendingRedirect() {
  if (typeof window === "undefined") return null;

  return window.sessionStorage.getItem(PENDING_AUTH_REDIRECT_KEY);
}

function setPendingRedirect(redirectTo: string) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(PENDING_AUTH_REDIRECT_KEY, redirectTo);
}

function hasPrivyOAuthCallback() {
  if (typeof window === "undefined") return false;

  return Array.from(new URLSearchParams(window.location.search).keys()).some((key) =>
    key.startsWith("privy_"),
  );
}
