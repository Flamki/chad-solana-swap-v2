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
}: {
  redirectTo: string;
  label?: string;
  className?: string;
}) {
  const pendingRedirect = useMemo(() => getPendingRedirect(), []);
  const [active, setActive] = useState(() => Boolean(pendingRedirect || hasPrivyOAuthCallback()));
  const resolvedRedirectTo = pendingRedirect ?? redirectTo;

  if (active) {
    return (
      <Suspense fallback={<LoadingButton label={label} />}>
        <PrivySignIn redirectTo={resolvedRedirectTo} label={label} />
      </Suspense>
    );
  }

  const startLogin = () => {
    setPendingRedirect(redirectTo);
    setActive(true);
  };

  return (
    <button
      onClick={startLogin}
      onPointerEnter={() => void loadPrivySignIn()}
      onFocus={() => void loadPrivySignIn()}
      onTouchStart={() => void loadPrivySignIn()}
      className={`inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.08] ${className}`}
    >
      {label}
    </button>
  );
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
