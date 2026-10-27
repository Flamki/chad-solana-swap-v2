const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the order route without signing transactions or calling Jupiter.
test("legacy fallback preserves the selected slippage in its quote and swap request", async () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/app/api/trade/order/route.ts"),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const requests = [];
  const mockedFetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) return { ok: false, json: async () => ({ error: "fallback" }) };
    if (requests.length === 2)
      return { ok: true, json: async () => ({ outAmount: "100", slippageBps: 100 }) };
    return { ok: true, json: async () => ({ swapTransaction: "unsigned-transaction" }) };
  };
  const exports = {};
  const context = {
    exports,
    require: (name) => {
      assert.equal(name, "next/server");
      return {
        NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200 }) },
      };
    },
    process: { env: { JUPITER_API_KEY: "test-key" } },
    fetch: mockedFetch,
    URLSearchParams,
    Date,
    Number,
    Math,
  };
  vm.runInNewContext(js, context);
  const result = await exports.POST({
    json: async () => ({
      inputMint: "input",
      outputMint: "output",
      amount: "1000",
      slippageBps: 100,
      taker: "wallet",
    }),
  });
  assert.equal(result.status, 200);
  assert.equal(requests.length, 3);
  assert.equal(new URL(requests[1].url).searchParams.get("slippageBps"), "100");
  const swapRequest = JSON.parse(requests[2].options.body);
  assert.equal(swapRequest.quoteResponse.slippageBps, 100);
  assert.equal(swapRequest.dynamicSlippage, false);
});
