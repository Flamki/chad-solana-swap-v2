import { redirect } from "next/navigation";

import { solanaTokenPath } from "@/lib/routes";

type TradeParams = {
  params: Promise<{ mint: string }>;
};

export default async function TradeRoute({ params }: TradeParams) {
  const { mint } = await params;
  redirect(solanaTokenPath(mint));
}
