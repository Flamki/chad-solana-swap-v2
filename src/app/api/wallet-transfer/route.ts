import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/server/supabase";
import { upsertTransactionLedger, verifyWalletTransfer } from "@/lib/server/transaction-ledger";

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

    const verification = await verifyWalletTransfer({
      signature: transfer.signature,
      senderWallet: transfer.senderWallet,
      recipientWallet: transfer.recipientWallet,
      assetMint: transfer.assetMint,
      amount: transfer.amount,
    }).catch(
      (error): Awaited<ReturnType<typeof verifyWalletTransfer>> => ({
        status: "unavailable",
        error: error instanceof Error ? error.message : "Unable to verify transfer on-chain.",
        chainSlot: null,
        chainBlockTime: null,
        chainErr: null,
        chainRaw: null,
      }),
    );

    const storedStatus =
      verification.status === "verified"
        ? "confirmed"
        : verification.status === "failed"
          ? "submitted"
          : transfer.status;

    const { error } = await supabase.from("wallet_transfers").upsert(
      {
        signature: transfer.signature,
        sender_wallet: transfer.senderWallet,
        recipient_wallet: transfer.recipientWallet,
        asset_symbol: transfer.assetSymbol,
        asset_mint: transfer.assetMint,
        amount: transfer.amount,
        note: transfer.note ?? "",
        status: storedStatus,
        slot: verification.chainSlot ?? transfer.slot ?? null,
        explorer_url: transfer.explorerUrl ?? `https://solscan.io/tx/${transfer.signature}`,
        created_at: transfer.createdAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "signature" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await upsertTransactionLedger(
      supabase,
      {
        signature: transfer.signature,
        eventType: transfer.note === "Withdrawal" ? "withdrawal" : "transfer",
        wallet: transfer.senderWallet,
        counterpartyWallet: transfer.recipientWallet,
        direction: transfer.note === "Withdrawal" ? "withdrawal" : "send",
        assetSymbol: transfer.assetSymbol,
        assetMint: transfer.assetMint,
        amount: transfer.amount,
        sourceTable: "wallet_transfers",
        expected: {
          senderWallet: transfer.senderWallet,
          recipientWallet: transfer.recipientWallet,
          assetSymbol: transfer.assetSymbol,
          assetMint: transfer.assetMint,
          amount: transfer.amount,
          note: transfer.note ?? "",
        },
      },
      verification,
    ).catch((ledgerError) => {
      console.warn("Wallet transfer stored, but ledger verification storage failed.", ledgerError);
    });

    return NextResponse.json({ stored: true, verificationStatus: verification.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to store wallet transfer" },
      { status: 500 },
    );
  }
}
