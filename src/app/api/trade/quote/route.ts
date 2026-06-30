import { NextResponse, type NextRequest } from "next/server";

const JUPITER_ORDER_URL = "https://api.jup.ag/swap/v2/order";
const JUPITER_LITE_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";

function jupiterApiKey() {
  return process.env.JUPITER_API_KEY || process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
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
    const response = apiKey
      ? await fetch(`${JUPITER_ORDER_URL}?${params}`, {
          headers: {
            accept: "application/json",
            "x-api-key": apiKey,
          },
          cache: "no-store",
        })
      : await fetch(`${JUPITER_LITE_QUOTE_URL}?${params}`, { cache: "no-store" });

    const quote = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: quote?.error ?? quote?.message ?? `Jupiter quote failed (${response.status})` },
        { status: response.status },
      );
    }

    const route = Array.isArray(quote.routePlan)
      ? quote.routePlan
          .map(
            (leg: { swapInfo?: { label?: string }; percent?: number }) =>
              `${leg.swapInfo?.label ?? "DEX"} ${leg.percent ?? 100}%`,
          )
          .join(" + ")
      : "Jupiter";

    return NextResponse.json({
      outAmount: quote.outAmount,
      outUiAmount: Number(quote.outAmount ?? 0) / 10 ** outputDecimals,
      inputUsd: quote.inUsdValue,
      outputUsd: quote.outUsdValue,
      feeLamports:
        Number(quote.signatureFeeLamports ?? 0) +
        Number(quote.prioritizationFeeLamports ?? 0) +
        Number(quote.rentFeeLamports ?? 0),
      priceImpactPct: Math.abs(Number(quote.priceImpact ?? quote.priceImpactPct ?? 0)) * 100,
      route,
      router: quote.router ?? quote.mode ?? (apiKey ? "Jupiter" : "Metis"),
      responseMs: Math.round(performance.now() - started),
      source: apiKey ? "jupiter-v2" : "jupiter-lite",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch Jupiter quote" },
      { status: 500 },
    );
  }
}
