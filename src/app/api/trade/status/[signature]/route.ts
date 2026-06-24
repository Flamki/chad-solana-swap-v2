import { NextResponse } from "next/server";

type SignatureStatus = {
  slot?: number;
  confirmations?: number | null;
  err?: unknown;
  confirmationStatus?: "processed" | "confirmed" | "finalized";
};

function rpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    ""
  );
}

export async function GET(_request: Request, context: { params: Promise<{ signature: string }> }) {
  const { signature } = await context.params;
  const endpoint = rpcUrl();

  if (!endpoint) {
    return NextResponse.json({ error: "Missing Solana RPC endpoint" }, { status: 500 });
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature)) {
    return NextResponse.json({ error: "Invalid Solana transaction signature" }, { status: 400 });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "signature-status",
        method: "getSignatureStatuses",
        params: [[signature], { searchTransactionHistory: true }],
      }),
    });
    const payload = (await response.json()) as {
      result?: { value?: Array<SignatureStatus | null> };
      error?: { message?: string };
    };

    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message ?? `Solana RPC failed (${response.status})`);
    }

    const status = payload.result?.value?.[0] ?? null;
    const confirmationStatus = status?.confirmationStatus ?? "processed";

    return NextResponse.json({
      signature,
      found: Boolean(status),
      confirmed:
        Boolean(status) &&
        !status?.err &&
        (confirmationStatus === "confirmed" || confirmationStatus === "finalized"),
      confirmationStatus,
      slot: status?.slot ?? null,
      confirmations: status?.confirmations ?? null,
      error: status?.err ?? null,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify transaction" },
      { status: 502 },
    );
  }
}
