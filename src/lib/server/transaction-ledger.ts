import type { SupabaseClient } from "@supabase/supabase-js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

type LedgerEventType = "swap" | "transfer" | "withdrawal";
type LedgerDirection = "buy" | "sell" | "send" | "receive" | "withdrawal";
type VerificationStatus = "pending" | "verified" | "mismatch" | "failed" | "unavailable";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ParsedAccountKey =
  | string
  | {
      pubkey?: string;
      signer?: boolean;
      writable?: boolean;
    };

type ParsedTokenBalance = {
  owner?: string;
  mint?: string;
  uiTokenAmount?: {
    uiAmount?: number | null;
    uiAmountString?: string;
    decimals?: number;
  };
};

type ParsedTransaction = {
  slot?: number;
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: ParsedTokenBalance[];
    postTokenBalances?: ParsedTokenBalance[];
  };
  transaction?: {
    message?: {
      accountKeys?: ParsedAccountKey[];
    };
  };
};

type VerificationResult = {
  status: VerificationStatus;
  error: string | null;
  chainSlot: number | null;
  chainBlockTime: number | null;
  chainErr: JsonValue | null;
  chainRaw: JsonValue | null;
};

type LedgerEvent = {
  signature: string;
  eventType: LedgerEventType;
  wallet: string;
  counterpartyWallet?: string | null;
  direction?: LedgerDirection | null;
  assetSymbol?: string;
  assetMint?: string;
  amount?: string;
  sourceTable: string;
  expected: JsonValue;
};

type TransferVerificationInput = {
  signature: string;
  senderWallet: string;
  recipientWallet: string;
  assetMint: string;
  amount: string;
};

type SwapVerificationInput = {
  signature: string;
  wallet: string;
  tokenMint: string;
};

export async function verifyWalletTransfer(input: TransferVerificationInput) {
  const tx = await fetchSolanaTransaction(input.signature);
  return verifyTransferAgainstTransaction(input, tx);
}

export async function verifyTradeReceipt(input: SwapVerificationInput) {
  const tx = await fetchSolanaTransaction(input.signature);
  return verifySwapAgainstTransaction(input, tx);
}

export async function upsertTransactionLedger(
  supabase: SupabaseClient,
  event: LedgerEvent,
  verification: VerificationResult,
) {
  const { error } = await supabase.from("transaction_ledger").upsert(
    {
      signature: event.signature,
      event_type: event.eventType,
      wallet: event.wallet,
      counterparty_wallet: event.counterpartyWallet ?? null,
      direction: event.direction ?? null,
      asset_symbol: event.assetSymbol ?? "",
      asset_mint: event.assetMint ?? "",
      amount: event.amount ?? "",
      source_table: event.sourceTable,
      expected: event.expected,
      verification_status: verification.status,
      verification_error: verification.error,
      chain_slot: verification.chainSlot,
      chain_block_time: verification.chainBlockTime,
      chain_err: verification.chainErr,
      chain_raw: verification.chainRaw,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "signature" },
  );

  if (error) throw error;
}

function solanaRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    ""
  );
}

