import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type TradeReceiptPayload = {
  signature?: string;
  status?: string;
  slot?: number | null;
  wallet?: string;
  mode?: string;
  side?: string;
  inputSymbol?: string;
  outputSymbol?: string;
  inputAmount?: string;
  outputAmount?: number;
  route?: string;
  router?: string;
  tokenMint?: string;
  createdAt?: string;
  explorerUrl?: string;
};

const allowedStatuses = new Set(["submitted", "confirmed", "finalized"]);
const allowedSides = new Set(["buy", "sell"]);

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const receipt = (await request.json()) as TradeReceiptPayload;

    if (receipt.mode !== "mainnet") {
      return NextResponse.json({ stored: false, reason: "not-mainnet" });
    }

    if (
      !receipt.signature ||
      !receipt.wallet ||
      !receipt.inputSymbol ||
      !receipt.outputSymbol ||
      !receipt.inputAmount ||
      !receipt.tokenMint ||
      !allowedStatuses.has(receipt.status ?? "") ||
      !allowedSides.has(receipt.side ?? "")
    ) {
      return NextResponse.json({ error: "Invalid trade receipt" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { error } = await supabase.from("trade_receipts").upsert(
      {
        signature: receipt.signature,
        wallet: receipt.wallet,
        status: receipt.status,
        slot: receipt.slot ?? null,
        mode: "mainnet",
        side: receipt.side,
        input_symbol: receipt.inputSymbol,
        output_symbol: receipt.outputSymbol,
        input_amount: receipt.inputAmount,
        output_amount: Number(receipt.outputAmount ?? 0),
        route: receipt.route ?? "",
        router: receipt.router ?? "",
        token_mint: receipt.tokenMint,
        created_at: receipt.createdAt ?? new Date().toISOString(),
        explorer_url: receipt.explorerUrl ?? `https://solscan.io/tx/${receipt.signature}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "signature" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stored: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to store trade receipt" },
      { status: 500 },
    );
  }
}
