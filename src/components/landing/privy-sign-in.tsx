"use client";

import { PrivyAppProvider } from "@/components/privy-app-provider";
import { SignInButton } from "@/components/sign-in-button";

export default function PrivySignIn({ redirectTo }: { redirectTo: string }) {
  return (
    <PrivyAppProvider>
      <SignInButton redirectTo={redirectTo} autoLogin />
    </PrivyAppProvider>
  );
}
