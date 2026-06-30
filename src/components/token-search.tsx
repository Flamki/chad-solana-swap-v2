"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, TrendingUp, TrendingDown, Clock, Trash2 } from "lucide-react";

import { fetchMarketJson } from "@/lib/market-api";
import { solanaTokenPath } from "@/lib/routes";
import { formatCompact, formatUsd, type Token } from "@/lib/tokens";

const RECENT_KEY = "chadwallet-recent-searches";
const MAX_RECENT = 6;

type RecentToken = {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
};

function getRecents(): RecentToken[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(token: RecentToken) {
  const recents = getRecents().filter((r) => r.mint !== token.mint);
  recents.unshift(token);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function clearRecents() {
  localStorage.removeItem(RECENT_KEY);
}

export function TokenSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Token[]>([]);
  const [recents, setRecents] = useState<RecentToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setRecents(getRecents());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
        setError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setResults([]);
        setError("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedIndex(-1);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const data = await fetchMarketJson<Token[]>(
          `/api/market/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setError("Token search is temporarily unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navigateToToken = useCallback(
    (token: Token | RecentToken) => {
      saveRecent({
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        logo: token.logo,
      });
      setOpen(false);
      setQuery("");
      setResults([]);
      setError("");
      router.push(solanaTokenPath(token.mint));
    },
    [router],
  );

  const allItems = query.trim().length >= 1 ? results : [];
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = allItems.length > 0 ? allItems : recents;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0 && items[selectedIndex]) {
      e.preventDefault();
      navigateToToken(items[selectedIndex] as Token);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="token-search-trigger">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="token-search-placeholder">Search for tokens...</span>
      </button>
    );
  }

  return (
    <div className="token-search-modal" ref={containerRef}>
      <div className="token-search-input-wrap">
        <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search for tokens or paste address..."
          className="token-search-input"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="token-search-clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="token-search-body">
        {loading && query.trim().length >= 1 && (
          <div className="token-search-status">
            <div className="token-search-spinner" />
            <span>Searching...</span>
          </div>
        )}

        {!loading && query.trim().length >= 1 && error && (
          <div className="token-search-status">
            <span className="text-muted-foreground">{error}</span>
          </div>
        )}

        {!loading && query.trim().length >= 1 && !error && results.length === 0 && (
          <div className="token-search-status">
            <span className="text-muted-foreground">No tokens found for &ldquo;{query}&rdquo;</span>
          </div>
        )}

        {query.trim().length >= 1 && results.length > 0 && (
          <div className="token-search-list">
            {results.map((token, idx) => (
              <SearchResultRow
                key={token.mint}
                token={token}
                selected={idx === selectedIndex}
                onClick={() => navigateToToken(token)}
              />
            ))}
          </div>
        )}

        {query.trim().length < 1 && recents.length > 0 && (
          <>
            <div className="token-search-section-header">
              <div className="token-search-section-label">
                <Clock className="h-3.5 w-3.5" />
                <span>Recents</span>
              </div>
              <button
                onClick={() => {
                  clearRecents();
                  setRecents([]);
                }}
                className="token-search-clear-all"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            </div>
            <div className="token-search-list">
              {recents.map((token, idx) => (
                <RecentRow
                  key={token.mint}
                  token={token}
                  selected={idx === selectedIndex}
                  onClick={() => navigateToToken(token as Token)}
                />
              ))}
            </div>
          </>
        )}

        {query.trim().length < 1 && recents.length === 0 && (
          <div className="token-search-status token-search-status-compact">
            <span className="text-muted-foreground">Type a token name, symbol, or address</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultRow({
  token,
  selected,
  onClick,
}: {
  token: Token;
  selected: boolean;
  onClick: () => void;
}) {
  const up = token.change24h >= 0;

  return (
    <button onClick={onClick} className={`token-search-row ${selected ? "is-selected" : ""}`}>
      <TokenAvatar logo={token.logo} symbol={token.symbol} />

      <div className="token-search-row-info">
        <div className="token-search-row-name">
          <span className="font-semibold">{token.symbol}</span>
          <span className="text-muted-foreground text-[11px] truncate">{token.name}</span>
        </div>
        <div className="token-search-row-address">
          {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
        </div>
      </div>

      <div className="token-search-row-stats">
        <div className="token-search-row-stat">
          <span className="text-[10px] text-muted-foreground uppercase">MC</span>
          <span className="font-mono text-xs">${formatCompact(token.marketCap)}</span>
        </div>
        <div className="token-search-row-stat">
          <span className="text-[10px] text-muted-foreground uppercase">Price</span>
          <span className="font-mono text-xs">{formatUsd(token.price)}</span>
        </div>
        <div className="token-search-row-stat">
          <span className="text-[10px] text-muted-foreground uppercase">24h</span>
          <span
            className={`flex items-center gap-0.5 font-mono text-xs ${up ? "text-primary" : "text-destructive"}`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? "+" : ""}
            {token.change24h?.toFixed(2) ?? "0.00"}%
          </span>
        </div>
        <div className="token-search-row-stat">
          <span className="text-[10px] text-muted-foreground uppercase">Vol</span>
          <span className="font-mono text-xs">${formatCompact(token.volume24h)}</span>
        </div>
      </div>
    </button>
  );
}

function RecentRow({
  token,
  selected,
  onClick,
}: {
  token: RecentToken;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`token-search-row ${selected ? "is-selected" : ""}`}>
      <TokenAvatar logo={token.logo} symbol={token.symbol} />
      <div className="token-search-row-info">
        <div className="token-search-row-name">
          <span className="font-semibold">{token.symbol}</span>
          <span className="text-muted-foreground text-[11px] truncate">{token.name}</span>
        </div>
        <div className="token-search-row-address">
          {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
        </div>
      </div>
    </button>
  );
}

function TokenAvatar({ logo, symbol }: { logo: string; symbol: string }) {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return (
      <div className="token-search-avatar token-search-avatar-fallback">{symbol.slice(0, 2)}</div>
    );
  }

  return (
    <img
      src={logo}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      className="token-search-avatar"
      onError={() => setFailed(true)}
    />
  );
}
