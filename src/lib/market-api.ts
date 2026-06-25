import { env } from "@/lib/env";

function marketTargets(path: string) {
  if (!env.edgeApiUrl) return [path];
  return [`${env.edgeApiUrl}${path}`, path];
}

export async function fetchMarketResponse(path: string, init?: RequestInit) {
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (const target of marketTargets(path)) {
    try {
      const response = await fetch(target, init);
      if (response.ok) return response;
      lastResponse = response;
    } catch (error) {
      if (init?.signal?.aborted) throw error;
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error(`Unable to fetch ${path}`);
}

export async function fetchMarketJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchMarketResponse(path, init);

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }

  return (await response.json()) as T;
}
