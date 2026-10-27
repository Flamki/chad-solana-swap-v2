import { NextResponse, type NextRequest } from "next/server";

type ExecuteTransferRequest = {
  signedTransaction?: string;
};

function solanaRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL ||
    ""
  );
}

export async function POST(request: NextRequest) {
  try {
    const rpcUrl = solanaRpcUrl();
    if (!rpcUrl) {
      return NextResponse.json({ error: "Missing Solana RPC URL" }, { status: 500 });
    }

    const body = (await request.json()) as ExecuteTransferRequest;
    if (!body.signedTransaction || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.signedTransaction)) {
      return NextResponse.json({ error: "Missing signed transaction" }, { status: 400 });
    }

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "chadwallet-transfer",
        method: "sendTransaction",
        params: [
          body.signedTransaction,
          {
            encoding: "base64",
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          },
        ],
      }),
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ??
        data?.error ??
        `Solana RPC rejected the transaction (${response.status})`;
      return NextResponse.json(
        { error: message, code: data?.error?.code, data: data?.error?.data },
        { status: response.ok ? 502 : response.status },
      );
    }

    return NextResponse.json({ signature: data.result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to broadcast transfer" },
      { status: 500 },
    );
  }
}
