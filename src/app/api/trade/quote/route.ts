import { NextResponse, type NextRequest } from "next/server";

const JUPITER_ORDER_URL = "https://api.jup.ag/swap/v2/order";
const JUPITER_LITE_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";

type JupiterQuotePayload = {
  error?: string;
  message?: string;
  outAmount?: string;
  inUsdValue?: number;
  outUsdValue?: number;
  swapUsdValue?: string;
  priceImpact?: string | number;
  priceImpactPct?: string | number;
  signatureFeeLamports?: string | number;
  prioritizationFeeLamports?: string | number;
  rentFeeLamports?: string | number;
  router?: string;
  mode?: string;
  routePlan?: Array<{ swapInfo?: { label?: string }; percent?: number }>;
};

function jupiterApiKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
}

async function fetchQuote(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });
  const payload = (await response.json()) as JupiterQuotePayload;
  return { response, payload };
}

function quoteError(quote: JupiterQuotePayload, fallback: string) {
  return quote.error ?? quote.message ?? fallback;
}

function quoteRoute(quote: JupiterQuotePayload) {
  return Array.isArray(quote.routePlan)
    ? quote.routePlan
        .map((leg) => `${leg.swapInfo?.label ?? "DEX"} ${leg.percent ?? 100}%`)
        .join(" + ")
    : "Jupiter";
}

function quoteJson({
  quote,
  outputDecimals,
  router,
  source,
  started,
}: {
  quote: JupiterQuotePayload;
  outputDecimals: number;
  router: string;
  source: "jupiter-v2" | "jupiter-lite";
  started: number;
}) {
  return NextResponse.json({
    outAmount: quote.outAmount,
    outUiAmount: Number(quote.outAmount ?? 0) / 10 ** outputDecimals,
    inputUsd: quote.inUsdValue ?? Number(quote.swapUsdValue ?? 0),
    outputUsd: quote.outUsdValue,
    feeLamports:
      Number(quote.signatureFeeLamports ?? 0) +
      Number(quote.prioritizationFeeLamports ?? 0) +
      Number(quote.rentFeeLamports ?? 0),
    priceImpactPct: Math.abs(Number(quote.priceImpact ?? quote.priceImpactPct ?? 0)) * 100,
    route: quoteRoute(quote),
    router,
    responseMs: Math.round(performance.now() - started),
    source,
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams({
      inputMint: url.searchParams.get("inputMint") ?? "",
      outputMint: url.searchParams.get("outputMint") ?? "",
      amount: url.searchParams.get("amount") ?? "",
      slippageBps: url.searchParams.get("slippageBps") ?? "100",
      swapMode: "ExactIn",
    });
    const outputDecimals = Number(url.searchParams.get("outputDecimals") ?? 0);

    if (!params.get("inputMint") || !params.get("outputMint") || !params.get("amount")) {
      return NextResponse.json({ error: "Missing quote parameters" }, { status: 400 });
    }

    const apiKey = jupiterApiKey();
    const started = performance.now();
    const liteUrl = `${JUPITER_LITE_QUOTE_URL}?${params}`;

    if (!apiKey) {
      const { response, payload } = await fetchQuote(liteUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: quoteError(payload, `Jupiter quote failed (${response.status})`) },
          { status: response.status },
        );
      }

      return quoteJson({
        quote: payload,
        outputDecimals,
        router: payload.router ?? payload.mode ?? "Metis",
        source: "jupiter-lite",
        started,
      });
    }

    const v2 = await fetchQuote(`${JUPITER_ORDER_URL}?${params}`, {
      accept: "application/json",
      "x-api-key": apiKey,
    });

    if (v2.response.ok) {
      return quoteJson({
        quote: v2.payload,
        outputDecimals,
        router: v2.payload.router ?? v2.payload.mode ?? "Jupiter",
        source: "jupiter-v2",
        started,
      });
    }

    const fallback = await fetchQuote(liteUrl, { accept: "application/json" });
    if (fallback.response.ok) {
      return quoteJson({
        quote: fallback.payload,
        outputDecimals,
        router: fallback.payload.router ?? fallback.payload.mode ?? "Metis",
        source: "jupiter-lite",
        started,
      });
    }

    return NextResponse.json(
      {
        error: quoteError(
          fallback.payload,
          quoteError(v2.payload, `Jupiter quote failed (${v2.response.status})`),
        ),
      },
      { status: fallback.response.status || v2.response.status },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch Jupiter quote" },
      { status: 500 },
    );
  }
}
