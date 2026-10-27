"use client";

import { PrivyAppProvider } from "@/components/privy-app-provider";
import { SignInButton } from "@/components/sign-in-button";

export default function PrivySignIn({
  redirectTo,
  label = "Sign in",
}: {
  redirectTo: string;
  label?: string;
}) {
  return (
    <PrivyAppProvider>
      <SignInButton redirectTo={redirectTo} autoLogin label={label} />
    </PrivyAppProvider>
  );
}
