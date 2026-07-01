import { NextResponse, type NextRequest } from "next/server";

const JUPITER_ORDER_URL = "https://api.jup.ag/swap/v2/order";
const JUPITER_LEGACY_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";
const JUPITER_LEGACY_SWAP_URL = "https://lite-api.jup.ag/swap/v1/swap";

type OrderRequest = {
  inputMint?: string;
  outputMint?: string;
  amount?: string;
  slippageBps?: number;
  taker?: string;
};

type ValidOrderRequest = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  taker: string;
};

type JupiterPayload = {
  error?: string;
  message?: string;
  errorMessage?: string;
  errorCode?: string | number;
  router?: string;
  transaction?: string;
  routePlan?: unknown[];
  [key: string]: unknown;
};

type LegacySwapPayload = {
  swapTransaction?: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  simulationError?:
    | {
        error?: string;
        errorCode?: string;
      }
    | string
    | null;
  [key: string]: unknown;
};

function jupiterApiKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

function normalizedSlippageBps(value: number | undefined) {
  return String(Math.max(0, Math.min(10_000, Number.isFinite(value) ? (value ?? 100) : 100)));
}

function payloadError(data: JupiterPayload, fallback: string) {
  return data.error ?? data.message ?? data.errorMessage ?? fallback;
}

function simulationErrorMessage(error: LegacySwapPayload["simulationError"]) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.error ?? error.errorCode ?? "transaction simulation failed";
}

async function buildLegacySwap(body: ValidOrderRequest) {
  const quoteParams = new URLSearchParams({
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    amount: body.amount,
    slippageBps: normalizedSlippageBps(body.slippageBps),
    swapMode: "ExactIn",
  });

  const quoteResponse = await fetch(`${JUPITER_LEGACY_QUOTE_URL}?${quoteParams}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const quote = (await quoteResponse.json()) as JupiterPayload;

  if (!quoteResponse.ok) {
    return NextResponse.json(
      { error: payloadError(quote, `Jupiter legacy quote failed (${quoteResponse.status})`) },
      { status: quoteResponse.status },
    );
  }

  const swapResponse = await fetch(JUPITER_LEGACY_SWAP_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: body.taker,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
    cache: "no-store",
  });
  const swap = (await swapResponse.json()) as LegacySwapPayload;

  if (!swapResponse.ok) {
    return NextResponse.json(
      { error: payloadError(swap, `Jupiter legacy swap failed (${swapResponse.status})`) },
      { status: swapResponse.status },
    );
  }

  const simulatedFailure = simulationErrorMessage(swap.simulationError);
  if (simulatedFailure) {
    return NextResponse.json(
      {
        error: `Jupiter built a transaction but simulation failed: ${simulatedFailure}`,
        router: "jupiter-legacy",
      },
      { status: 400 },
    );
  }

  if (!swap.swapTransaction) {
    return NextResponse.json(
      { error: "Jupiter legacy swap did not return a transaction.", router: "jupiter-legacy" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ...quote,
    transaction: swap.swapTransaction,
    requestId: `legacy-${Date.now()}`,
    lastValidBlockHeight: swap.lastValidBlockHeight ? String(swap.lastValidBlockHeight) : undefined,
    prioritizationFeeLamports: swap.prioritizationFeeLamports,
    computeUnitLimit: swap.computeUnitLimit,
    router: "jupiter-legacy",
    mode: "legacy",
    source: "jupiter-legacy",
  });
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
    const validBody = body as ValidOrderRequest;

    const params = new URLSearchParams({
      inputMint: validBody.inputMint,
      outputMint: validBody.outputMint,
      amount: validBody.amount,
      taker: validBody.taker,
      swapMode: "ExactIn",
    });

    params.set("slippageBps", normalizedSlippageBps(validBody.slippageBps));

    const response = await fetch(`${JUPITER_ORDER_URL}?${params}`, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const data = (await response.json()) as JupiterPayload;
    if (!response.ok) {
      return buildLegacySwap(validBody);
    }

    if (!data.transaction) {
      return buildLegacySwap(validBody);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Jupiter order" },
      { status: 500 },
    );
  }
}
