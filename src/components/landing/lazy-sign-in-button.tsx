"use client";

import { lazy, Suspense, useState } from "react";

const loadPrivySignIn = () => import("@/components/landing/privy-sign-in");
const PrivySignIn = lazy(loadPrivySignIn);

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
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <Suspense fallback={<LoadingButton label={label} />}>
        <PrivySignIn redirectTo={redirectTo} label={label} />
      </Suspense>
    );
  }

  return (
    <button
      onClick={() => setActive(true)}
      onPointerEnter={() => void loadPrivySignIn()}
      onFocus={() => void loadPrivySignIn()}
      onTouchStart={() => void loadPrivySignIn()}
      className={`inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.08] ${className}`}
    >
      {label}
    </button>
  );
}
