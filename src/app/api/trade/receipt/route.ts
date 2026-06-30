import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/server/supabase";
import { upsertTransactionLedger, verifyTradeReceipt } from "@/lib/server/transaction-ledger";

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

    const receiptSide = receipt.side as "buy" | "sell";
    const receiptStatus = receipt.status as "submitted" | "confirmed" | "finalized";

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const verification = await verifyTradeReceipt({
      signature: receipt.signature,
      wallet: receipt.wallet,
      tokenMint: receipt.tokenMint,
    }).catch(
      (error): Awaited<ReturnType<typeof verifyTradeReceipt>> => ({
        status: "unavailable",
        error: error instanceof Error ? error.message : "Unable to verify trade on-chain.",
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
          : receiptStatus;

    const { error } = await supabase.from("trade_receipts").upsert(
      {
        signature: receipt.signature,
        wallet: receipt.wallet,
        status: storedStatus,
        slot: verification.chainSlot ?? receipt.slot ?? null,
        mode: "mainnet",
        side: receiptSide,
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

    await upsertTransactionLedger(
      supabase,
      {
        signature: receipt.signature,
        eventType: "swap",
        wallet: receipt.wallet,
        direction: receiptSide,
        assetSymbol: receiptSide === "buy" ? receipt.outputSymbol : receipt.inputSymbol,
        assetMint: receipt.tokenMint,
        amount:
          receiptSide === "buy" ? String(Number(receipt.outputAmount ?? 0)) : receipt.inputAmount,
        sourceTable: "trade_receipts",
        expected: {
          wallet: receipt.wallet,
          side: receiptSide,
          inputSymbol: receipt.inputSymbol,
          outputSymbol: receipt.outputSymbol,
          inputAmount: receipt.inputAmount,
          outputAmount: Number(receipt.outputAmount ?? 0),
          tokenMint: receipt.tokenMint,
          route: receipt.route ?? "",
          router: receipt.router ?? "",
        },
      },
      verification,
    ).catch((ledgerError) => {
      console.warn("Trade receipt stored, but ledger verification storage failed.", ledgerError);
    });

    return NextResponse.json({ stored: true, verificationStatus: verification.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to store trade receipt" },
      { status: 500 },
    );
  }
}
