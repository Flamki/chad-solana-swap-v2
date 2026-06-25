const MARKET_PATH_PREFIX = "/api/market/";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = env.ORIGIN_URL || "https://chad-solana-swap-v2.vercel.app";

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "chadwallet-market-edge",
        origin,
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method !== "GET" || !url.pathname.startsWith(MARKET_PATH_PREFIX)) {
      return json(
        { error: "Only read-only ChadWallet market API requests are available at this edge." },
        404,
      );
    }

    const originUrl = new URL(url.pathname + url.search, origin);
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);

    if (cached) return withEdgeHeaders(cached, "HIT");

    const response = await fetch(originUrl, {
      headers: {
        accept: request.headers.get("accept") || "application/json",
        "user-agent": "ChadWallet-Cloudflare-Edge/1.0",
      },
      cf: {
        cacheEverything: true,
        cacheTtl: cacheTtl(url.pathname),
      },
    });
    const edgeResponse = withEdgeHeaders(response, "MISS");

    if (response.ok) {
      ctx.waitUntil(cache.put(cacheKey, edgeResponse.clone()));
    }

    return edgeResponse;
  },
};

function cacheTtl(pathname) {
  if (pathname.includes("/ohlcv/")) return 15;
  if (pathname.includes("/trades/")) return 10;
  if (pathname.includes("/holders/")) return 30;
  if (pathname.endsWith("/trending")) return 20;
  return 15;
}

function withEdgeHeaders(response, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("x-chadwallet-edge", "cloudflare");
  headers.set("x-chadwallet-cache", cacheStatus);
  headers.set("x-content-type-options", "nosniff");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
      "x-chadwallet-edge": "cloudflare",
      "x-content-type-options": "nosniff",
    },
  });
}