async function fetchSolanaTransaction(signature: string): Promise<ParsedTransaction | null> {
  const rpcUrl = solanaRpcUrl();
  if (!rpcUrl) return null;

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "chadwallet-verify-transaction",
      method: "getTransaction",
      params: [
        signature,
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as { result?: ParsedTransaction | null; error?: unknown };
  if (!response.ok || data.error) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Solana RPC transaction lookup failed (${response.status})`,
    );
  }

  return data.result ?? null;
}

function verifyTransferAgainstTransaction(
  input: TransferVerificationInput,
  tx: ParsedTransaction | null,
): VerificationResult {
  const base = transactionBase(tx);
  if (!tx) return { ...base, status: "pending", error: "Transaction not indexed by RPC yet." };
  if (tx.meta?.err) return { ...base, status: "failed", error: "Transaction failed on-chain." };

  const assetMint = input.assetMint;
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ...base, status: "mismatch", error: "Invalid recorded transfer amount." };
  }

  if (assetMint === SOL_MINT) {
    const senderDelta = nativeSolDelta(tx, input.senderWallet);
    const recipientDelta = nativeSolDelta(tx, input.recipientWallet);
    const expectedLamports = Math.round(amount * 1_000_000_000);
    const verified = recipientDelta >= expectedLamports && senderDelta <= -expectedLamports;

    return {
      ...base,
      status: verified ? "verified" : "mismatch",
      error: verified ? null : "On-chain SOL movement does not match the app transfer receipt.",
    };
  }

  const senderDelta = tokenOwnerDelta(tx, input.senderWallet, assetMint);
  const recipientDelta = tokenOwnerDelta(tx, input.recipientWallet, assetMint);
  const tolerance = Math.max(amount * 0.000000001, 0.000000001);
  const verified = recipientDelta >= amount - tolerance && senderDelta <= -amount + tolerance;

  return {
    ...base,
    status: verified ? "verified" : "mismatch",
    error: verified ? null : "On-chain token movement does not match the app transfer receipt.",
  };
}

function verifySwapAgainstTransaction(
  input: SwapVerificationInput,
  tx: ParsedTransaction | null,
): VerificationResult {
  const base = transactionBase(tx);
  if (!tx) return { ...base, status: "pending", error: "Transaction not indexed by RPC yet." };
  if (tx.meta?.err) return { ...base, status: "failed", error: "Transaction failed on-chain." };

  const walletTouched =
    transactionAccountKeys(tx).includes(input.wallet) || tokenOwnerTouched(tx, input.wallet);
  const tokenTouched = tokenMintTouched(tx, input.tokenMint);
  const verified = walletTouched && tokenTouched;

  return {
    ...base,
    status: verified ? "verified" : "mismatch",
    error: verified ? null : "On-chain swap does not reference the expected wallet and token mint.",
  };
}

function transactionBase(
  tx: ParsedTransaction | null,
): Omit<VerificationResult, "status" | "error"> {
  return {
    chainSlot: tx?.slot ?? null,
    chainBlockTime: tx?.blockTime ?? null,
    chainErr: toJsonValue(tx?.meta?.err ?? null),
    chainRaw: toJsonValue(tx),
  };
}

function transactionAccountKeys(tx: ParsedTransaction) {
  return (tx.transaction?.message?.accountKeys ?? [])
    .map((key) => (typeof key === "string" ? key : key.pubkey))
    .filter((key): key is string => Boolean(key));
}

function nativeSolDelta(tx: ParsedTransaction, wallet: string) {
  const accountIndex = transactionAccountKeys(tx).findIndex((key) => key === wallet);
  if (accountIndex < 0) return 0;

  const pre = tx.meta?.preBalances?.[accountIndex] ?? 0;
  const post = tx.meta?.postBalances?.[accountIndex] ?? 0;
  return post - pre;
}

function tokenOwnerDelta(tx: ParsedTransaction, owner: string, mint: string) {
  return (
    tokenOwnerBalance(tx.meta?.postTokenBalances, owner, mint) -
    tokenOwnerBalance(tx.meta?.preTokenBalances, owner, mint)
  );
}

function tokenOwnerBalance(
  balances: ParsedTokenBalance[] | undefined,
  owner: string,
  mint: string,
) {
  return (balances ?? [])
    .filter((balance) => balance.owner === owner && balance.mint === mint)
    .reduce((total, balance) => total + tokenBalanceAmount(balance), 0);
}

function tokenBalanceAmount(balance: ParsedTokenBalance) {
  const amount = Number(
    balance.uiTokenAmount?.uiAmountString ?? balance.uiTokenAmount?.uiAmount ?? 0,
  );
  return Number.isFinite(amount) ? amount : 0;
}

function tokenOwnerTouched(tx: ParsedTransaction, owner: string) {
  return [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])].some(
    (balance) => balance.owner === owner,
  );
}

function tokenMintTouched(tx: ParsedTransaction, mint: string) {
  return [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])].some(
    (balance) => balance.mint === mint,
  );
}

function toJsonValue(value: unknown): JsonValue | null {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
