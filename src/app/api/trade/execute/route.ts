import { NextResponse, type NextRequest } from "next/server";

const JUPITER_EXECUTE_URL = "https://api.jup.ag/swap/v2/execute";

type ExecuteRequest = {
  signedTransaction?: string;
  requestId?: string;
  lastValidBlockHeight?: string;
};

function jupiterApiKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

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
    const body = (await request.json()) as ExecuteRequest;
    if (!body.signedTransaction || !body.requestId) {
      return NextResponse.json(
        { error: "Missing signed transaction or request id" },
        { status: 400 },
      );
    }

    if (body.requestId.startsWith("legacy-")) {
      const rpcUrl = solanaRpcUrl();
      if (!rpcUrl) {
        return NextResponse.json({ error: "Missing Solana RPC URL" }, { status: 500 });
      }

      const rpcResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `chadwallet-${Date.now()}`,
          method: "sendTransaction",
          params: [
            body.signedTransaction,
            {
              encoding: "base64",
              skipPreflight: false,
              maxRetries: 3,
            },
          ],
        }),
        cache: "no-store",
      });
      const rpcData = await rpcResponse.json();

      if (!rpcResponse.ok || rpcData.error) {
        return NextResponse.json(
          {
            error:
              rpcData.error?.message ??
              `Solana RPC transaction submit failed (${rpcResponse.status})`,
            code: rpcData.error?.code,
          },
          { status: rpcResponse.ok ? 400 : rpcResponse.status },
        );
      }

      return NextResponse.json({ status: "Success", signature: rpcData.result });
    }

    const apiKey = jupiterApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Jupiter API key" }, { status: 500 });
    }

    const response = await fetch(JUPITER_EXECUTE_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        signedTransaction: body.signedTransaction,
        requestId: body.requestId,
        lastValidBlockHeight: body.lastValidBlockHeight,
      }),
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? data?.message ?? `Jupiter execute failed (${response.status})` },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to execute Jupiter swap" },
      { status: 500 },
    );
  }
}
