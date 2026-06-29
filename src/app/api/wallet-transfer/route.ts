import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type WalletTransferPayload = {
  signature?: string;
  senderWallet?: string;
  recipientWallet?: string;
  assetSymbol?: string;
  assetMint?: string;
  amount?: string;
  note?: string;
  status?: string;
  slot?: number | null;
  explorerUrl?: string;
  createdAt?: string;
};

const allowedStatuses = new Set(["submitted", "confirmed", "finalized"]);

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
    const transfer = (await request.json()) as WalletTransferPayload;

    if (
      !transfer.signature ||
      !transfer.senderWallet ||
      !transfer.recipientWallet ||
      !transfer.assetSymbol ||
      !transfer.assetMint ||
      !transfer.amount ||
      !allowedStatuses.has(transfer.status ?? "")
    ) {
      return NextResponse.json({ error: "Invalid wallet transfer" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { error } = await supabase.from("wallet_transfers").upsert(
      {
        signature: transfer.signature,
        sender_wallet: transfer.senderWallet,
        recipient_wallet: transfer.recipientWallet,
        asset_symbol: transfer.assetSymbol,
        asset_mint: transfer.assetMint,
        amount: transfer.amount,
        note: transfer.note ?? "",
        status: transfer.status,
        slot: transfer.slot ?? null,
        explorer_url: transfer.explorerUrl ?? `https://solscan.io/tx/${transfer.signature}`,
        created_at: transfer.createdAt ?? new Date().toISOString(),
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
      { error: error instanceof Error ? error.message : "Unable to store wallet transfer" },
      { status: 500 },
    );
  }
}
