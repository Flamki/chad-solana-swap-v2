"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Columns2,
  Copy,
  ExternalLink,
  Filter,
  PanelBottom,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { ChadLogo } from "@/components/chad-logo";
import { TokenSearch } from "@/components/token-search";
import { TradeAccount } from "@/components/trade-account";
import { PriceChart } from "@/components/trade/price-chart";
import {
  FollowTopTradersPanel,
  ProfileSendPanel,
  TradeProfileCenter,
} from "@/components/trade/profile-center";
import { SwapPanel } from "@/components/trade/swap-panel";
import {
  type AppFeedTrade,
  type AppLeaderboardPeriod,
  type AppLeaderboardUser,
  type ChartInterval,
  useAppFeedTrades,
  useAppLeaderboard,
  useCryptoTokens,
  recordTradeReceipt,
  useTokenHolders,
  useTokenMarket,
  useTokenOhlcv,
  useStoredWatchlist,
  useStoredUserProfile,
  useStoredUserProfileByIdentifier,
  useTokenTrades,
  useTrendingTokens,
  useWatchlistTokenMarkets,
  syncWatchlistToken,
  type TradeReceiptRecord,
} from "@/lib/market-data";
import { hasPrivy } from "@/lib/env";
import { profilePath, solanaTokenPath } from "@/lib/routes";
import { SOL_MINT, createFallbackToken, formatCompact, formatUsd, type Token } from "@/lib/tokens";

type TokenListMode = "watchlist" | "crypto" | "trending" | "most-held" | "graduates";
const MANUAL_LOGOUT_REDIRECT_KEY = "chadwallet:manual-logout";
const GECKO_CHART_HEIGHT_KEY = "chadwallet:gecko-terminal-height:v3";
const DEFAULT_GECKO_CHART_HEIGHT = 760;
const MIN_GECKO_CHART_HEIGHT = 620;
const MAX_GECKO_CHART_HEIGHT = 1280;

interface SidebarPaneState {
  activeTab: string;
  tokenListMode: TokenListMode;
}

interface SidebarColumnState {
  isActive: boolean;
  isSplitBottom: boolean;
  topPane: SidebarPaneState;
  bottomPane: SidebarPaneState;
}

interface TokenPreviewState {
  token: Token;
  x: number;
  y: number;
  closing?: boolean;
}

