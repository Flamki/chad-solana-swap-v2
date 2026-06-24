type RpcResponse<T> = {
  result?: T;
  error?: { message?: string };
};

type LargestAccount = {
  address: string;
  uiAmount?: number | null;
  uiAmountString?: string;
};

function rpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    ""
  );
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const endpoint = rpcUrl();
  if (!endpoint) throw new Error("Missing Solana RPC endpoint");

  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
  });
  const payload = (await response.json()) as RpcResponse<T>;

  if (!response.ok || payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message ?? `${method} failed (${response.status})`);
  }

  return payload.result;
}

export async function holdersFromSolanaRpc(mint: string, price = 0) {
  const [largest, supply] = await Promise.all([
    solanaRpc<{ value?: LargestAccount[] }>("getTokenLargestAccounts", [
      mint,
      { commitment: "confirmed" },
    ]),
    solanaRpc<{ value?: { uiAmount?: number | null; uiAmountString?: string } }>("getTokenSupply", [
      mint,
      { commitment: "confirmed" },
    ]),
  ]);
  const accounts = (largest.value ?? []).slice(0, 12);
  const accountInfo = await solanaRpc<{
    value?: Array<{
      data?: {
        parsed?: {
          info?: { owner?: string };
        };
      };
    } | null>;
  }>("getMultipleAccounts", [
    accounts.map((account) => account.address),
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  const totalSupply = Number(supply.value?.uiAmountString ?? supply.value?.uiAmount ?? 0);

  return accounts.map((account, index) => {
    const tokens = Number(account.uiAmountString ?? account.uiAmount ?? 0);
    const owner = accountInfo.value?.[index]?.data?.parsed?.info?.owner ?? account.address;

    return {
      rank: index + 1,
      wallet: `${owner.slice(0, 4)}...${owner.slice(-4)}`,
      pct: totalSupply > 0 ? (tokens / totalSupply) * 100 : 0,
      valueUsd: tokens * price,
      tokens,
    };
  });
}
