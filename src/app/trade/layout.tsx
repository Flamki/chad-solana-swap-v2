import type { ReactNode } from "react";

import { PrivyAppProvider } from "@/components/privy-app-provider";

export default function TradeLayout({ children }: { children: ReactNode }) {
  return <PrivyAppProvider>{children}</PrivyAppProvider>;
}