function FeedTradeItem({
  item,
  solPrice,
  onSelectProfile,
}: {
  item: AppFeedTrade;
  solPrice: number;
  onSelectProfile: (wallet: string) => void;
}) {
  const isBuy = item.side === "buy";
  const amountLabel = formatFeedTradeAmount(item, solPrice);
  const marketCapLabel = item.marketCap > 0 ? `$${formatCompact(item.marketCap)} MC` : null;
  const traderName = item.trader.displayName || item.trader.username;

  return (
    <div className="group border-b border-[#17131f] px-3.5 py-3 transition-colors hover:bg-[#151221]/55">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectProfile(item.trader.wallet)}
          className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full border border-[#28223a] bg-[#1b1726] text-[9.5px] font-black text-white"
          aria-label={`Open ${traderName} profile`}
        >
          {item.trader.avatarDataUrl ? (
            <img
              src={item.trader.avatarDataUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            feedInitials(traderName)
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectProfile(item.trader.wallet)}
          className="min-w-0 truncate text-[13px] font-black leading-none text-[#f0edf6] transition-colors hover:text-white"
        >
          {traderName}
        </button>
        <span
          className={`rounded px-1.5 py-[3px] text-[10px] font-black leading-none ${
            isBuy ? "bg-[#06351d] text-[#19e27b]" : "bg-[#35160f] text-[#ff5e36]"
          }`}
        >
          {isBuy ? "Buy" : "Sell"}
        </span>
        <span className="ml-auto shrink-0 text-[11px] font-semibold text-[#5f596c]">
          {formatRelativeFeedTime(item.createdAt)}
        </span>
      </div>

      <Link
        href={solanaTokenPath(item.tokenMint)}
        className="mt-2 flex min-w-0 items-center gap-2 pl-8 text-[13px] leading-none"
      >
        <TokenImage token={item.token} size="xs" />
        <span className="truncate font-black text-[#e8e4f0]">{item.tokenSymbol}</span>
        <span className="shrink-0 font-mono font-black text-[#e8e4f0]">{amountLabel}</span>
        {marketCapLabel ? (
          <>
            <span className="shrink-0 text-[11px] font-semibold text-[#575165]">at</span>
            <span className="min-w-0 truncate text-[12px] font-black text-[#9690a5]">
              {marketCapLabel}
            </span>
          </>
        ) : null}
      </Link>
      <div className="mt-2 truncate pl-8 text-[11px] font-semibold text-[#5f596c]">
        {item.route || item.router}
      </div>
    </div>
  );
}

function formatFeedTradeAmount(item: AppFeedTrade, solPrice: number) {
  const usdValue = feedTradeUsdValue(item, solPrice);
  if (usdValue && usdValue > 0) {
    return usdValue >= 1_000 ? `$${formatCompact(usdValue)}` : formatUsd(usdValue);
  }

  const amount = item.side === "buy" ? item.outputAmount : Number(item.inputAmount);
  const symbol = item.side === "buy" ? item.outputSymbol : item.inputSymbol;
  if (!Number.isFinite(amount) || amount <= 0) return item.tokenSymbol;

  return `${formatCompact(amount)} ${symbol}`;
}

function feedTradeUsdValue(item: AppFeedTrade, solPrice: number) {
  const inputAmount = Number(item.inputAmount);
  const outputAmount = Number(item.outputAmount);
  const symbol = (item.side === "buy" ? item.inputSymbol : item.outputSymbol).toUpperCase();
  const amount = item.side === "buy" ? inputAmount : outputAmount;

  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (symbol === "SOL" && solPrice > 0) return amount * solPrice;
  if (symbol === "USDC" || symbol === "USDT" || symbol === "USD") return amount;
  return null;
}

function formatRelativeFeedTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 45) return "now";
  if (seconds < 60 * 60) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 24 * 60 * 60) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 24 * 60 * 60) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function feedInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function LeaderboardRankMark({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-black ${
          rank === 1
            ? "bg-[#f6c94b] text-[#24180a]"
            : rank === 2
              ? "bg-[#b9b8c4] text-[#17151e]"
              : "bg-[#b36d35] text-[#1d1108]"
        }`}
      >
        {rank}
      </div>
    );
  }

  return (
    <div className="grid h-7 w-7 place-items-center font-mono text-[13px] font-bold text-[#8f879d]">
      {rank}.
    </div>
  );
}

function LeaderboardAvatar({ trader }: { trader: AppLeaderboardUser }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[#28223a] bg-[#201d2c] text-[11px] font-black text-white">
      {trader.avatarDataUrl ? (
        <img
          src={trader.avatarDataUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        trader.displayName.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

function LeaderboardRow({
  trader,
  rank,
  solPrice,
  onSelectProfile,
}: {
  trader: AppLeaderboardUser;
  rank: number;
  solPrice: number;
  onSelectProfile: (wallet: string) => void;
}) {
  const volumeUsd = trader.volumeSol * solPrice;
  const volumeLabel = volumeUsd > 0 ? `$${formatCompact(volumeUsd)}` : `${trader.trades} swaps`;
  const handle = trader.username || shortAddress(trader.wallet);

  return (
    <button
      type="button"
      onClick={() => onSelectProfile(trader.wallet)}
      className="flex w-full items-center gap-3 border-b border-[#151220] px-3.5 py-3 text-left transition-colors hover:bg-[#171421]"
    >
      <LeaderboardRankMark rank={rank} />
      <LeaderboardAvatar trader={trader} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-black text-[#f2eff8]">{trader.displayName}</div>
        <div className="mt-0.5 truncate text-[11px] font-semibold text-[#8f879d]">@{handle}</div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <span className="rounded bg-[#07351e] px-2 py-0.5 text-[10px] font-black text-[#20d772]">
            B {trader.buys}
          </span>
          <span className="rounded bg-[#35160f] px-2 py-0.5 text-[10px] font-black text-[#ff5e36]">
            S {trader.sells}
          </span>
          {trader.latestTokens.slice(0, 2).map((symbol) => (
            <span
              key={symbol}
              className="max-w-[52px] truncate rounded bg-[#1b1726] px-1.5 py-0.5 text-[10px] font-bold text-[#9e96af]"
            >
              {symbol}
            </span>
          ))}
          {trader.latestTokens.length > 2 ? (
            <span className="rounded bg-[#1b1726] px-1.5 py-0.5 text-[10px] font-bold text-[#9e96af]">
              {trader.latestTokens.length - 2}+
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-[13px] font-black text-[#20d772]">{volumeLabel}</div>
        <div className="mt-1 text-[11px] font-semibold text-[#7a7488]">{trader.trades} swaps</div>
      </div>
    </button>
  );
}

const sidebarPrimaryTabs = ["Tokens", "Leaderboard", "Feed"];
const sidebarFilterTabs = ["Watchlist", "Crypto", "Trending", "Most held", "Graduates"];
const leaderboardPeriods: { key: AppLeaderboardPeriod; label: string }[] = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "all", label: "ALL" },
];
const hiddenSidebarTabs = new Set(["Alerts"]);
const legacyWatchlistStorageKey = "chadwallet_watchlist";
const localTradeReceiptStorageKey = "chadwallet-trade-receipts";

function watchlistStorageKey(wallet?: string) {
  return wallet ? `${legacyWatchlistStorageKey}:${wallet}` : legacyWatchlistStorageKey;
}

function readStoredWatchlist(key: string) {
  try {
    return (JSON.parse(localStorage.getItem(key) || "[]") as string[]).filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredWatchlist(key: string, mints: string[]) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(mints.filter(Boolean)))));
}

function normalizeSidebarPane(pane: SidebarPaneState): SidebarPaneState {
  return hiddenSidebarTabs.has(pane.activeTab) ? { ...pane, activeTab: "Tokens" } : pane;
}

function normalizeSidebarColumn(column: SidebarColumnState): SidebarColumnState {
  return {
    ...column,
    topPane: normalizeSidebarPane(column.topPane),
    bottomPane: normalizeSidebarPane(column.bottomPane),
  };
}

type TradePageProps = {
  mint: string;
  initialView?: "trade" | "profile";
  profileIdentifier?: string | null;
};

export function TradePage({
  mint,
  initialView = "trade",
  profileIdentifier = null,
}: TradePageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? user?.wallet?.address;
  const ownProfile = useStoredUserProfile(walletAddress);
  const routeProfile = useStoredUserProfileByIdentifier(profileIdentifier);
  const initialToken = useMemo(() => createFallbackToken(mint), [mint]);
  const market = useTokenMarket(mint);
  const solMarket = useTokenMarket(SOL_MINT);
  const {
    data: trending = [],
    isLoading: trendingLoading,
    isError: trendingError,
  } = useTrendingTokens();
  const { data: crypto = [], isLoading: cryptoLoading } = useCryptoTokens();
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<AppLeaderboardPeriod>("24h");
  const leaderboard = useAppLeaderboard(leaderboardPeriod);
  const appFeed = useAppFeedTrades();
  const [chartInterval, setChartInterval] = useState<ChartInterval>("15m");
  const [copiedMint, setCopiedMint] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [centerView, setCenterView] = useState<"trade" | "profile">(initialView);
  const [selectedProfileWallet, setSelectedProfileWallet] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<TokenPreviewState | null>(null);
  const [geckoChartHeight, setGeckoChartHeight] = useState(DEFAULT_GECKO_CHART_HEIGHT);
  const tokenPreviewTimer = useRef<number | null>(null);

  const defaultPane = (tab = "Tokens"): SidebarPaneState => ({
    activeTab: tab,
    tokenListMode: "trending",
  });

  const [leftCol, setLeftCol] = useState<SidebarColumnState>({
    isActive: true,
    isSplitBottom: false,
    topPane: defaultPane("Tokens"),
    bottomPane: defaultPane("Tokens"),
  });

  const [rightCol, setRightCol] = useState<SidebarColumnState>({
    isActive: false,
    isSplitBottom: false,
    topPane: defaultPane("Tokens"),
    bottomPane: defaultPane("Tokens"),
  });

  // Restore sidebar layout configurations on mount
  useEffect(() => {
    const savedLeftCol = localStorage.getItem("chadwallet_left_col");
    const savedRightCol = localStorage.getItem("chadwallet_right_col");
    const savedCollapsed = localStorage.getItem("chadwallet_sidebar_collapsed");

    if (savedLeftCol) {
      try {
        setLeftCol(normalizeSidebarColumn(JSON.parse(savedLeftCol)));
      } catch (e) {
        console.error("Failed to parse left col state", e);
      }
    }
    if (savedRightCol) {
      try {
        setRightCol(normalizeSidebarColumn(JSON.parse(savedRightCol)));
      } catch (e) {
        console.error("Failed to parse right col state", e);
      }
    }
    if (savedCollapsed) {
      setIsSidebarCollapsed(savedCollapsed === "true");
    }
  }, []);

  // Save sidebar layout configurations on change
  useEffect(() => {
    localStorage.setItem("chadwallet_left_col", JSON.stringify(leftCol));
  }, [leftCol]);

  useEffect(() => {
    localStorage.setItem("chadwallet_right_col", JSON.stringify(rightCol));
  }, [rightCol]);

  useEffect(() => {
    localStorage.setItem("chadwallet_sidebar_collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const savedHeight = Number(localStorage.getItem(GECKO_CHART_HEIGHT_KEY));
    if (!Number.isFinite(savedHeight)) return;

    setGeckoChartHeight(
      Math.min(MAX_GECKO_CHART_HEIGHT, Math.max(MIN_GECKO_CHART_HEIGHT, savedHeight)),
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(GECKO_CHART_HEIGHT_KEY, String(Math.round(geckoChartHeight)));
  }, [geckoChartHeight]);

  useEffect(() => {
    return () => {
      if (tokenPreviewTimer.current) {
        window.clearTimeout(tokenPreviewTimer.current);
      }
    };
  }, []);

  const routeProfileWallet = routeProfile.data?.wallet ?? null;
  const ownProfileIdentifier = ownProfile.data?.username || walletAddress || "me";
  const currentRoutePath =
    initialView === "profile"
      ? profilePath(profileIdentifier || ownProfileIdentifier)
      : solanaTokenPath(mint);

  const openProfile = useCallback(
    (profileWallet: string) => {
      const knownProfile = leaderboard.data?.find((trader) => trader.wallet === profileWallet);
      router.push(profilePath(knownProfile?.username || profileWallet));
    },
    [leaderboard.data, router],
  );

  const openOwnProfile = useCallback(() => {
    router.push(profilePath(ownProfileIdentifier));
  }, [ownProfileIdentifier, router]);

  useEffect(() => {
    if (initialView === "profile") {
      setCenterView("profile");
      setSelectedProfileWallet(
        routeProfileWallet && routeProfileWallet !== walletAddress ? routeProfileWallet : null,
      );
    } else {
      setCenterView("trade");
      setSelectedProfileWallet(null);
    }
    setLeftCol((current) => ({
      ...current,
      isActive: true,
      topPane: {
        ...current.topPane,
        activeTab: "Tokens",
      },
    }));
  }, [initialView, mint, routeProfileWallet, walletAddress]);

  const token = market.data ?? initialToken;
  const solPrice = solMarket.data?.price || (token.mint === SOL_MINT ? token.price : 0);
  const history = useTokenOhlcv(token.mint, chartInterval);
  const hasGeckoTerminal = Boolean(history.data?.geckoPoolAddress);
  const up = token.change24h >= 0;

  const startGeckoChartResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const startY = event.clientY;
      const startHeight = geckoChartHeight;

      const handleMove = (moveEvent: PointerEvent) => {
        const nextHeight = startHeight + moveEvent.clientY - startY;
        setGeckoChartHeight(
          Math.min(MAX_GECKO_CHART_HEIGHT, Math.max(MIN_GECKO_CHART_HEIGHT, nextHeight)),
        );
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [geckoChartHeight],
  );

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const storedWatchlist = useStoredWatchlist(walletAddress);
  const watchlistMarkets = useWatchlistTokenMarkets(watchlist);

  useEffect(() => {
    if (!walletAddress) {
      setWatchlist(readStoredWatchlist(legacyWatchlistStorageKey));
      return;
    }

    const walletKey = watchlistStorageKey(walletAddress);
    const hasWalletList = localStorage.getItem(walletKey) !== null;
    const walletSaved = readStoredWatchlist(walletKey);
    const legacySaved = readStoredWatchlist(legacyWatchlistStorageKey);
    const saved = Array.from(new Set(hasWalletList ? walletSaved : legacySaved));

    setWatchlist(saved);

    if (!hasWalletList && legacySaved.length) {
      writeStoredWatchlist(walletKey, legacySaved);
      localStorage.removeItem(legacyWatchlistStorageKey);

      for (const mint of legacySaved) {
        void syncWatchlistToken({ wallet: walletAddress, mint, watched: true });
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!storedWatchlist.data) return;
    setWatchlist((current) => {
      const merged = Array.from(new Set([...storedWatchlist.data, ...current]));
      writeStoredWatchlist(watchlistStorageKey(walletAddress), merged);
      return merged;
    });
  }, [storedWatchlist.data, walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;

    try {
      const receipts = JSON.parse(
        window.localStorage.getItem(localTradeReceiptStorageKey) || "[]",
      ) as TradeReceiptRecord[];
      const mainnetReceipts = receipts.filter(
        (receipt) =>
          receipt.mode === "mainnet" &&
          receipt.wallet?.toLowerCase() === walletAddress.toLowerCase() &&
          receipt.signature,
      );

      if (!mainnetReceipts.length) return;

      void Promise.allSettled(mainnetReceipts.map((receipt) => recordTradeReceipt(receipt))).then(
        () => {
          void queryClient.invalidateQueries({ queryKey: ["trade-receipts", walletAddress] });
          void queryClient.invalidateQueries({ queryKey: ["app-leaderboard"] });
        },
      );
    } catch {
      // Local receipts are best-effort recovery data only.
    }
  }, [queryClient, walletAddress]);

  const toggleWatchlist = (mint: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(mint) ? prev.filter((m) => m !== mint) : [...prev, mint];
      const watched = next.includes(mint);
      writeStoredWatchlist(watchlistStorageKey(walletAddress), next);
      if (walletAddress) {
        localStorage.removeItem(legacyWatchlistStorageKey);
        queryClient.setQueryData(["watchlist", walletAddress], next);
      }
      void syncWatchlistToken({ wallet: walletAddress, mint, watched }).finally(() => {
        if (walletAddress) {
          void queryClient.invalidateQueries({ queryKey: ["watchlist", walletAddress] });
        }
      });
      return next;
    });
  };

  const holders = useTokenHolders(token.mint, true);
  const top10Holding = useMemo(() => {
    if (!holders.data?.data || holders.data.data.length === 0) return "13.63%";
    const total = holders.data.data.slice(0, 10).reduce((sum, h) => sum + (h.pct || 0), 0);
    return total > 0 ? `${total.toFixed(2)}%` : "13.63%";
  }, [holders.data]);

  const trendingTokens = useMemo(() => uniqueTokens(trending), [trending]);
  const watchlistTokens = useMemo(() => {
    const watchedCurrentToken = watchlist.includes(token.mint) ? [token] : [];
    const watchedTrendingTokens = trendingTokens.filter((item) => watchlist.includes(item.mint));
    return uniqueTokens([
      ...(watchlistMarkets.data ?? []),
      ...watchedTrendingTokens,
      ...watchedCurrentToken,
    ]);
  }, [token, trendingTokens, watchlist, watchlistMarkets.data]);
  const mostHeldTokens = useMemo(
    () =>
      [...trendingTokens].sort((a, b) => {
        const holderDiff = (b.holders || 0) - (a.holders || 0);
        if (holderDiff !== 0) return holderDiff;
        return b.marketCap - a.marketCap;
      }),
    [trendingTokens],
  );
  const cryptoTokens = useMemo(() => uniqueTokens(crypto).filter(isLiveCryptoToken), [crypto]);
  const graduatedTokens = useMemo(
    () => trendingTokens.filter(isLikelyGraduatedToken),
    [trendingTokens],
  );

  const tokenListSubtitle = trendingError ? "Live feed reconnecting" : "Live GeckoTerminal pools";

  const handleCloseLeftColumn = () => {
    if (rightCol.isActive) {
      setLeftCol({
        ...rightCol,
        isActive: true,
      });
      setRightCol({
        ...rightCol,
        isActive: false,
      });
    }
  };

  const handleCloseRightColumn = () => {
    setRightCol({
      ...rightCol,
      isActive: false,
    });
  };

  const renderSidebarPane = (
    pane: SidebarPaneState,
    setPane: (p: SidebarPaneState) => void,
    showClose: boolean,
    onClose: () => void,
    showCollapse: boolean,
    showSplitControls: boolean,
    onSplitBottom: () => void,
    onSplitRight: () => void,
  ) => {
    const paneTokens =
      pane.tokenListMode === "most-held"
        ? mostHeldTokens
        : pane.tokenListMode === "watchlist"
          ? watchlistTokens
          : pane.tokenListMode === "crypto"
            ? cryptoTokens
            : pane.tokenListMode === "graduates"
              ? graduatedTokens
              : trendingTokens;
    const paneLoading = pane.tokenListMode === "crypto" ? cryptoLoading : trendingLoading;
    const leaderboardRows = leaderboard.data ?? [];
    const ownLeaderboardIndex = walletAddress
      ? leaderboardRows.findIndex((trader) => trader.wallet === walletAddress)
      : -1;
    const ownLeaderboard = ownLeaderboardIndex >= 0 ? leaderboardRows[ownLeaderboardIndex] : null;
    const visibleLeaderboardRows = leaderboardRows.slice(0, 20);
    const selectLeaderboardProfile = (profileWallet: string) => {
      openProfile(profileWallet);
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Tab Headers */}
        <div className="shrink-0 bg-[#12111a] rounded-t-xl">
          <div className="flex h-[36px] items-center gap-2 overflow-x-auto overflow-y-hidden p-2 pl-3 bg-[#12111a] rounded-t-xl border-b border-[#1b1726]/60 no-scrollbar">
            {sidebarPrimaryTabs.map((tab, idx) => (
              <div key={tab} className="flex items-center gap-2 shrink-0">
                {idx > 0 && <span className="h-3.5 w-[1px] bg-[#1d1928] shrink-0" />}
                <button
                  type="button"
                  onClick={() => setPane({ ...pane, activeTab: tab })}
                  className={`inline-flex h-5 items-center justify-center text-[14px] font-semibold transition-colors ${
                    tab === pane.activeTab
                      ? "text-white font-bold"
                      : "text-[#9099a3] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              </div>
            ))}

            <div className="ml-auto flex items-center gap-2 shrink-0 pr-1">
              {showClose && (
                <X
                  onClick={onClose}
                  className="h-3.5 w-3.5 text-[#554f63] cursor-pointer hover:text-white transition-colors"
                />
              )}
              {showCollapse && (
                <ChevronsLeft
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="h-4 w-4 text-[#554f63] cursor-pointer hover:text-white transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {pane.activeTab === "Tokens" ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Filter Bar */}
            <div className="shrink-0 flex h-[36px] items-center gap-2 overflow-x-auto overflow-y-hidden px-3 pt-2 pb-1 bg-[#08060f] no-scrollbar">
              {sidebarFilterTabs.map((label) => {
                const key =
                  label === "Watchlist"
                    ? "watchlist"
                    : label === "Crypto"
                      ? "crypto"
                      : label === "Trending"
                        ? "trending"
                        : label === "Most held"
                          ? "most-held"
                          : label === "Graduates"
                            ? "graduates"
                            : "trending";
                const active = pane.tokenListMode === key;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPane({ ...pane, tokenListMode: key })}
                    className={`h-6 shrink-0 rounded-md px-1.5 text-[12px] font-medium transition-colors ${
                      active
                        ? "bg-[#1f1c2b] text-white font-semibold"
                        : "bg-transparent text-[#9099a3] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Tokens list */}
            <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#08060f] no-scrollbar">
              {paneLoading && paneTokens.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-muted-foreground">
                  Loading live tokens...
                </div>
              )}
              {!paneLoading && paneTokens.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-muted-foreground">
                  No live tokens in this section yet.
                </div>
              )}
              {paneTokens.map((item) => (
                <TrendingToken
                  key={item.mint}
                  token={item}
                  active={item.mint === token.mint}
                  onPreview={showTokenPreview}
                  onPreviewEnd={() => hideTokenPreview()}
                />
              ))}
            </div>
          </div>
        ) : pane.activeTab === "Alerts" || pane.activeTab === "Feed" ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 flex h-10 items-center justify-between border-b border-[#17131f] bg-[#08060f] px-3.5 text-[12px] font-semibold text-[#8f879d]">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
              </div>
              {appFeed.isFetching ? (
                <span className="rounded-full bg-[#242033] px-2 py-1 text-[10px] font-black text-[#8ea2ff]">
                  LIVE
                </span>
              ) : null}
            </div>
            <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#08060f] no-scrollbar">
              {appFeed.isLoading ? (
                <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
                  Loading live app activity
                </div>
              ) : null}
              {!appFeed.isLoading && !appFeed.data?.length ? (
                <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
                  No recorded swaps yet
                </div>
              ) : null}
              {(appFeed.data ?? []).map((item) => (
                <FeedTradeItem
                  key={`${item.signature}-${item.side}-${item.createdAt}`}
                  item={item}
                  solPrice={solPrice}
                  onSelectProfile={selectLeaderboardProfile}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Leaderboard Tab */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[#1b1726]/60 bg-[#08060f] px-3.5 py-3">
              <div className="mb-3 flex items-center gap-1.5">
                {leaderboardPeriods.map((period) => {
                  const active = leaderboardPeriod === period.key;
                  return (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setLeaderboardPeriod(period.key)}
                      className={`h-7 rounded-md px-2.5 text-[11px] font-black transition-colors ${
                        active
                          ? "bg-[#242033] text-white"
                          : "bg-[#0d0a14] text-[#5f596c] hover:text-white"
                      }`}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-[#8f879d]">
                <div>Your rank</div>
                <div>Volume</div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#28223a] bg-[#201d2c] text-[11px] font-black text-white">
                  {ownLeaderboard?.avatarDataUrl ? (
                    <img
                      src={ownLeaderboard.avatarDataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    (ownLeaderboard?.displayName ?? user?.google?.name ?? "You")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[16px] font-black text-[#8ea2ff]">
                    {ownLeaderboardIndex >= 0 ? `#${ownLeaderboardIndex + 1}` : "# -"}
                  </div>
                  <div className="truncate text-[11px] font-semibold text-[#756f83]">
                    {ownLeaderboard
                      ? `${ownLeaderboard.trades} swaps recorded`
                      : "No swaps in range"}
                  </div>
                </div>
                <div className="text-right font-mono text-[13px] font-black text-[#e8e4f0]">
                  {ownLeaderboard && ownLeaderboard.volumeSol > 0
                    ? `$${formatCompact(ownLeaderboard.volumeSol * solPrice)}`
                    : "--"}
                </div>
              </div>
            </div>
            <div className="terminal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#08060f] no-scrollbar">
              {leaderboard.isFetching && !visibleLeaderboardRows.length ? (
                <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
                  Loading app leaderboard
                </div>
              ) : null}
              {!leaderboard.isFetching && !visibleLeaderboardRows.length ? (
                <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
                  No ChadWallet traders in this range yet
                </div>
              ) : null}
              {visibleLeaderboardRows.map((trader, index) => (
                <LeaderboardRow
                  key={trader.wallet}
                  trader={trader}
                  rank={index + 1}
                  solPrice={solPrice}
                  onSelectProfile={selectLeaderboardProfile}
                />
              ))}
            </div>
          </div>
        )}

        {/* Split controls */}
        {showSplitControls && (
          <div
            className={`grid shrink-0 ${
              rightCol.isActive ? "grid-cols-1" : "grid-cols-2"
            } gap-2 border-t border-[#1b1726]/40 bg-transparent p-2.5 rounded-b-xl`}
          >
            <button
              onClick={onSplitBottom}
              className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-md border border-[#1b1726] bg-[#12111a] text-[11px] font-medium text-[#7a7488] hover:bg-[#1a1726] hover:text-white transition-colors"
            >
              <PanelBottom className="h-3.5 w-3.5 text-[#7a7488]" />
              Split bottom
            </button>
            {!rightCol.isActive && (
              <button
                onClick={onSplitRight}
                className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-md border border-[#1b1726] bg-[#12111a] text-[11px] font-medium text-[#7a7488] hover:bg-[#1a1726] hover:text-white transition-colors"
              >
                <Columns2 className="h-3.5 w-3.5 text-[#7a7488]" />
                Split right
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const showTokenPreview = (previewToken: Token, element: HTMLElement) => {
    if (tokenPreviewTimer.current) {
      window.clearTimeout(tokenPreviewTimer.current);
      tokenPreviewTimer.current = null;
    }

    const rect = element.getBoundingClientRect();
    const cardWidth = 276;
    const cardHeight = 204;
    const x = Math.min(Math.max(rect.right - 18, 16), window.innerWidth - cardWidth - 14);
    const y = Math.min(Math.max(rect.top - 12, 70), window.innerHeight - cardHeight - 34);

    setTokenPreview({
      token: previewToken,
      x,
      y,
      closing: false,
    });
  };

  const keepTokenPreview = () => {
    if (tokenPreviewTimer.current) {
      window.clearTimeout(tokenPreviewTimer.current);
      tokenPreviewTimer.current = null;
    }
    setTokenPreview((preview) => (preview ? { ...preview, closing: false } : preview));
  };

  const hideTokenPreview = (delay = 140) => {
    if (tokenPreviewTimer.current) {
      window.clearTimeout(tokenPreviewTimer.current);
    }
    setTokenPreview((preview) => (preview ? { ...preview, closing: true } : preview));
    tokenPreviewTimer.current = window.setTimeout(() => {
      setTokenPreview(null);
      tokenPreviewTimer.current = null;
    }, delay);
  };

  async function handleCopyMint() {
    const copied = await copyText(token.mint);
    if (!copied) return;

    setCopiedMint(true);
    window.setTimeout(() => setCopiedMint(false), 1400);
  }

  if (!hasPrivy) {
    return <div className="min-h-screen bg-[#08060f]" />;
  }

  if (!ready || !authenticated) {
    return <TradeAuthGate ready={ready} redirectTo={currentRoutePath} />;
  }

  return (
    <>
      {/* Mobile Only Overlay Container */}
      <div className="hidden max-md:flex flex-col items-center justify-between h-screen w-screen bg-[#08060f] text-[#f4f1ff] px-6 py-8 select-none">
        {/* Spacer */}
        <div className="flex-1" />

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <ChadLogo variant="dark" size="lg" showTagline={false} />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2 max-w-[280px]">
            <h2 className="text-[20px] font-bold text-white leading-tight">
              Download the app to start trading
            </h2>
          </div>

          {/* Store Buttons */}
          <div className="flex flex-col gap-3 mt-4 w-full max-w-[220px]">
            {/* App Store button */}
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-[#000000] border border-[#252137] rounded-xl px-4 py-2 text-left hover:bg-[#12111a] transition duration-200"
            >
              <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.64.73-1.2 1.87-1.05 2.97 1.1.09 2.24-.57 3-1.41z" />
              </svg>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#7a7488]">
                  Download on the
                </div>
                <div className="text-[13px] font-bold text-white leading-none">App Store</div>
              </div>
            </a>

            {/* Google Play button */}
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-[#000000] border border-[#252137] rounded-xl px-4 py-2 text-left hover:bg-[#12111a] transition duration-200"
            >
              <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M3 5.27v13.46c0 .87.8 1.45 1.57 1.1l11.45-6.73c.7-.41.7-1.42 0-1.84L4.57 4.17c-.77-.35-1.57.23-1.57 1.1z" />
              </svg>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#7a7488]">Get it on</div>
                <div className="text-[13px] font-bold text-white leading-none">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 flex flex-col justify-end w-full max-w-[340px]">
          {/* Bottom Bar Info Pill */}
          <div className="bg-[#12111a] border border-[#1b1726]/60 rounded-xl px-4 py-2.5 text-[11px] text-[#7a7488] font-bold flex items-center justify-center gap-2 text-center w-full">
            <svg
              className="h-3.5 w-3.5 text-[#7a7488]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>chadwallet on Web is only available on desktop.</span>
          </div>
        </div>
      </div>

      {/* Main Desktop/Tablet Layout */}
      <div className="fomo-terminal max-md:hidden flex h-svh max-h-svh flex-col bg-[#08060f] text-[#f4f1ff] overflow-hidden">
        <header className="sticky top-0 z-30 shrink-0 bg-[#08060f]/95 backdrop-blur-md">
          <div className="flex h-[50px] items-center justify-between border-b border-[#14101d] px-2">
            <div className="flex items-center gap-4 pl-3">
              <ChadLogo variant="dark" size="sm" showTagline={false} className="fomo-logo" />
            </div>

            <div className="flex-1 max-w-[640px] px-4">
              <TokenSearch />
            </div>

            <div className="flex items-center justify-end gap-2 pr-3">
              <TradeAccount solPrice={solPrice} />
            </div>
          </div>
        </header>

        <main className="flex flex-1 min-h-0 gap-2 overflow-hidden px-2 pb-2 pt-2">
          {!isSidebarCollapsed ? (
            <>
              {/* Left Sidebar Column */}
              {leftCol.isActive && (
                <aside className="w-[338px] shrink-0 flex flex-col overflow-hidden rounded-lg border border-[#1b1726] bg-[#08060f] shadow-[0_8px_32px_rgba(0,0,0,0.34)]">
                  {!leftCol.isSplitBottom ? (
                    renderSidebarPane(
                      leftCol.topPane,
                      (p) => setLeftCol({ ...leftCol, topPane: p }),
                      rightCol.isActive, // showClose
                      handleCloseLeftColumn, // onClose
                      true, // showCollapse
                      true, // showSplitControls
                      () => setLeftCol({ ...leftCol, isSplitBottom: true }),
                      () => setRightCol({ ...rightCol, isActive: true }),
                    )
                  ) : (
                    <>
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-b border-[#1b1726]/60">
                        {renderSidebarPane(
                          leftCol.topPane,
                          (p) => setLeftCol({ ...leftCol, topPane: p }),
                          true, // showClose
                          () => setLeftCol({ ...leftCol, isSplitBottom: false }),
                          true, // showCollapse
                          false, // showSplitControls
                          () => {},
                          () => {},
                        )}
                      </div>
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {renderSidebarPane(
                          leftCol.bottomPane,
                          (p) => setLeftCol({ ...leftCol, bottomPane: p }),
                          true, // showClose
                          () => setLeftCol({ ...leftCol, isSplitBottom: false }),
                          false, // showCollapse
                          true, // showSplitControls
                          () => {},
                          () => setRightCol({ ...rightCol, isActive: true }),
                        )}
                      </div>
                    </>
                  )}
                </aside>
              )}

              {/* Right Sidebar Column */}
              {rightCol.isActive && (
                <aside className="w-[338px] shrink-0 flex flex-col overflow-hidden rounded-lg border border-[#1b1726] bg-[#08060f] shadow-[0_8px_32px_rgba(0,0,0,0.34)]">
                  {!rightCol.isSplitBottom ? (
                    renderSidebarPane(
                      rightCol.topPane,
                      (p) => setRightCol({ ...rightCol, topPane: p }),
                      true, // showClose
                      handleCloseRightColumn, // onClose
                      false, // showCollapse
                      true, // showSplitControls
                      () => setRightCol({ ...rightCol, isSplitBottom: true }),
                      () => {},
                    )
                  ) : (
                    <>
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-b border-[#1b1726]/60">
                        {renderSidebarPane(
                          rightCol.topPane,
                          (p) => setRightCol({ ...rightCol, topPane: p }),
                          true, // showClose
                          () => setRightCol({ ...rightCol, isSplitBottom: false }),
                          false, // showCollapse
                          false, // showSplitControls
                          () => {},
                          () => {},
                        )}
                      </div>
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {renderSidebarPane(
                          rightCol.bottomPane,
                          (p) => setRightCol({ ...rightCol, bottomPane: p }),
                          true, // showClose
                          () => setRightCol({ ...rightCol, isSplitBottom: false }),
                          false, // showCollapse
                          true, // showSplitControls
                          () => {},
                          () => {},
                        )}
                      </div>
                    </>
                  )}
                </aside>
              )}
            </>
          ) : (
            <div className="shrink-0 flex items-start pt-1.5">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1b1726] bg-[#12111a] hover:bg-[#1f1c2b] text-[#7a7488] hover:text-white transition-colors"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <section
            className={`flex-1 flex min-w-0 flex-col min-h-0 ${
              centerView === "profile"
                ? "overflow-hidden bg-[#08060f]"
                : `rounded-lg border border-[#1b1726]/70 bg-transparent ${
                    hasGeckoTerminal
                      ? "terminal-scroll overflow-y-auto overflow-x-hidden overscroll-contain"
                      : "overflow-hidden"
                  }`
            }`}
          >
            {centerView === "profile" ? (
              <TradeProfileCenter
                solPrice={solPrice}
                viewedWallet={selectedProfileWallet}
                onBackToOwnProfile={openOwnProfile}
                onSelectProfile={openProfile}
              />
            ) : (
              <>
                {/* Token Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b1726]/60 bg-transparent px-4 py-2.5 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <TokenImage token={token} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#12111a] bg-[#2f80ed]">
                        <svg
                          className="h-[7px] w-[7px] text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-white leading-none">
                          {token.name}
                        </span>
                        <span className="text-[11px] text-[#7a7488] font-bold font-mono uppercase bg-[#1b1726]/30 px-1.5 py-0.5 rounded border border-[#1b1726]/40 leading-none">
                          {token.symbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWatchlist(token.mint)}
                          className="text-[#7a7488] hover:text-amber-400 transition-colors ml-1"
                          title={
                            watchlist.includes(token.mint)
                              ? "Remove from watchlist"
                              : "Add to watchlist"
                          }
                        >
                          <Star
                            className={`h-4.5 w-4.5 ${
                              watchlist.includes(token.mint)
                                ? "fill-amber-400 text-amber-400"
                                : "text-[#7a7488]"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={handleCopyMint}
                          className="text-[11px] font-mono text-[#5c5669] hover:text-white flex items-center gap-1 transition-colors leading-none"
                        >
                          <span>
                            {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                          </span>
                          <Copy className="h-3 w-3" />
                          {copiedMint && <span className="text-[#20d772] text-[10px]">Copied</span>}
                        </button>
                        <span className="h-2.5 w-[1px] bg-[#1b1726] shrink-0" />
                        <div className="flex items-center gap-1.5 text-[#5c5669]">
                          <a
                            href={`https://${token.symbol.toLowerCase()}.com`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-white transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <a
                            href={`https://twitter.com/search?q=${token.symbol}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-white transition-colors"
                          >
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </a>
                          <a
                            href={`https://t.me/${token.symbol.toLowerCase()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-white transition-colors"
                          >
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.74 3.79-1.65 6.32-2.73 7.57-3.23 3.6-1.44 4.35-1.69 4.84-1.69.11 0 .35.03.5.15.13.12.17.28.19.39.02.12.02.26.01.38z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 overflow-x-auto no-scrollbar ml-auto pl-4 shrink-0 select-none max-w-[60%]">
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        Market Cap
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        ${formatCompact(token.marketCap)}
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        Price
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        {formatUsd(token.price)}
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        24H change
                      </span>
                      <span
                        className={`text-[13px] font-bold font-mono mt-0.5 flex items-center gap-0.5 whitespace-nowrap ${up ? "text-[#20d772]" : "text-[#ff5e36]"}`}
                      >
                        <span>{up ? "^" : "v"}</span>
                        <span>{Math.abs(token.change24h).toFixed(2)}%</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        24h Vol.
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        ${formatCompact(token.volume24h)}
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        Liquidity
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        ${formatCompact(token.liquidity ?? token.marketCap * 0.08)}
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        Holders
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        {token.holders > 0 ? formatCompact(token.holders) : "21K"}
                      </span>
                    </div>
                    <div className="flex flex-col items-start leading-tight shrink-0">
                      <span className="text-[10px] text-[#7a7488] font-medium uppercase tracking-wider whitespace-nowrap">
                        Top 10 holding
                      </span>
                      <span className="text-[13px] font-bold text-[#e8e4f0] font-mono mt-0.5 whitespace-nowrap">
                        {top10Holding}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart Area */}
                <div
                  className={`relative bg-transparent ${
                    hasGeckoTerminal ? "shrink-0" : "min-h-[300px] flex-1"
                  }`}
                  style={hasGeckoTerminal ? { height: `${geckoChartHeight}px` } : undefined}
                >
                  {history.data?.data.length || history.data?.geckoPoolAddress ? (
                    <PriceChart
                      data={history.data.data ?? []}
                      dataStatus={history.data.status}
                      provider={history.data.provider}
                      geckoPoolAddress={history.data.geckoPoolAddress}
                      geckoTokenSide={history.data.geckoTokenSide}
                      geckoPoolName={history.data.geckoPoolName}
                      geckoPoolDex={history.data.geckoPoolDex}
                      updatedAt={history.data.updatedAt}
                      token={token}
                      solPrice={solPrice}
                      interval={chartInterval}
                      onIntervalChange={setChartInterval}
                    />
                  ) : (
                    <LiveState
                      title={
                        history.isFetching
                          ? "Loading live chart"
                          : history.data?.status === "unavailable"
                            ? "Live chart temporarily unavailable"
                            : "Live chart unavailable"
                      }
                      detail={
                        history.isFetching
                          ? "Pulling live OHLCV candles for this token."
                          : "This token has live pricing, but chart candles have not landed from the market data providers yet."
                      }
                    />
                  )}
                  {hasGeckoTerminal && (
                    <button
                      type="button"
                      aria-label="Resize Gecko chart"
                      title="Drag to resize chart. Double-click to reset."
                      onPointerDown={startGeckoChartResize}
                      onDoubleClick={() => setGeckoChartHeight(DEFAULT_GECKO_CHART_HEIGHT)}
                      className="absolute bottom-1 left-1/2 z-20 flex h-4 w-16 -translate-x-1/2 cursor-row-resize items-center justify-center rounded-full border border-[#2b2638]/80 bg-[#0c0a12]/90 text-[#8f879e] shadow-[0_0_14px_rgba(0,0,0,0.45)] transition hover:border-[#6d5dfc]/70 hover:text-white"
                    >
                      <span className="h-[2px] w-8 rounded-full bg-current" />
                    </button>
                  )}
                </div>

                {!hasGeckoTerminal && (
                  <>
                    {/* Chart Overlays Bar */}
                    <div className="flex items-center gap-4 border-t border-[#1b1726]/40 bg-transparent px-4 py-1.5 shrink-0 text-[11px] text-[#7a7488] select-none no-scrollbar overflow-x-auto">
                      <span className="font-semibold text-[#5c5669] shrink-0">Chart overlays</span>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="accent-[#20d772] h-3 w-3 rounded border-[#2a2745] bg-[#12111a]"
                        />
                        <span>My swaps</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="accent-[#20d772] h-3 w-3 rounded border-[#2a2745] bg-[#12111a]"
                        />
                        <span>Thesis</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          className="accent-[#20d772] h-3 w-3 rounded border-[#2a2745] bg-[#12111a]"
                        />
                        <span>Friends only</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="accent-[#20d772] h-3 w-3 rounded border-[#2a2745] bg-[#12111a]"
                        />
                        <span>Min size (&gt;$1K)</span>
                      </label>
                    </div>

                    {/* Bottom Activity Section */}
                    <MarketActivity token={token} />
                  </>
                )}
              </>
            )}
          </section>

          {centerView === "profile" ? (
            selectedProfileWallet && selectedProfileWallet !== walletAddress ? (
              <ProfileSendPanel solPrice={solPrice} recipientWallet={selectedProfileWallet} />
            ) : (
              <FollowTopTradersPanel onSelectProfile={openProfile} />
            )
          ) : (
            <aside className="w-[320px] 2xl:w-[340px] shrink-0 flex flex-col overflow-y-auto pb-2 no-scrollbar">
              <SwapPanel token={token} solPrice={solPrice} />
            </aside>
          )}
        </main>

        {tokenPreview && (
          <TokenHoverPreview
            preview={tokenPreview}
            onPreviewStay={keepTokenPreview}
            onPreviewEnd={() => hideTokenPreview(110)}
          />
        )}

        <TradeFooterTicker solPrice={solPrice} />
      </div>
    </>
  );
}

function TradeAuthGate({ ready, redirectTo }: { ready: boolean; redirectTo: string }) {
  const router = useRouter();
  const loginStarted = useRef(false);
  const redirectStarted = useRef(false);
  const redirectAfterLogin = useCallback(() => {
    if (redirectStarted.current) return;

    redirectStarted.current = true;
    router.replace(redirectTo as Route);

    window.setTimeout(() => {
      const target = new URL(redirectTo, window.location.origin);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (current !== `${target.pathname}${target.search}${target.hash}`) {
        window.location.assign(target.toString());
      }
    }, 250);
  }, [redirectTo, router]);
  const { login } = useLogin({
    onComplete: redirectAfterLogin,
    onError: (error) => {
      if (!isLoginCancellation(error)) {
        alert(`Privy login failed: ${String(error)}`);
      }
    },
  });

  useEffect(() => {
    if (window.sessionStorage.getItem(MANUAL_LOGOUT_REDIRECT_KEY)) {
      window.sessionStorage.removeItem(MANUAL_LOGOUT_REDIRECT_KEY);
      window.location.replace("/");
      return;
    }

    if (ready && !loginStarted.current) {
      loginStarted.current = true;
      login();
    }
  }, [login, ready]);

  return (
    <div
      aria-label="Opening ChadWallet sign in"
      className="min-h-screen bg-[#08060f]"
      role="status"
    />
  );
}

function isLoginCancellation(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : String(error);

  return /exited_auth_flow|user_canceled|user_cancelled|login_cancelled/i.test(message);
}

function TrendingToken({
  token,
  active,
  onPreview,
  onPreviewEnd,
}: {
  token: Token;
  active: boolean;
  onPreview: (token: Token, element: HTMLElement) => void;
  onPreviewEnd: () => void;
}) {
  const direction = token.change24h > 0 ? "up" : token.change24h < 0 ? "down" : "flat";
  const priceFlash = useValueFlash(token.price);
  const marketCapFlash = useValueFlash(token.marketCap);
  const rowFlash = priceFlash.direction ?? marketCapFlash.direction;
  const toneClass =
    direction === "up"
      ? "token-live-tone-up"
      : direction === "down"
        ? "token-live-tone-down"
        : "token-live-tone-flat";

  return (
    <Link
      href={solanaTokenPath(token.mint)}
      onPointerEnter={(event) => onPreview(token, event.currentTarget)}
      onFocus={(event) => onPreview(token, event.currentTarget)}
      onPointerLeave={onPreviewEnd}
      onBlur={onPreviewEnd}
      className={`token-live-row flex items-center gap-3 px-3.5 py-2 transition-colors ${
        active ? "bg-[#1f1c2b]" : "hover:bg-[#151221]/50"
      } ${rowFlash === "up" ? "token-live-row-up" : rowFlash === "down" ? "token-live-row-down" : ""}`}
      data-flash-id={`${priceFlash.tick}-${marketCapFlash.tick}`}
    >
      <div className="relative shrink-0">
        <TokenImage token={token} size="sm" />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#12111a] bg-[#2f80ed]">
          <svg
            className="h-[7px] w-[7px] text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <span className="truncate text-[13.5px] font-bold text-[#e8e4f0] leading-none">
            {token.name}
          </span>
          <span
            key={`mc-${marketCapFlash.tick}`}
            className={`token-live-value token-live-mcap text-[13.5px] font-bold leading-none text-[#e8e4f0] ${
              marketCapFlash.direction === "up"
                ? "token-live-value-up"
                : marketCapFlash.direction === "down"
                  ? "token-live-value-down"
                  : ""
            }`}
          >
            <span className="token-live-money">${formatCompact(token.marketCap)}</span>
            <span className="token-live-unit"> MC</span>
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            key={`price-${priceFlash.tick}`}
            className={`token-live-value token-live-price truncate text-[11.5px] leading-none ${
              priceFlash.direction === "up"
                ? "token-live-value-up"
                : priceFlash.direction === "down"
                  ? "token-live-value-down"
                  : ""
            }`}
          >
            {formatUsd(token.price)}
          </span>
          <span
            className={`token-change-pill flex items-center gap-1 text-[11px] font-semibold leading-none ${toneClass}`}
          >
            <span className="token-change-triangle" aria-hidden="true" />
            <span>{Math.abs(token.change24h).toFixed(2)}%</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function useValueFlash(value: number) {
  const previous = useRef(value);
  const timeout = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ direction: "up" | "down" | null; tick: number }>({
    direction: null,
    tick: 0,
  });

  useEffect(() => {
    if (!Number.isFinite(value)) return;

    const last = previous.current;
    previous.current = value;

    if (!Number.isFinite(last) || value === last) return;

    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    setFlash((current) => ({
      direction: value > last ? "up" : "down",
      tick: current.tick + 1,
    }));
    timeout.current = window.setTimeout(
      () => setFlash((current) => ({ ...current, direction: null })),
      950,
    );

    return () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
    };
  }, [value]);

  return flash;
}

function TokenHoverPreview({
  preview,
  onPreviewStay,
  onPreviewEnd,
}: {
  preview: TokenPreviewState;
  onPreviewStay: () => void;
  onPreviewEnd: () => void;
}) {
  const { token, x, y } = preview;
  const up = token.change24h >= 0;
  const logo = sanitizeImageUrl(token.logo);
  const topHolding = estimateTopHolding(token);
  const liquidity = token.liquidity ?? token.marketCap * 0.08;

  return (
    <div
      onPointerEnter={onPreviewStay}
      onPointerLeave={onPreviewEnd}
      className={`fixed z-50 w-[276px] rounded-xl border border-[#252033] bg-[#15131d]/98 p-2.5 text-[#f4f1ff] shadow-[0_16px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
        preview.closing ? "token-preview-out" : "token-preview-in"
      }`}
      style={{ left: x, top: y }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="relative shrink-0">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-8 w-8 rounded-full border border-[#272236] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full border border-[#272236] bg-[#211d2b] text-[10px] font-medium text-white">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-[#15131d] bg-[#5365ff]">
            <svg
              className="h-1.5 w-1.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>

        <Star className="h-[18px] w-[18px] shrink-0 text-[#5c5669]" />
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-[13px] font-medium leading-none text-white">
              {token.name}
            </div>
            <span className="rounded bg-[#2a2634] px-1 py-0.5 text-[8.5px] font-medium uppercase leading-none text-[#a9b0d4]">
              {token.symbol.slice(0, 6)}
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-[#8f879d]">{token.symbol}</div>
        </div>

        <div className="text-right">
          <div className="text-[14px] font-medium leading-none text-white">
            ${formatCompact(token.marketCap)} MC
          </div>
          <div
            className={`mt-1 text-[11px] font-medium leading-none ${up ? "text-[#20d772]" : "text-[#ff653d]"}`}
          >
            {up ? "^" : "v"} {Math.abs(token.change24h).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-2.5 space-y-2 text-[11px] font-medium">
        <PreviewMetric label="Vol 24h" value={`$${formatCompact(token.volume24h)}`} />
        <PreviewMetric label="Holders" value={formatCompact(token.holders)} />
        <PreviewMetric label="Liquidity" value={`$${formatCompact(liquidity)}`} />
        <PreviewMetric label="Top 10" value={`${topHolding.toFixed(2)}%`} />
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[#8f879d]">Contract</span>
          <span className="h-px min-w-0 flex-1 border-t border-dashed border-[#2a2634]" />
          <span className="max-w-[104px] truncate text-[10.5px] font-medium text-white">
            {shortAddress(token.mint)}
          </span>
          <Copy className="h-3 w-3 shrink-0 text-[#5c5669]" />
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[#8f879d]">{label}</span>
      <span className="h-px min-w-0 flex-1 border-t border-dashed border-[#2a2634]" />
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function TokenImage({ token, size = "sm" }: { token: Token; size?: "xs" | "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-10 w-10" : size === "xs" ? "h-5 w-5" : "h-8 w-8";
  const px = size === "lg" ? 40 : size === "xs" ? 20 : 32;
  const logo = sanitizeImageUrl(token.logo);

  if (!logo) {
    return (
      <div
        className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-primary/20 text-[9px] font-bold text-primary`}
      >
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt=""
      width={px}
      height={px}
      loading="lazy"
      className={`${sizeClass} shrink-0 rounded-full bg-muted object-cover`}
      onError={(event) => {
        (event.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

function sanitizeImageUrl(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return "";

  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes("https//") || parsed.hostname.includes("http")) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function uniqueTokens(tokens: Token[]) {
  const byMint = new Map<string, Token>();
  for (const token of tokens) {
    if (!byMint.has(token.mint)) byMint.set(token.mint, token);
  }

  return [...byMint.values()];
}

function isLiveCryptoToken(token: Token) {
  return (
    Number.isFinite(token.price) &&
    token.price > 0 &&
    (Number.isFinite(token.marketCap) || Number.isFinite(token.liquidity ?? 0))
  );
}

function isLikelyGraduatedToken(token: Token) {
  const liquidity = token.liquidity ?? 0;
  const marketCap = token.marketCap ?? 0;
  const volume = token.volume24h ?? 0;

  return (
    token.mint !== SOL_MINT &&
    isLiveCryptoToken(token) &&
    liquidity >= 25_000 &&
    (marketCap >= 50_000 || volume >= 100_000 || token.poolDex === "raydium")
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback for browsers that block clipboard writes.
  }

  try {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(input);
    return copied;
  } catch {
    return false;
  }
}

function shortAddress(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function estimateTopHolding(token: Token) {
  if (!token.holders) return 0;
  const seed = token.mint.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const range = token.marketCap > 1_000_000_000 ? 8 : token.marketCap > 100_000_000 ? 14 : 22;
  return Math.min(94, Math.max(1.2, range + (seed % 900) / 100));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#201b2e] bg-[#15121d] px-3 py-2">
      <div className="font-mono text-[11px] uppercase tracking-wide text-[#8d879a]">{label}</div>
      <div className="mt-0.5 font-mono font-semibold">{value}</div>
    </div>
  );
}

function MarketActivity({ token }: { token: Token }) {
  const trades = useTokenTrades(token.mint, true);
  const holders = useTokenHolders(token.mint, true);
  const [activeTab, setActiveTab] = useState<"holders" | "trades" | "thesis">("holders");

  const thesisCount = holders.data?.data.length ?? 0;

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "holders", label: "Holders" },
    { key: "trades", label: "Swaps" },
    { key: "thesis", label: "Thesis", count: thesisCount > 0 ? thesisCount * 40 : 640 },
  ];

  return (
    <div className="shrink-0 h-[280px] border-t border-[#1b1726]/60 flex flex-col min-h-0 overflow-hidden bg-transparent">
      {/* Tab bar */}
      <div className="flex h-[36px] items-center gap-0 border-b border-[#1b1726]/40 bg-transparent px-4 shrink-0 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`h-full border-b-2 px-3 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-white text-white font-bold"
                : "border-transparent text-[#7a7488] hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="text-[10px] text-[#554f63] font-mono">
                ({tab.count.toLocaleString()})
              </span>
            )}
          </button>
        ))}

        {/* Right-side filter checkboxes */}
        <div className="ml-auto flex items-center gap-4 text-[11px] text-[#7a7488] select-none shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" className="accent-[#20d772] h-3 w-3 rounded" />
            <span>Thesis only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" className="accent-[#20d772] h-3 w-3 rounded" />
            <span>Friends only</span>
          </label>
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-transparent">
        {activeTab === "holders" ? (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#08060f]/90 backdrop-blur text-[11px] font-semibold text-[#7a7488] border-b border-[#1b1726]/40 z-10">
              <tr className="h-8">
                <th className="pl-4 pr-2 font-semibold">Trader</th>
                <th className="px-2 font-semibold text-right">Position</th>
                <th className="px-2 font-semibold text-right">PnL</th>
                <th className="px-2 font-semibold text-right">Avg. entry</th>
                <th className="pl-2 pr-4 font-semibold">Thesis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171320]/20">
              {holders.data?.data.length ? (
                holders.data.data.slice(0, 20).map((holder) => {
                  const mockPnl =
                    holder.valueUsd > 0 ? holder.valueUsd * (Math.random() * 1.2 - 0.3) : 0;
                  const pnlUp = mockPnl >= 0;
                  const mockEntryMc = token.marketCap * (0.3 + Math.random() * 0.8);
                  return (
                    <tr
                      key={holder.rank}
                      className="h-10 hover:bg-[#12111a]/30 transition-colors group"
                    >
                      <Td className="pl-4 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#7567ff]/40 to-[#20d772]/30 flex items-center justify-center text-[10px] font-bold text-white/80 shrink-0 border border-[#1b1726]/40">
                            {holder.wallet.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <a
                              href={`https://solscan.io/account/${holder.wallet}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[#e8e4f0] hover:text-white text-[11px] inline-flex items-center gap-1"
                            >
                              {holder.wallet.slice(0, 8)}...{holder.wallet.slice(-4)}
                            </a>
                            <span className="text-[10px] text-[#554f63] font-mono">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#20d772] mr-1" />
                              {holder.rank <= 3
                                ? "1d"
                                : holder.rank <= 8
                                  ? `${holder.rank}d`
                                  : `${holder.rank + 5}d`}{" "}
                              avg. hold
                            </span>
                          </div>
                        </div>
                      </Td>
                      <Td mono className="px-2 text-right">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-[#e8e4f0] font-semibold">
                            {holder.valueUsd > 0 ? formatUsd(holder.valueUsd) : "-"}
                          </span>
                          <span className="text-[10px] text-[#554f63]">
                            {holder.pct > 0 ? `${holder.pct.toFixed(1)}% ${token.symbol}` : "-"}
                          </span>
                        </div>
                      </Td>
                      <Td mono className="px-2 text-right">
                        <span
                          className={`font-semibold ${pnlUp ? "text-[#20d772]" : "text-[#ff5e36]"}`}
                        >
                          {pnlUp ? "+" : ""}
                          {formatUsd(Math.abs(mockPnl))}
                        </span>
                        <div className="text-[10px] text-[#554f63]">
                          {pnlUp ? "+" : ""}
                          {((mockPnl / Math.max(holder.valueUsd, 1)) * 100).toFixed(1)}%
                        </div>
                      </Td>
                      <Td mono className="px-2 text-right text-[#e8e4f0]">
                        ${formatCompact(mockEntryMc)} MC
                      </Td>
                      <Td className="pl-2 pr-4 text-[#554f63] text-[10px] max-w-[140px] truncate">
                        {holder.rank <= 5 && (
                          <a
                            href="#"
                            className="text-[#7567ff] hover:text-[#9b8fff] transition-colors truncate block"
                          >
                            https://x.com/{holder.wallet.slice(0, 6)}...
                          </a>
                        )}
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <TableState
                  colSpan={5}
                  title={holders.isFetching ? "Loading holders" : "Top holders unavailable"}
                  detail={
                    holders.isFetching
                      ? "Fetching top token holders from BirdEye."
                      : "BirdEye did not return holder data for this request."
                  }
                />
              )}
            </tbody>
          </table>
        ) : activeTab === "trades" ? (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#08060f]/90 backdrop-blur text-[11px] font-semibold text-[#7a7488] border-b border-[#1b1726]/40 z-10">
              <tr className="h-8">
                <th className="pl-4 pr-3 font-semibold w-20">Side</th>
                <th className="px-3 font-semibold text-right">USD Value</th>
                <th className="px-3 font-semibold text-right">{token.symbol}</th>
                <th className="px-3 font-semibold text-right">Price</th>
                <th className="px-3 font-semibold">Wallet</th>
                <th className="pl-3 pr-4 font-semibold text-right w-16">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171320]/20">
              {trades.data?.data.length ? (
                trades.data.data.slice(0, 20).map((trade, index) => (
                  <tr
                    key={`${trade.id}-${index}`}
                    className="h-8 hover:bg-[#12111a]/20 transition-colors"
                  >
                    <Td className="pl-4 pr-3 font-bold">
                      <span className={trade.side === "buy" ? "text-[#20d772]" : "text-[#ff5e36]"}>
                        {trade.side.toUpperCase()}
                      </span>
                    </Td>
                    <Td mono className="px-3 text-right text-[#e8e4f0] font-semibold">
                      {formatUsd(trade.amountUsd)}
                    </Td>
                    <Td mono className="px-3 text-right text-[#7a7488]">
                      {trade.tokens.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Td>
                    <Td mono className="px-3 text-right text-[#e8e4f0]">
                      {formatUsd(trade.price)}
                    </Td>
                    <Td mono className="px-3 text-[#7a7488]">
                      {trade.txHash ? (
                        <a
                          href={`https://solscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-white"
                        >
                          {trade.wallet.slice(0, 6)}...{trade.wallet.slice(-6)}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        trade.wallet
                      )}
                    </Td>
                    <Td mono className="pl-3 pr-4 text-right text-[#5c5669]">
                      {trade.ago}
                    </Td>
                  </tr>
                ))
              ) : (
                <TableState
                  colSpan={6}
                  title={trades.isFetching ? "Loading BirdEye trades" : "Live trades unavailable"}
                  detail={
                    trades.isFetching
                      ? "Fetching recent token swaps from BirdEye."
                      : "BirdEye did not return recent swaps for this request."
                  }
                />
              )}
            </tbody>
          </table>
        ) : (
          /* Thesis tab */
          <div className="p-4 space-y-3">
            {[
              {
                user: "degen_king",
                time: "2h ago",
                text: `${token.name} is going to flip. Team is shipping hard, community is unmatched. Still early.`,
                sentiment: "bullish",
              },
              {
                user: "whale_watcher",
                time: "5h ago",
                text: `Accumulating here. On-chain metrics look insane - holder count growing 15% daily.`,
                sentiment: "bullish",
              },
              {
                user: "skeptic_sam",
                time: "8h ago",
                text: `Volume looks organic but liquidity is thin. I'd wait for a deeper pullback before entering.`,
                sentiment: "bearish",
              },
              {
                user: "alpha_hunter",
                time: "12h ago",
                text: `This is the play. Smart money wallets are loading up quietly. Don't sleep on this one.`,
                sentiment: "bullish",
              },
              {
                user: "risk_mgr",
                time: "1d ago",
                text: `Top 10 wallets hold too much supply. Watch for dumps after this pump.`,
                sentiment: "bearish",
              },
            ].map((thesis) => (
              <div
                key={thesis.user}
                className="flex gap-3 p-3 rounded-lg bg-transparent border border-[#1b1726]/30 hover:border-[#1b1726]/60 transition-colors"
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border border-[#1b1726]/40 ${
                    thesis.sentiment === "bullish"
                      ? "bg-gradient-to-br from-[#20d772]/20 to-[#20d772]/5 text-[#20d772]"
                      : "bg-gradient-to-br from-[#ff5e36]/20 to-[#ff5e36]/5 text-[#ff5e36]"
                  }`}
                >
                  {thesis.user.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-white">{thesis.user}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        thesis.sentiment === "bullish"
                          ? "bg-[#20d772]/10 text-[#20d772] border border-[#20d772]/20"
                          : "bg-[#ff5e36]/10 text-[#ff5e36] border border-[#ff5e36]/20"
                      }`}
                    >
                      {thesis.sentiment}
                    </span>
                    <span className="text-[10px] text-[#554f63] ml-auto">{thesis.time}</span>
                  </div>
                  <p className="text-[11px] text-[#9b96a8] mt-1 leading-relaxed">{thesis.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTable({
  title,
  subtitle,
  updatedAt,
  provider,
  status,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt?: string;
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
  status?: "live" | "cached" | "unavailable";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <DataFreshness status={status} updatedAt={updatedAt} provider={provider} compact />
      </div>
      <div className="terminal-scroll max-h-[300px] overflow-y-auto">{children}</div>
    </section>
  );
}

function FreshnessPill({
  icon,
  label,
  status,
  provider,
}: {
  icon: React.ReactNode;
  label: string;
  status?: "live" | "cached" | "unavailable";
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
}) {
  const live = status === "live";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        live
          ? "border-[#173d2b] bg-[#0f2d1e] text-[#20d772]"
          : "border-[#252137] bg-[#15121d] text-muted-foreground"
      }`}
    >
      {icon}
      {label}
      <span className="font-mono">{provider === "solana-rpc" ? "RPC" : "CF"}</span>
    </span>
  );
}

function DataFreshness({
  status,
  updatedAt,
  provider,
  compact = false,
}: {
  status?: "live" | "cached" | "unavailable";
  updatedAt?: string;
  provider?: "birdeye" | "geckoterminal" | "solana-rpc";
  compact?: boolean;
}) {
  if (!status) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground ${
        compact ? "text-right" : "border-t border-border/60 px-3 py-2"
      }`}
    >
      <span className={status === "live" ? "text-[#20d772]" : ""}>
        {dataProviderLabel(provider)} {status.toUpperCase()}
      </span>
      {updatedAt && <span>Updated {new Date(updatedAt).toLocaleTimeString()}</span>}
    </div>
  );
}

function dataProviderLabel(provider?: "birdeye" | "geckoterminal" | "solana-rpc") {
  if (provider === "solana-rpc") return "Solana RPC";
  if (provider === "geckoterminal") return "GeckoTerminal";
  if (provider === "birdeye") return "BirdEye";
  return "ChadFeed";
}

function LiveState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid h-full min-h-[300px] place-items-center text-center">
      <div>
        <div className="font-mono text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-2 max-w-sm text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function TableState({
  colSpan,
  title,
  detail,
}: {
  colSpan: number;
  title: string;
  detail: string;
}) {
  return (
    <tr className="border-t border-border/60">
      <td colSpan={colSpan} className="px-3 py-8 text-center">
        <div className="font-mono text-xs font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </td>
    </tr>
  );
}

function TradeFooterTicker({ solPrice }: { solPrice: number }) {
  return (
    <footer className="hidden h-6 shrink-0 items-center border-t border-[#201b2e] bg-[#08060f] px-2 text-[11px] lg:flex">
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden font-mono">
        <span className="font-bold text-white">SOL</span>
        <span className="text-[#b4adbf]">{solPrice > 0 ? formatUsd(solPrice) : "..."}</span>
      </div>
    </footer>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({
  children,
  mono,
  className = "",
}: {
  children?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${mono ? "font-mono" : ""} ${className}`}>{children}</td>;
}
