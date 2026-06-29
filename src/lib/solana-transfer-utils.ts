const LAMPORTS_PER_SOL = 1_000_000_000n;

export const SOL_TRANSFER_FEE_RESERVE_SOL = 0.002;

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
