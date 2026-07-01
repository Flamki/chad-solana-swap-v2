const LAMPORTS_PER_SOL = 1_000_000_000n;

export const SOL_TRANSFER_FEE_RESERVE_SOL = 0.002;
export const TOKEN_TRANSFER_FEE_RESERVE_SOL = 0.003;
export const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export function maxTransferableSol(balance: number) {
  return Math.max(balance - SOL_TRANSFER_FEE_RESERVE_SOL, 0);
}

export function parseSolLamports(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d*)?$/.test(trimmed)) {
    throw new Error("Enter a valid SOL amount.");
  }

  const [wholePart, decimalPart = ""] = trimmed.split(".");
  if (decimalPart.length > 9) {
    throw new Error("SOL supports up to 9 decimal places.");
  }

  const wholeLamports = BigInt(wholePart || "0") * LAMPORTS_PER_SOL;
  const decimalLamports = BigInt((decimalPart + "000000000").slice(0, 9));
  const lamports = wholeLamports + decimalLamports;

  if (lamports <= 0n) {
    throw new Error("Enter a SOL amount greater than 0.");
  }

  return lamports;
}

export function formatLamportsAsSol(lamports: bigint) {
  const whole = lamports / LAMPORTS_PER_SOL;
  const decimals = (lamports % LAMPORTS_PER_SOL).toString().padStart(9, "0");
  const trimmedDecimals = decimals.replace(/0+$/, "");
  return trimmedDecimals ? `${whole}.${trimmedDecimals}` : whole.toString();
}

export function parseTokenUnits(value: string, decimals: number, symbol = "token") {
  const trimmed = value.trim();
  if (!/^\d+(\.\d*)?$/.test(trimmed)) {
    throw new Error(`Enter a valid ${symbol} amount.`);
  }

  const [wholePart, decimalPart = ""] = trimmed.split(".");
  if (decimalPart.length > decimals) {
    throw new Error(`${symbol} supports up to ${decimals} decimal places.`);
  }

  const multiplier = 10n ** BigInt(decimals);
  const wholeUnits = BigInt(wholePart || "0") * multiplier;
  const decimalUnits = BigInt((decimalPart + "0".repeat(decimals)).slice(0, decimals) || "0");
  const units = wholeUnits + decimalUnits;

  if (units <= 0n) {
    throw new Error(`Enter a ${symbol} amount greater than 0.`);
  }

  return units;
}

export function formatTokenUnits(units: bigint, decimals: number) {
  const multiplier = 10n ** BigInt(decimals);
  const whole = units / multiplier;
  const fraction = (units % multiplier).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

export async function broadcastSignedSolanaTransaction(signedTransaction: string) {
  const response = await fetch("/api/wallet-transfer/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error ?? `Solana transfer failed (${response.status})`);
  }

  if (!result?.signature) {
    throw new Error("Solana accepted the transfer request but did not return a signature.");
  }

  return result as { signature: string };
}

type RpcTokenAccount = {
  pubkey?: string;
  account?: {
    owner?: string;
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

export async function fetchTokenTransferSourceAccount({
  rpcUrl,
  owner,
  mint,
  tokenProgram,
  amount,
}: {
  rpcUrl: string;
  owner: string;
  mint: string;
  tokenProgram: string;
  amount: bigint;
}) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "chadwallet-token-source",
      method: "getTokenAccountsByOwner",
      params: [
        owner,
        { programId: tokenProgram },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ],
    }),
  });

  const payload = (await response.json()) as {
    result?: { value?: RpcTokenAccount[] };
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Unable to read token accounts for this wallet.");
  }

  const account = (payload.result?.value ?? []).find((item) => {
    const info = item.account?.data?.parsed?.info;
    const rawAmount = info?.tokenAmount?.amount;
    return (
      item.pubkey &&
      item.account?.owner === tokenProgram &&
      info?.mint === mint &&
      rawAmount &&
      BigInt(rawAmount) >= amount
    );
  });

  if (!account?.pubkey) {
    throw new Error("No token account has enough balance for this send.");
  }

  return account.pubkey;
}

export function normalizeSolanaTransactionError(error: unknown, fallback: string) {
  const message = collectErrorMessages(error).find(Boolean);

  if (message) {
    if (/insufficient|debit|0x1|custom program error: 1/i.test(message)) {
      return "Not enough SOL for this transfer plus network fees. Try a smaller amount.";
    }

    if (/-32002|simulation|simulate/i.test(message)) {
      return "Solana rejected this transaction during simulation. Check the recipient, refresh the wallet balance, and try a smaller amount.";
    }

    if (/blockhash|expired/i.test(message)) {
      return "The transaction quote expired. Please retry so we can use a fresh Solana blockhash.";
    }

    return message;
  }

  return fallback;
}

function collectErrorMessages(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || seen.has(error)) return [];
  seen.add(error);

  if (typeof error === "string") return [error];
  if (!(error instanceof Object)) return [];

  const record = error as Record<string, unknown>;
  const messages: string[] = [];

  for (const key of ["message", "shortMessage", "details", "name"]) {
    if (typeof record[key] === "string") messages.push(record[key]);
  }

  if (Array.isArray(record.logs)) {
    messages.push(record.logs.filter((log): log is string => typeof log === "string").join(" "));
  }

  for (const key of ["cause", "error", "data"]) {
    messages.push(...collectErrorMessages(record[key], seen));
  }

  return messages;
}
