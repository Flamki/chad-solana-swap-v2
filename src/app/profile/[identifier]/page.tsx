import type { Metadata } from "next";

import { TradePage } from "@/components/trade-page";
import { SOL_MINT } from "@/lib/tokens";

type ProfileParams = {
  params: Promise<{ identifier: string }>;
};

export async function generateMetadata({ params }: ProfileParams): Promise<Metadata> {
  const { identifier } = await params;
  const handle = decodeURIComponent(identifier).replace(/^@+/, "");

  return {
    title: `${handle} - ChadWallet`,
    description: `View ${handle}'s ChadWallet trading profile, activity, transfers, and positions.`,
  };
}

export default async function ProfileRoute({ params }: ProfileParams) {
  const { identifier } = await params;
  const profileIdentifier = decodeURIComponent(identifier);

  return <TradePage mint={SOL_MINT} initialView="profile" profileIdentifier={profileIdentifier} />;
}
