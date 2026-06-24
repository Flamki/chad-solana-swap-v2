import { NextResponse, type NextRequest } from "next/server";

const JUPITER_ORDER_URL = "https://api.jup.ag/swap/v2/order";

type OrderRequest = {
  inputMint?: string;
  outputMint?: string;
  amount?: string;
  slippageBps?: number;
  taker?: string;
};

function jupiterApiKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = jupiterApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Jupiter API key" }, { status: 500 });
    }

    const body = (await request.json()) as OrderRequest;
    if (!body.inputMint || !body.outputMint || !body.amount || !body.taker) {
      return NextResponse.json({ error: "Missing swap order parameters" }, { status: 400 });
    }

    const params = new URLSearchParams({
      inputMint: body.inputMint,
      outputMint: body.outputMint,
      amount: body.amount,
      taker: body.taker,
      swapMode: "ExactIn",
    });

    if (Number.isFinite(body.slippageBps)) {
      params.set("slippageBps", String(Math.max(0, Math.min(10_000, body.slippageBps ?? 100))));
    }

    const response = await fetch(`${JUPITER_ORDER_URL}?${params}`, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? data?.message ?? `Jupiter order failed (${response.status})` },
        { status: response.status },
      );
    }

    if (!data.transaction) {
      return NextResponse.json(
        {
          error:
            data.errorMessage ||
            data.error ||
            "Jupiter returned a quote but could not build a transaction.",
          code: data.errorCode,
          router: data.router,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Jupiter order" },
      { status: 500 },
    );
  }
}
