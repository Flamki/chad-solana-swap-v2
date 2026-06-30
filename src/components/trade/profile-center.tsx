"use client";

import { useLinkWithOAuth, usePrivy } from "@privy-io/react-auth";
import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import {
  address as solanaAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Repeat2,
  Send,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DepositDialog, WithdrawDialog } from "@/components/trade-account";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { env, hasPrivy, hasRpcEndpoint } from "@/lib/env";
import {
  type PortfolioHistoryPoint,
  type PortfolioHistoryRange,
  type FollowStats,
  type TradeReceiptRecord,
  type UserProfileRecord,
  type WalletTransferRecord,
  recordWalletTransfer,
  recordUserProfile,
  syncFollowTrader,
  useAppLeaderboard,
  useFollowStats,
  usePortfolioHistory,
  useStoredFollowedTraders,
  useStoredTradeReceipts,
  useStoredUserProfile,
  useTokenPosition,
  useWalletTokenPositions,
  useWalletTransfers,
} from "@/lib/market-data";
import { SOLANA_MAINNET_CHAIN } from "@/lib/solana-chain";
import {
  broadcastSignedSolanaTransaction,
  bytesToBase64,
  fetchTokenTransferSourceAccount,
  formatLamportsAsSol,
  formatTokenUnits,
  maxTransferableSol,
  normalizeSolanaTransactionError,
  parseSolLamports,
  parseTokenUnits,
  SOL_TRANSFER_FEE_RESERVE_SOL,
  SPL_TOKEN_PROGRAM_ID,
  TOKEN_TRANSFER_FEE_RESERVE_SOL,
} from "@/lib/solana-transfer-utils";
import { SOL_MINT, USDC_MINT, formatUsd } from "@/lib/tokens";

const RECEIPT_KEY = "chadwallet-trade-receipts";
const PROFILE_KEY = "chadwallet-profile";
const BIO_MAX_LENGTH = 160;
const NOTE_MAX_LENGTH = 200;

type TradeReceipt = TradeReceiptRecord;

type StoredProfile = {
  username: string;
  displayName: string;
  bio: string;
  avatarDataUrl: string;
  bannerDataUrl: string;
};

export function TradeProfileCenter({
  solPrice,
  viewedWallet,
  onBackToOwnProfile,
  onSelectProfile,
}: {
  solPrice: number;
  viewedWallet?: string | null;
  onBackToOwnProfile?: () => void;
  onSelectProfile?: (wallet: string) => void;
}) {
  if (!hasPrivy) {
    return <SignedOutProfile />;
  }

  return (
    <ConnectedTradeProfileCenter
      solPrice={solPrice}
      viewedWallet={viewedWallet}
      onBackToOwnProfile={onBackToOwnProfile}
      onSelectProfile={onSelectProfile}
    />
  );
}

function ConnectedTradeProfileCenter({
  solPrice,
  viewedWallet,
  onBackToOwnProfile,
  onSelectProfile,
}: {
  solPrice: number;
  viewedWallet?: string | null;
  onBackToOwnProfile?: () => void;
  onSelectProfile?: (wallet: string) => void;
}) {
  const queryClient = useQueryClient();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address ?? user?.wallet?.address;
  const isViewingOtherProfile = Boolean(viewedWallet && viewedWallet !== address);
  const email = getLoginEmail(user);
  const defaultDisplayName = getDisplayName(user, email);
  const defaultHandle = getProfileHandle(defaultDisplayName, email);
  const storedProfile = useStoredUserProfile(address);
  const { profile, saveProfile } = useStoredProfile(
    address,
    {
      username: defaultHandle,
      displayName: defaultDisplayName,
      bio: "",
      avatarDataUrl: "",
      bannerDataUrl: "",
    },
    storedProfile.data,
  );
  const displayName = profile.displayName || defaultDisplayName;
  const handle = profile.username || defaultHandle;
  const bio = profile.bio;
  const initial = displayName.charAt(0).toUpperCase();
  const sol = useTokenPosition({
    owner: address,
    mint: SOL_MINT,
    decimals: 9,
    price: solPrice,
  });
  const usdc = useTokenPosition({
    owner: address,
    mint: USDC_MINT,
    decimals: 6,
    price: 1,
  });
  const [dialog, setDialog] = useState<"deposit" | "withdraw" | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState<PortfolioHistoryRange>("24H");
  const [swapTab, setSwapTab] = useState<"swaps" | "buys" | "sells">("swaps");
  const [positionTab, setPositionTab] = useState<"open" | "closed">("open");
  const storedReceipts = useStoredTradeReceipts(address);
  const localReceipts = useLocalTradeReceipts(address);
  const transfers = useWalletTransfers(address);
  const walletPositions = useWalletTokenPositions(address, solPrice);
  const followStats = useFollowStats(address);
  const receipts = useMemo(
    () => mergeTradeReceipts(storedReceipts.data ?? [], localReceipts),
    [localReceipts, storedReceipts.data],
  );
  const cashBalance = usdc.data?.balance ?? 0;
  const solBalance = sol.data?.balance ?? 0;
  const solValue = sol.data?.valueUsd ?? 0;
  const positions = walletPositions.data ?? [];
  const followingCount = followStats.data?.following ?? 0;
  const followersCount = followStats.data?.followers ?? 0;
  const portfolioValue = positions.length
    ? positions.reduce((total, position) => total + position.valueUsd, 0)
    : cashBalance + solValue;
  const loadingBalances = sol.isFetching || usdc.isFetching || walletPositions.isFetching;
  const portfolioHistory = usePortfolioHistory({
    owner: address,
    range,
    solPrice,
    currentSolBalance: solBalance,
    currentUsdcBalance: cashBalance,
    enabled: !loadingBalances,
  });
  const visibleReceipts = useMemo(() => {
    if (swapTab === "buys") return receipts.filter((receipt) => receipt.side === "buy");
    if (swapTab === "sells") return receipts.filter((receipt) => receipt.side === "sell");
    return receipts;
  }, [receipts, swapTab]);
  const activityRows = useMemo(
    () =>
      buildProfileActivityRows({
        wallet: address,
        receipts: visibleReceipts,
        transfers: transfers.data ?? [],
        includeTransfers: swapTab === "swaps",
      }),
    [address, swapTab, transfers.data, visibleReceipts],
  );

  useEffect(() => {
    if (!ready || !authenticated || !address || storedProfile.isFetching || storedProfile.data) {
      return;
    }

    void recordUserProfile({
      wallet: address,
      username: defaultHandle,
      displayName: defaultDisplayName,
      bio: "",
      avatarDataUrl: "",
      bannerDataUrl: "",
    }).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile", address] });
      void queryClient.invalidateQueries({ queryKey: ["app-leaderboard"] });
    });
  }, [
    address,
    authenticated,
    defaultDisplayName,
    defaultHandle,
    queryClient,
    ready,
    storedProfile.data,
    storedProfile.isFetching,
  ]);

  const copyAddress = async () => {
    if (!address) return;
    const copied = await copyToClipboard(address);
    if (!copied) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (!ready || !authenticated || !address) {
    return <SignedOutProfile />;
  }

  if (isViewingOtherProfile && viewedWallet) {
    return (
      <ViewedTradeProfile
        walletAddress={viewedWallet}
        onBack={onBackToOwnProfile}
        onSelectProfile={onSelectProfile}
      />
    );
  }

  const linkedAccounts = user?.linkedAccounts ?? [];

  return (
    <div className="terminal-scroll h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-[#08060f]">
      <div className="mx-auto w-full max-w-[1040px] min-w-0 pb-6 pt-0">
        <div className="relative h-[150px] min-w-0 overflow-hidden rounded-xl bg-[#15131d] max-xl:h-[128px]">
          {profile.bannerDataUrl ? (
            <img
              src={profile.bannerDataUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(83,95,255,0.22),transparent_30rem),linear-gradient(135deg,#171420,#111019_70%)]" />
          )}
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-[#262333] text-white transition hover:bg-[#302b42]"
            title="Edit profile banner"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <section className="relative z-10 -mt-8 min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-5 max-[1180px]:flex-wrap">
            <div className="flex min-w-0 flex-1 items-end gap-4">
              <div className="relative z-20 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-[5px] border-[#08060f] bg-[radial-gradient(circle_at_30%_20%,#6571ff,#19162b_68%)] text-3xl font-black text-white shadow-[0_18px_48px_rgba(0,0,0,0.45)] 2xl:h-24 2xl:w-24 2xl:text-4xl">
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 pb-2">
                <h1 className="truncate text-[20px] font-black leading-none text-white 2xl:text-[22px]">
                  {displayName}
                </h1>
                <div className="mt-1 truncate text-[15px] font-semibold text-[#a9b0d4] 2xl:text-[17px]">
                  @{handle}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-2 pt-7 max-[1180px]:ml-[96px] max-[1180px]:pt-0">
              <ProfileStat value={followingCount.toLocaleString()} label="Following" />
              <ProfileStat value={followersCount.toLocaleString()} label="Followers" />
              <button
                onClick={() => setEditingProfile(true)}
                className="h-10 rounded-lg border border-[#252137] bg-[#15121d] px-4 text-sm font-black text-white transition hover:bg-[#1f1b2a]"
              >
                Edit profile
              </button>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1b1726] pb-5 text-[12px] font-semibold text-[#a9b0d4] 2xl:text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-[#5c5669]" />
              No hold time
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat2 className="h-4 w-4 text-[#5c5669]" />
              {receipts.length} trades
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Send className="h-4 w-4 text-[#5c5669]" />
              {(transfers.data?.length ?? 0).toLocaleString()} transfers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[#5c5669]" />
              Joined Jun 2026
            </span>
            <button
              onClick={copyAddress}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#717893] transition hover:text-white"
            >
              {address.slice(0, 6)}...{address.slice(-6)}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(320px,1fr)] gap-[30px] max-[1180px]:grid-cols-1 max-[1180px]:gap-5">
            <section className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[30px] font-black leading-none text-white 2xl:text-[31px]">
                    {loadingBalances ? "..." : formatUsd(portfolioValue)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[15px] font-bold leading-none">
                    <span className="text-[#20d772]">+$0</span>
                    <span className="text-[#a9b0d4]">24h</span>
                  </div>
                </div>
                <div className="flex h-[34px] shrink-0 items-center rounded-lg border border-[#252137] bg-[#0d0a13] p-[3px] text-[12px] font-black">
                  {(["24H", "7D", "30D", "ALL"] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setRange(item)}
                      className={`h-[26px] rounded-md px-2.5 leading-none ${
                        range === item
                          ? "bg-[#232031] text-white"
                          : "text-[#5c5669] hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <PortfolioValueChart
                points={portfolioHistory.data ?? []}
                range={range}
                loading={loadingBalances || portfolioHistory.isFetching}
                unavailable={Boolean(portfolioHistory.error)}
              />

              <div className="mt-0 flex min-w-0 items-center justify-between gap-4 py-4 max-[1180px]:flex-wrap">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#201d2c] text-[22px] font-black text-white">
                    $
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-tight text-[#a9b0d4]">
                      Cash balance
                    </div>
                    <div className="text-[22px] font-black leading-none text-white">
                      {loadingBalances ? "..." : formatUsd(cashBalance)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setDialog("withdraw")}
                    className="h-[38px] rounded-lg border border-[#252137] bg-[#15121d] px-4 text-[14px] font-black text-white transition hover:bg-[#1f1b2a] 2xl:px-5"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => setDialog("deposit")}
                    className="h-[38px] rounded-lg bg-[#5365ff] px-5 text-[14px] font-black text-white transition hover:bg-[#6373ff] 2xl:px-6"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              <section className="min-w-0 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912]">
                <div className="flex h-11 items-center justify-between border-b border-[#1b1726] bg-[#15121d] px-3">
                  <h2 className="text-sm font-black text-white">Your positions</h2>
                  <div className="flex rounded-md border border-[#28243a] bg-[#0c0a13] p-0.5 text-xs font-black">
                    {(["open", "closed"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setPositionTab(tab)}
                        className={`rounded px-2.5 py-1 capitalize ${
                          positionTab === tab
                            ? "bg-[#20254f] text-[#6575ff]"
                            : "text-[#5c5669] hover:text-white"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(70px,0.8fr)] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
                  <span>Token</span>
                  <span>Position</span>
                  <span className="text-right">Value</span>
                </div>
                {positionTab === "open" && positions.length > 0 ? (
                  <div className="divide-y divide-[#171320]">
                    {positions.map((position) => (
                      <div
                        key={position.mint}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(70px,0.8fr)] px-4 py-3 text-xs font-semibold"
                      >
                        <span className="min-w-0 truncate text-white">{position.symbol}</span>
                        <span className="min-w-0 truncate font-mono text-[#a9b0d4]">
                          {formatTokenAmount(position.balance)}
                        </span>
                        <span className="min-w-0 truncate text-right font-mono text-white">
                          {formatUsd(position.valueUsd)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-20 place-items-center text-sm font-semibold text-[#5c5669]">
                    {walletPositions.isFetching
                      ? "Loading live positions"
                      : `No ${positionTab} positions`}
                  </div>
                )}
              </section>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912]">
              <div className="flex h-12 items-center gap-4 border-b border-[#1b1726] bg-[#15121d] px-4 text-sm font-black">
                {[
                  ["swaps", "All activity"],
                  ["buys", "Buys"],
                  ["sells", "Sells"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSwapTab(key as typeof swapTab)}
                    className={swapTab === key ? "text-white" : "text-[#5c5669] hover:text-white"}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(58px,0.75fr)_minmax(52px,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(66px,0.7fr)] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
                <span className="min-w-0 truncate">Token</span>
                <span className="min-w-0 truncate">Action</span>
                <span className="min-w-0 truncate">Amount</span>
                <span className="min-w-0 truncate">Tx</span>
                <span className="min-w-0 truncate text-right">Time</span>
              </div>
              {activityRows.length ? (
                <div className="divide-y divide-[#171320]">
                  {activityRows.map((row) => (
                    <a
                      key={`${row.kind}:${row.signature}`}
                      href={row.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid min-w-0 grid-cols-[minmax(58px,0.75fr)_minmax(52px,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(66px,0.7fr)] px-4 py-3 text-xs font-semibold transition hover:bg-[#151221]"
                    >
                      <span className="min-w-0 truncate text-white">{row.token}</span>
                      <span
                        className={`min-w-0 truncate ${
                          row.tone === "green" ? "text-[#20d772]" : "text-[#ff653d]"
                        }`}
                      >
                        {row.action}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[#a9b0d4]">
                        {row.amount}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[#7da1ff]">
                        {row.signature.startsWith("paper-")
                          ? "paper"
                          : `${row.signature.slice(0, 4)}...${row.signature.slice(-4)}`}
                      </span>
                      <span className="min-w-0 truncate text-right text-[#5c5669]">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                      {row.note || row.counterpartyWallet ? (
                        <span className="col-span-5 mt-1 min-w-0 truncate text-[#a9b0d4]">
                          {row.counterpartyWallet ? (
                            <span className="inline-flex max-w-full items-center gap-1.5">
                              <span>{row.directionLabel}</span>
                              <TransferCounterpartyInlineButton
                                wallet={row.counterpartyWallet}
                                onSelectProfile={onSelectProfile}
                              />
                              {row.note ? <span className="truncate">- {row.note}</span> : null}
                            </span>
                          ) : (
                            row.note
                          )}
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="grid h-[380px] place-items-center text-sm font-semibold text-[#5c5669] max-xl:h-[280px]">
                  {swapTab === "swaps" ? "No activity yet" : "No trades yet"}
                </div>
              )}
            </section>

            <ProfileTransfersSection
              wallet={address}
              transfers={transfers.data ?? []}
              loading={transfers.isFetching}
              className="min-[1181px]:col-span-2 max-[1180px]:order-last"
              onSelectProfile={onSelectProfile}
            />
          </div>
        </section>
      </div>

      <DepositDialog
        open={dialog === "deposit"}
        onOpenChange={(open) => !open && setDialog(null)}
        address={address}
        onFundComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["token-position", address] });
        }}
      />
      <WithdrawDialog
        open={dialog === "withdraw"}
        onOpenChange={(open) => !open && setDialog(null)}
        address={address}
        balance={sol.data?.balance ?? 0}
        wallet={wallet}
      />
      <EditProfileDialog
        open={editingProfile}
        onOpenChange={setEditingProfile}
        initial={initial}
        profile={{
          username: handle,
          displayName,
          bio,
          avatarDataUrl: profile.avatarDataUrl,
          bannerDataUrl: profile.bannerDataUrl,
        }}
        linkedAccounts={linkedAccounts}
        onSave={saveProfile}
      />
    </div>
  );
}

function ViewedTradeProfile({
  walletAddress,
  onBack,
  onSelectProfile,
}: {
  walletAddress: string;
  onBack?: () => void;
  onSelectProfile?: (wallet: string) => void;
}) {
  const storedProfile = useStoredUserProfile(walletAddress);
  const receipts = useStoredTradeReceipts(walletAddress);
  const transfers = useWalletTransfers(walletAddress);
  const followStats = useFollowStats(walletAddress);
  const [copied, setCopied] = useState(false);
  const fallbackProfile = useMemo<StoredProfile>(
    () => ({
      username: shortWallet(walletAddress),
      displayName: shortWallet(walletAddress),
      bio: "",
      avatarDataUrl: "",
      bannerDataUrl: "",
    }),
    [walletAddress],
  );
  const { profile } = useStoredProfile(walletAddress, fallbackProfile, storedProfile.data);
  const displayName = profile.displayName || shortWallet(walletAddress);
  const handle = profile.username || shortWallet(walletAddress);
  const initial = displayName.charAt(0).toUpperCase();
  const tradeCount = receipts.data?.length ?? 0;
  const buyCount = receipts.data?.filter((receipt) => receipt.side === "buy").length ?? 0;
  const sellCount = receipts.data?.filter((receipt) => receipt.side === "sell").length ?? 0;
  const followingCount = followStats.data?.following ?? 0;
  const followersCount = followStats.data?.followers ?? 0;

  const copyAddress = async () => {
    const copiedAddress = await copyToClipboard(walletAddress);
    if (!copiedAddress) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="terminal-scroll h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-[#08060f]">
      <div className="mx-auto w-full max-w-[1040px] min-w-0 pb-6 pt-0">
        <div className="relative h-[150px] min-w-0 overflow-hidden rounded-xl bg-[#15131d] max-xl:h-[128px]">
          {profile.bannerDataUrl ? (
            <img
              src={profile.bannerDataUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(83,95,255,0.2),transparent_30rem),linear-gradient(135deg,#171420,#111019_70%)]" />
          )}
        </div>

        <section className="relative z-10 -mt-8 min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-5 max-[1180px]:flex-wrap">
            <div className="flex min-w-0 flex-1 items-end gap-4">
              <div className="relative z-20 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-[5px] border-[#08060f] bg-[radial-gradient(circle_at_30%_20%,#6571ff,#19162b_68%)] text-3xl font-black text-white shadow-[0_18px_48px_rgba(0,0,0,0.45)] 2xl:h-24 2xl:w-24 2xl:text-4xl">
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-[20px] font-black leading-none text-white 2xl:text-[22px]">
                    {displayName}
                  </h1>
                  <span className="rounded-md border border-[#252137] bg-[#15121d] px-2 py-1 text-[11px] font-black text-[#a9b0d4]">
                    Trader
                  </span>
                </div>
                <div className="mt-1 truncate text-[15px] font-semibold text-[#a9b0d4] 2xl:text-[17px]">
                  @{handle}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-7 max-[1180px]:ml-[96px] max-[1180px]:pt-0">
              <ProfileStat value={followingCount.toLocaleString()} label="Following" />
              <ProfileStat value={followersCount.toLocaleString()} label="Followers" />
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#252137] bg-[#15121d] px-4 text-sm font-black text-white transition hover:bg-[#1f1b2a]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Your profile
                </button>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-[15px] font-semibold leading-relaxed text-white">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1b1726] pb-5 text-[12px] font-semibold text-[#a9b0d4] 2xl:text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Repeat2 className="h-4 w-4 text-[#5c5669]" />
              {tradeCount} trades
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Send className="h-4 w-4 text-[#5c5669]" />
              {(transfers.data?.length ?? 0).toLocaleString()} transfers
            </span>
            <span className="text-[#20d772]">{buyCount} buys</span>
            <span className="text-[#ff653d]">{sellCount} sells</span>
            <button
              onClick={copyAddress}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#717893] transition hover:text-white"
            >
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <section className="mt-5 min-w-0 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912]">
            <div className="flex h-12 items-center gap-4 border-b border-[#1b1726] bg-[#15121d] px-4 text-sm font-black">
              <span className="text-white">Recorded swaps</span>
              <span className="text-[#5c5669]">Mainnet receipts from ChadWallet</span>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(58px,0.75fr)_minmax(52px,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(66px,0.7fr)] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
              <span className="min-w-0 truncate">Token</span>
              <span className="min-w-0 truncate">Action</span>
              <span className="min-w-0 truncate">Amount</span>
              <span className="min-w-0 truncate">Tx</span>
              <span className="min-w-0 truncate text-right">Time</span>
            </div>
            {receipts.data?.length ? (
              <div className="divide-y divide-[#171320]">
                {receipts.data.map((receipt) => (
                  <a
                    key={receipt.signature}
                    href={receipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid min-w-0 grid-cols-[minmax(58px,0.75fr)_minmax(52px,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(66px,0.7fr)] px-4 py-3 text-xs font-semibold transition hover:bg-[#151221]"
                  >
                    <span className="min-w-0 truncate text-white">{receipt.outputSymbol}</span>
                    <span
                      className={`min-w-0 truncate ${
                        receipt.side === "buy" ? "text-[#20d772]" : "text-[#ff653d]"
                      }`}
                    >
                      {receipt.side.toUpperCase()}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[#a9b0d4]">
                      {receipt.inputAmount} {receipt.inputSymbol}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[#7da1ff]">
                      {receipt.signature.slice(0, 4)}...{receipt.signature.slice(-4)}
                    </span>
                    <span className="min-w-0 truncate text-right text-[#5c5669]">
                      {new Date(receipt.createdAt).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="grid h-[380px] place-items-center text-sm font-semibold text-[#5c5669] max-xl:h-[280px]">
                {receipts.isFetching ? "Loading profile activity" : "No recorded swaps yet"}
              </div>
            )}
          </section>

          <ProfileTransfersSection
            wallet={walletAddress}
            transfers={transfers.data ?? []}
            loading={transfers.isFetching}
            className="mt-5"
            onSelectProfile={onSelectProfile}
          />
        </section>
      </div>
    </div>
  );
}

function ProfileTransfersSection({
  wallet,
  transfers,
  loading,
  className = "",
  onSelectProfile,
}: {
  wallet: string;
  transfers: WalletTransferRecord[];
  loading: boolean;
  className?: string;
  onSelectProfile?: (wallet: string) => void;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912] ${className}`}
    >
      <div className="flex h-12 items-center gap-4 border-b border-[#1b1726] bg-[#15121d] px-4 text-sm font-black">
        <span className="text-white">SOL transfers</span>
        <span className="text-[#5c5669]">Mainnet sends, receives, and notes</span>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(70px,0.7fr)_minmax(76px,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(66px,0.7fr)] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
        <span className="min-w-0 truncate">Type</span>
        <span className="min-w-0 truncate">Amount</span>
        <span className="min-w-0 truncate">User</span>
        <span className="min-w-0 truncate">Note</span>
        <span className="min-w-0 truncate text-right">Tx</span>
      </div>
      {transfers.length ? (
        <div className="divide-y divide-[#171320]">
          {transfers.map((transfer) => {
            const outgoing = transfer.senderWallet === wallet;
            const counterparty = outgoing ? transfer.recipientWallet : transfer.senderWallet;

            return (
              <div
                key={transfer.signature}
                className="grid min-w-0 grid-cols-[minmax(70px,0.7fr)_minmax(76px,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(66px,0.7fr)] px-4 py-3 text-xs font-semibold transition hover:bg-[#151221]"
              >
                <span
                  className={`min-w-0 truncate ${outgoing ? "text-[#ff653d]" : "text-[#20d772]"}`}
                >
                  {outgoing ? "Sent" : "Received"}
                </span>
                <span className="min-w-0 truncate font-mono text-white">
                  {transfer.amount} {transfer.assetSymbol}
                </span>
                <TransferCounterpartyButton
                  wallet={counterparty}
                  onSelectProfile={onSelectProfile}
                />
                <span className="min-w-0 truncate text-[#a9b0d4]">
                  {transfer.note || "No note"}
                </span>
                <a
                  href={transfer.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-right font-mono text-[#7da1ff] hover:text-white"
                >
                  {transfer.signature.slice(0, 4)}...{transfer.signature.slice(-4)}
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid h-32 place-items-center text-sm font-semibold text-[#5c5669]">
          {loading ? "Loading transfers" : "No SOL transfers recorded yet"}
        </div>
      )}
    </section>
  );
}

function TransferCounterpartyButton({
  wallet,
  onSelectProfile,
}: {
  wallet: string;
  onSelectProfile?: (wallet: string) => void;
}) {
  const profile = useStoredUserProfile(wallet);
  const displayName = profile.data?.displayName || profile.data?.username || shortWallet(wallet);
  const avatar = profile.data?.avatarDataUrl;
  const initial = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelectProfile?.(wallet)}
      className="flex min-w-0 items-center gap-2 text-left text-[#a9b0d4] transition hover:text-white disabled:cursor-default"
      disabled={!onSelectProfile}
      title={`Open ${displayName}`}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#201d2c] text-[9px] font-black text-white">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-black text-white">{displayName}</span>
        <span className="block truncate font-mono text-[10px] text-[#7a7488]">
          {shortWallet(wallet)}
        </span>
      </span>
    </button>
  );
}

function TransferCounterpartyInlineButton({
  wallet,
  onSelectProfile,
}: {
  wallet: string;
  onSelectProfile?: (wallet: string) => void;
}) {
  const profile = useStoredUserProfile(wallet);
  const displayName = profile.data?.displayName || profile.data?.username || shortWallet(wallet);

  return (
    <button
      type="button"
      onClick={() => onSelectProfile?.(wallet)}
      disabled={!onSelectProfile}
      className="min-w-0 truncate font-mono text-[#7da1ff] hover:text-white disabled:cursor-default"
      title={`Open ${displayName}`}
    >
      {displayName}
    </button>
  );
}

type ProfileActivityRow = {
  kind: "swap" | "transfer";
  signature: string;
  explorerUrl: string;
  token: string;
  action: string;
  amount: string;
  tone: "green" | "red";
  createdAt: string;
  note: string;
  counterpartyWallet?: string;
  directionLabel?: string;
};

function buildProfileActivityRows({
  wallet,
  receipts,
  transfers,
  includeTransfers,
}: {
  wallet: string;
  receipts: TradeReceiptRecord[];
  transfers: WalletTransferRecord[];
  includeTransfers: boolean;
}) {
  const swapRows: ProfileActivityRow[] = receipts.map((receipt) => ({
    kind: "swap",
    signature: receipt.signature,
    explorerUrl: receipt.explorerUrl ?? `https://solscan.io/tx/${receipt.signature}`,
    token: receipt.outputSymbol,
    action: receipt.side.toUpperCase(),
    amount: `${receipt.inputAmount} ${receipt.inputSymbol}`,
    tone: receipt.side === "buy" ? "green" : "red",
    createdAt: receipt.createdAt,
    note: receipt.route ? receipt.route : "",
  }));

  const transferRows: ProfileActivityRow[] = includeTransfers
    ? transfers.map((transfer) => {
        const outgoing = transfer.senderWallet === wallet;
        const counterparty = outgoing ? transfer.recipientWallet : transfer.senderWallet;

        return {
          kind: "transfer",
          signature: transfer.signature,
          explorerUrl: transfer.explorerUrl,
          token: transfer.assetSymbol,
          action: outgoing ? "SEND" : "RECEIVE",
          amount: `${transfer.amount} ${transfer.assetSymbol}`,
          tone: outgoing ? "red" : "green",
          createdAt: transfer.createdAt,
          note: transfer.note,
          counterpartyWallet: counterparty,
          directionLabel: outgoing ? "To" : "From",
        };
      })
    : [];

  return [...swapRows, ...transferRows].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  initial,
  profile,
  linkedAccounts,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: string;
  profile: StoredProfile;
  linkedAccounts: NonNullable<ReturnType<typeof usePrivy>["user"]>["linkedAccounts"];
  onSave: (profile: StoredProfile) => void;
}) {
  const { initOAuth, loading } = useLinkWithOAuth();
  const linkedX = linkedAccounts.find((account) => account.type === "twitter_oauth");
  const linkedXHandle =
    linkedX && "username" in linkedX && linkedX.username ? `@${linkedX.username}` : null;
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile.avatarDataUrl);
  const [bannerDataUrl, setBannerDataUrl] = useState(profile.bannerDataUrl);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername(profile.username);
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setAvatarDataUrl(profile.avatarDataUrl);
    setBannerDataUrl(profile.bannerDataUrl);
    setImageError(null);
  }, [
    open,
    profile.avatarDataUrl,
    profile.bannerDataUrl,
    profile.bio,
    profile.displayName,
    profile.username,
  ]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      username: normalizeHandle(username) || profile.username,
      displayName: displayName.trim() || profile.displayName,
      bio: bio.trim().slice(0, BIO_MAX_LENGTH),
      avatarDataUrl,
      bannerDataUrl,
    });
    onOpenChange(false);
  };

  const linkXAccount = async () => {
    if (linkedX || loading) return;
    await initOAuth({ provider: "twitter" });
  };

  const selectProfileImage = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: "avatar" | "banner",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await readImageAsDataUrl(file);
      if (kind === "avatar") {
        setAvatarDataUrl(dataUrl);
      } else {
        setBannerDataUrl(dataUrl);
      }
      setImageError(null);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not use that image.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-32px))] max-w-none gap-0 rounded-3xl border border-[#232034] bg-[#08060f] p-5 text-[#f4f1ff] shadow-[0_28px_120px_rgba(0,0,0,0.75)] [&>button]:-top-14 [&>button]:right-0 [&>button]:grid [&>button]:h-12 [&>button]:w-12 [&>button]:place-items-center [&>button]:rounded-full [&>button]:border [&>button]:border-[#252137] [&>button]:bg-[#0f0d17] [&>button]:text-white [&>button]:opacity-100 [&>button]:ring-offset-0 [&>button:hover]:bg-[#191522]">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your ChadWallet trading profile.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="relative h-[130px] rounded-xl bg-[#15131d]">
            {bannerDataUrl ? (
              <img
                src={bannerDataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(83,95,255,0.22),transparent_26rem),linear-gradient(135deg,#171420,#111019_70%)]" />
            )}
            <label
              className="absolute bottom-3 right-3 grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-[#282438] text-white transition hover:bg-[#332d46]"
              title="Edit banner"
            >
              <Pencil className="h-4 w-4" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => selectProfileImage(event, "banner")}
              />
            </label>
            <div className="absolute -bottom-8 left-6 z-20 grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-full border-[5px] border-[#08060f] bg-[radial-gradient(circle_at_30%_20%,#6571ff,#19162b_68%)] text-3xl font-black text-white shadow-[0_20px_54px_rgba(0,0,0,0.5)]">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <label
              className="absolute bottom-1 left-[54px] z-30 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#262333] text-white transition hover:bg-[#332d46]"
              title="Edit avatar"
            >
              <Pencil className="h-4 w-4" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => selectProfileImage(event, "avatar")}
              />
            </label>
          </div>

          <div className="pt-8 space-y-3">
            {imageError ? (
              <div className="rounded-lg border border-[#ff653d]/30 bg-[#ff653d]/10 px-3 py-2 text-[12px] font-semibold text-[#ff8b6d]">
                {imageError}
              </div>
            ) : null}

            <ProfileEditField label="Username">
              <div className="flex items-center">
                <span className="text-[17px] font-black text-white">@</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(normalizeHandle(event.target.value))}
                  maxLength={24}
                  className="min-w-0 flex-1 bg-transparent text-[17px] font-black text-white outline-none placeholder:text-[#696274]"
                  placeholder="username"
                />
              </div>
            </ProfileEditField>

            <ProfileEditField label="Display name">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                className="w-full bg-transparent text-[17px] font-black text-white outline-none placeholder:text-[#696274]"
                placeholder="Display name"
              />
            </ProfileEditField>

            <ProfileEditField label="Bio" tall>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX_LENGTH))}
                className="h-[64px] w-full resize-none bg-transparent text-[17px] font-black text-white outline-none placeholder:text-[#8f879d]"
                placeholder="Add a bio"
              />
              <div className="absolute bottom-3 right-4 text-[13px] font-semibold text-[#6d6679]">
                {bio.length}/{BIO_MAX_LENGTH}
              </div>
            </ProfileEditField>

            <button
              type="button"
              onClick={linkXAccount}
              disabled={Boolean(linkedX) || loading}
              className="flex h-11 w-full items-center gap-3 rounded-lg bg-[#1b1924] px-4 text-left text-[14px] font-bold text-[#6273ff] transition hover:bg-[#24202e] disabled:cursor-default disabled:text-[#8f879d] disabled:hover:bg-[#1b1924]"
            >
              <span className="text-[22px] leading-none">X</span>
              <span>
                {linkedXHandle
                  ? `Linked ${linkedXHandle}`
                  : loading
                    ? "Connecting..."
                    : "Link X account"}
              </span>
            </button>
          </div>

          <button
            type="submit"
            className="h-[54px] w-full rounded-xl bg-[#5365ff] text-[20px] font-black text-white transition hover:bg-[#6373ff]"
          >
            Save
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileEditField({
  label,
  tall = false,
  children,
}: {
  label: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative block rounded-xl bg-[#1a1822] px-4 py-3 ${
        tall ? "min-h-[102px]" : "min-h-[76px]"
      }`}
    >
      <span className="mb-2 block text-[13px] font-semibold leading-none text-[#777085]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FollowTopTradersPanel({
  onSelectProfile,
}: {
  onSelectProfile?: (wallet: string) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? user?.wallet?.address;
  const leaderboard = useAppLeaderboard();
  const followedQuery = useStoredFollowedTraders(walletAddress);
  const [localFollowed, setLocalFollowed] = useLocalFollowedTraders(walletAddress);
  const followed = useMemo(
    () => new Set([...(followedQuery.data ?? []), ...localFollowed]),
    [followedQuery.data, localFollowed],
  );
  const traders = useMemo(
    () => (leaderboard.data ?? []).filter((trader) => trader.wallet !== walletAddress).slice(0, 10),
    [leaderboard.data, walletAddress],
  );

  const toggleFollow = (targetWallet: string) => {
    if (!walletAddress || targetWallet === walletAddress) return;

    const following = !followed.has(targetWallet);
    const delta = following ? 1 : -1;
    setLocalFollowed(targetWallet, following);
    queryClient.setQueryData<FollowStats>(["follow-stats", walletAddress], (current) => ({
      following: Math.max(0, (current?.following ?? 0) + delta),
      followers: current?.followers ?? 0,
    }));
    queryClient.setQueryData<FollowStats>(["follow-stats", targetWallet], (current) => ({
      following: current?.following ?? 0,
      followers: Math.max(0, (current?.followers ?? 0) + delta),
    }));
    void syncFollowTrader({ wallet: walletAddress, targetWallet, following }).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ["followed-traders", walletAddress] });
      void queryClient.invalidateQueries({ queryKey: ["follow-stats", walletAddress] });
      void queryClient.invalidateQueries({ queryKey: ["follow-stats", targetWallet] });
    });
  };

  return (
    <aside className="terminal-scroll w-[320px] shrink-0 overflow-y-auto px-3 pt-2 max-xl:hidden 2xl:w-[340px]">
      <div className="rounded-xl border border-[#1b1726] bg-[#0b0912] px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-black leading-none text-white">Follow top traders</div>
            <div className="mt-1 text-[11px] font-semibold text-[#7a7488]">ChadWallet profiles</div>
          </div>
          <span className="rounded-md border border-[#252137] bg-[#15121d] px-2 py-1 text-[10px] font-black text-[#7da1ff]">
            LIVE
          </span>
        </div>

        <div className="space-y-2">
          {traders.map((trader, index) => {
            const isFollowing = followed.has(trader.wallet);

            return (
              <div
                key={trader.wallet}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-2 transition hover:bg-[#151221]"
              >
                <button
                  type="button"
                  onClick={() => onSelectProfile?.(trader.wallet)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="relative shrink-0">
                    <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#2a2540] bg-[#201d2c] text-[11px] font-black text-white">
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
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full border border-[#0b0912] bg-[#5365ff] px-1 font-mono text-[8px] font-black text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-black text-white">
                      {trader.displayName}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-[#8f879d]">
                      @{trader.username || shortWallet(trader.wallet)}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFollow(trader.wallet)}
                  disabled={!walletAddress}
                  className={`h-9 shrink-0 rounded-lg px-4 text-[12px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isFollowing
                      ? "bg-[#242033] hover:bg-[#302a43]"
                      : "bg-[#5365ff] hover:bg-[#6373ff]"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}

          {leaderboard.isFetching && !traders.length ? (
            <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
              Loading app users
            </div>
          ) : null}

          {!leaderboard.isFetching && !traders.length ? (
            <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
              No other ChadWallet traders yet
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function ProfileSendPanel({
  solPrice,
  recipientWallet,
}: {
  solPrice: number;
  recipientWallet?: string | null;
}) {
  if (!hasPrivy) {
    return null;
  }

  return <ConnectedProfileSendPanel solPrice={solPrice} recipientWallet={recipientWallet} />;
}

function ConnectedProfileSendPanel({
  solPrice,
  recipientWallet,
}: {
  solPrice: number;
  recipientWallet?: string | null;
}) {
  const queryClient = useQueryClient();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address;
  const { signTransaction } = useSignTransaction();
  const sol = useTokenPosition({
    owner: address,
    mint: SOL_MINT,
    decimals: 9,
    price: solPrice,
  });
  const walletPositions = useWalletTokenPositions(address, solPrice);
  const transfers = useWalletTransfers(address);
  const rpc = useMemo(() => (hasRpcEndpoint ? createSolanaRpc(env.solanaRpcUrl) : null), []);
  const [recipient, setRecipient] = useState(recipientWallet ?? "");
  const [selectedMint, setSelectedMint] = useState(SOL_MINT);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<WalletTransferRecord | null>(null);
  const solBalance = sol.data?.balance ?? 0;
  const sendAssets = useMemo(() => {
    const positions = walletPositions.data ?? [];
    if (positions.length) return positions.filter((position) => position.balance > 0);

    if (solBalance > 0) {
      return [
        {
          mint: SOL_MINT,
          symbol: "SOL",
          name: "Solana",
          logo: "",
          balance: solBalance,
          valueUsd: solBalance * solPrice,
          price: solPrice,
          decimals: 9,
          source: "rpc",
        },
      ];
    }

    return [];
  }, [solBalance, solPrice, walletPositions.data]);
  const selectedAsset =
    sendAssets.find((asset) => asset.mint === selectedMint) ?? sendAssets[0] ?? null;
  const selectedBalance = selectedAsset?.balance ?? 0;
  const selectedPrice = selectedAsset?.price ?? (selectedAsset?.mint === SOL_MINT ? solPrice : 0);
  const selectedSymbol = selectedAsset?.symbol ?? "SOL";
  const selectedDecimals = selectedAsset?.decimals ?? 9;
  const selectedMaxAmount =
    selectedAsset?.mint === SOL_MINT ? maxTransferableSol(selectedBalance) : selectedBalance;
  const amountNumber = Number(amount);
  const recipientClean = recipient.trim();
  const canSend =
    ready &&
    authenticated &&
    Boolean(wallet && address && rpc && recipientClean && selectedAsset) &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    amountNumber <= selectedMaxAmount &&
    (selectedAsset?.mint === SOL_MINT || solBalance >= TOKEN_TRANSFER_FEE_RESERVE_SOL);

  useEffect(() => {
    setRecipient(recipientWallet ?? "");
  }, [recipientWallet]);

  useEffect(() => {
    if (selectedAsset || !sendAssets[0]) return;
    setSelectedMint(sendAssets[0].mint);
  }, [selectedAsset, sendAssets]);

  const sendTransfer = async () => {
    setError("");
    setSubmitted(null);

    try {
      if (!wallet || !address || !rpc) throw new Error("Wallet or Solana RPC is unavailable.");
      if (!selectedAsset) throw new Error("Choose a token to send.");
      const destination = solanaAddress(recipientClean);
      const source = solanaAddress(address);
      if (recipientClean === address)
        throw new Error("Choose a recipient that is not your wallet.");
      if (amountNumber > selectedMaxAmount) {
        throw new Error(`Not enough ${selectedSymbol} for this send.`);
      }
      if (selectedAsset.mint === SOL_MINT && amountNumber > maxTransferableSol(solBalance)) {
        throw new Error(`Leave at least ${SOL_TRANSFER_FEE_RESERVE_SOL} SOL for network fees.`);
      }
      if (selectedAsset.mint !== SOL_MINT && solBalance < TOKEN_TRANSFER_FEE_RESERVE_SOL) {
        throw new Error(
          `Keep at least ${TOKEN_TRANSFER_FEE_RESERVE_SOL} SOL for token transfer network fees.`,
        );
      }

      setSending(true);
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash({ commitment: "confirmed" })
        .send();
      const baseTransactionMessage = pipe(
        createTransactionMessage({ version: "legacy" }),
        (message) => setTransactionMessageFeePayer(source, message),
        (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      );
      let sourceAmount = "";
      const transactionMessage =
        selectedAsset.mint === SOL_MINT
          ? (() => {
              const lamports = parseSolLamports(amount);
              sourceAmount = formatLamportsAsSol(lamports);
              return pipe(baseTransactionMessage, (message) =>
                appendTransactionMessageInstruction(
                  getTransferSolInstruction({
                    source: createNoopSigner(source),
                    destination,
                    amount: lamports,
                  }),
                  message,
                ),
              );
            })()
          : await (async () => {
              const mint = solanaAddress(selectedAsset.mint);
              const tokenProgram = solanaAddress(selectedAsset.programId ?? SPL_TOKEN_PROGRAM_ID);
              const tokenAmount = parseTokenUnits(amount, selectedDecimals, selectedSymbol);
              sourceAmount = formatTokenUnits(tokenAmount, selectedDecimals);
              const sourceTokenAccount = solanaAddress(
                await fetchTokenTransferSourceAccount({
                  rpcUrl: env.solanaRpcUrl,
                  owner: address,
                  mint: selectedAsset.mint,
                  tokenProgram: selectedAsset.programId ?? SPL_TOKEN_PROGRAM_ID,
                  amount: tokenAmount,
                }),
              );
              const [destinationTokenAccount] = await findAssociatedTokenPda({
                owner: destination,
                tokenProgram,
                mint,
              });

              return pipe(
                baseTransactionMessage,
                (message) =>
                  appendTransactionMessageInstruction(
                    getCreateAssociatedTokenIdempotentInstruction({
                      payer: createNoopSigner(source),
                      ata: destinationTokenAccount,
                      owner: destination,
                      mint,
                      tokenProgram,
                    }),
                    message,
                  ),
                (message) =>
                  appendTransactionMessageInstruction(
                    getTransferCheckedInstruction(
                      {
                        source: sourceTokenAccount,
                        mint,
                        destination: destinationTokenAccount,
                        authority: createNoopSigner(source),
                        amount: tokenAmount,
                        decimals: selectedDecimals,
                      },
                      { programAddress: tokenProgram },
                    ),
                    message,
                  ),
              );
            })();
      const transaction = compileTransaction(transactionMessage);
      const { signedTransaction } = await signTransaction({
        wallet,
        chain: SOLANA_MAINNET_CHAIN,
        transaction: new Uint8Array(getTransactionEncoder().encode(transaction)),
        options: {
          preflightCommitment: "confirmed",
        },
      });
      const { signature } = await broadcastSignedSolanaTransaction(
        bytesToBase64(signedTransaction),
      );
      const nextTransfer: WalletTransferRecord = {
        signature,
        senderWallet: address,
        recipientWallet: recipientClean,
        assetSymbol: selectedSymbol,
        assetMint: selectedAsset.mint,
        amount: sourceAmount,
        note: note.trim().slice(0, NOTE_MAX_LENGTH),
        status: "submitted",
        slot: null,
        explorerUrl: `https://solscan.io/tx/${signature}`,
        createdAt: new Date().toISOString(),
      };

      setSubmitted(nextTransfer);
      try {
        const storage = await recordWalletTransfer(nextTransfer);
        if (!storage.stored) {
          setError(
            "Transfer succeeded on-chain, but ChadWallet could not store the app receipt. Keep the Solscan link and refresh.",
          );
        }
      } catch (storageError) {
        console.warn("Transfer submitted, but receipt storage failed.", storageError);
        setError(
          "Transfer succeeded on-chain, but ChadWallet could not store the app receipt. Keep the Solscan link and refresh.",
        );
      }
      setAmount("");
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["token-position", address] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-token-positions", address] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-token-positions", recipientClean] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transfers", address] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transfers", recipientClean] }),
      ]);
    } catch (sendError) {
      setError(normalizeSendError(sendError));
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="terminal-scroll w-[320px] shrink-0 overflow-y-auto px-3 pt-2 max-xl:hidden 2xl:w-[340px]">
      <div className="rounded-xl border border-[#1b1726] bg-[#0b0912] p-3">
        <div className="mb-3 flex h-9 items-center justify-between rounded-lg bg-[#15121d] px-3">
          <div className="flex items-center gap-2 text-[15px] font-black text-white">
            <Send className="h-4 w-4 text-[#7da1ff]" />
            Send
          </div>
          <span className="rounded-md border border-[#252137] bg-[#0d0a13] px-2 py-1 font-mono text-[11px] font-bold text-[#a9b0d4]">
            {sendAssets.length ? `${sendAssets.length} assets` : "No assets"}
          </span>
        </div>

        <div className="rounded-xl border border-[#1b1726]/70 bg-[#100d18] p-3">
          <label className="mb-3 block text-[11px] font-semibold text-[#7a7488]">
            Asset
            <select
              value={selectedAsset?.mint ?? selectedMint}
              onChange={(event) => {
                setSelectedMint(event.target.value);
                setAmount("");
                setSubmitted(null);
                setError("");
              }}
              className="mt-1 h-10 w-full rounded-lg border border-[#1b1726] bg-[#0b0912] px-3 text-xs font-black text-white outline-none transition focus:border-[#5365ff]"
            >
              {sendAssets.map((asset) => (
                <option key={asset.mint} value={asset.mint}>
                  {asset.symbol} - {formatTokenAmount(asset.balance)}
                </option>
              ))}
            </select>
          </label>
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#7a7488]">
            <span>You send</span>
            <span className="font-mono">
              {formatTokenAmount(selectedBalance)} {selectedSymbol}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-mono text-[30px] font-black text-white outline-none placeholder:text-[#3a3348]"
            />
            <button
              onClick={() => setAmount(String(selectedMaxAmount))}
              className="rounded-md border border-[#252137] px-2 py-1 text-[11px] font-black text-[#a9b0d4] hover:text-white"
            >
              MAX
            </button>
            <span className="font-mono text-sm font-black text-[#a9b0d4]">{selectedSymbol}</span>
          </div>
          <div className="mt-1 text-right text-[11px] font-semibold text-[#7a7488]">
            {Number.isFinite(amountNumber) && amountNumber > 0
              ? selectedPrice > 0
                ? `~ ${formatUsd(amountNumber * selectedPrice)}`
                : "Live USD price unavailable"
              : "$0"}
          </div>
          {selectedAsset?.mint !== SOL_MINT && solBalance < TOKEN_TRANSFER_FEE_RESERVE_SOL ? (
            <div className="mt-2 rounded-md border border-[#4a3518] bg-[#241808] px-2 py-1.5 text-[10.5px] font-semibold text-[#ffbd6b]">
              Keep at least {TOKEN_TRANSFER_FEE_RESERVE_SOL} SOL for token network fees.
            </div>
          ) : null}
        </div>

        <label className="mt-3 block text-[11px] font-semibold text-[#7a7488]">
          Recipient wallet
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Solana wallet address"
            className="mt-1 h-10 w-full rounded-lg border border-[#1b1726] bg-[#100d18] px-3 font-mono text-[11px] text-white outline-none transition focus:border-[#5365ff]"
          />
        </label>

        <label className="mt-3 block text-[11px] font-semibold text-[#7a7488]">
          Note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX_LENGTH))}
            placeholder="Add a note"
            className="mt-1 h-20 w-full resize-none rounded-lg border border-[#1b1726] bg-[#100d18] px-3 py-2 text-xs text-white outline-none transition placeholder:text-[#4b435b] focus:border-[#5365ff]"
          />
          <span className="mt-1 block text-right font-mono text-[10px] text-[#5c5669]">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </label>

        <button
          onClick={sendTransfer}
          disabled={sending || !canSend}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#252137] bg-[#15121d] text-sm font-black text-white transition hover:bg-[#1f1b2a] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Review send
        </button>

        <p className="mt-2 text-[10.5px] font-semibold leading-relaxed text-[#7a7488]">
          Real mainnet transfer. Wallet confirmation is required and the receipt is recorded.
        </p>

        {error ? (
          <div className="mt-3 rounded-lg border border-[#5a1d24] bg-[#2a0d13] px-3 py-2 text-xs font-semibold text-[#ff6f77]">
            {error}
          </div>
        ) : null}

        {submitted ? (
          <a
            href={submitted.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#123a2a] bg-[#071d14] px-3 py-2 text-xs font-bold text-[#20d772]"
          >
            Transfer submitted
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-[#1b1726] bg-[#0b0912]">
        <div className="border-b border-[#1b1726] px-3 py-3 text-sm font-black text-white">
          Recent transfers
        </div>
        <div className="divide-y divide-[#171320]">
          {(transfers.data ?? []).slice(0, 6).map((transfer) => (
            <a
              key={transfer.signature}
              href={transfer.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-3 text-xs transition hover:bg-[#151221]"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    transfer.senderWallet === address ? "text-[#ff653d]" : "text-[#20d772]"
                  }
                >
                  {transfer.senderWallet === address ? "Sent" : "Received"} {transfer.amount}{" "}
                  {transfer.assetSymbol}
                </span>
                <span className="font-mono text-[#5c5669]">
                  {new Date(transfer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1 truncate font-mono text-[#7a7488]">
                {transfer.senderWallet === address
                  ? transfer.recipientWallet
                  : transfer.senderWallet}
              </div>
              {transfer.note ? (
                <div className="mt-1 line-clamp-2 text-[#a9b0d4]">{transfer.note}</div>
              ) : null}
            </a>
          ))}
          {!transfers.data?.length ? (
            <div className="px-3 py-8 text-center text-xs font-semibold text-[#5c5669]">
              No transfers recorded yet
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SignedOutProfile() {
  return (
    <div className="grid h-full place-items-center bg-[#08060f] px-6 text-center">
      <div>
        <div className="text-xl font-black text-white">Connect wallet to view profile</div>
        <div className="mt-2 max-w-sm text-sm font-semibold text-[#7a7488]">
          Your trading profile uses Privy login, embedded wallet balances, and locally saved swap
          receipts.
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[76px] border-r border-[#1b1726] pr-4 text-center last:border-r-0">
      <div className="font-mono text-[18px] font-black text-white">{value}</div>
      <div className="text-xs font-semibold text-[#a9b0d4]">{label}</div>
    </div>
  );
}

function PortfolioValueChart({
  points,
  range,
  loading,
  unavailable,
}: {
  points: PortfolioHistoryPoint[];
  range: PortfolioHistoryRange;
  loading: boolean;
  unavailable: boolean;
}) {
  const [hover, setHover] = useState<{
    point: PortfolioHistoryPoint;
    pixelX: number;
    viewX: number;
    y: number;
  } | null>(null);
  const shape = useMemo(() => buildPortfolioShape(points, range), [points, range]);
  const hasHistory = shape.chartPoints.length > 0;
  const hasLine = Boolean(shape.linePath);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (loading || !shape.chartPoints.length) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const cursorX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * shape.width;
    const nearest = shape.chartPoints.reduce((best, point) =>
      Math.abs(point.x - cursorX) < Math.abs(best.x - cursorX) ? point : best,
    );

    setHover({
      point: nearest.point,
      pixelX: (nearest.x / shape.width) * rect.width,
      viewX: nearest.x,
      y: nearest.y,
    });
  };

  const tooltipSide =
    hover && hover.pixelX > 320
      ? "translateX(-100%)"
      : hover && hover.pixelX > 140
        ? "translateX(-50%)"
        : "translateX(0)";

  return (
    <div className="mt-7 h-[235px] min-w-0 bg-[#151920] max-xl:h-[210px]">
      <div
        className="relative h-full cursor-crosshair overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox="0 0 1000 235"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-label="Portfolio value chart"
        >
          <defs>
            <linearGradient id="portfolio-value-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f4c430" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#f4c430" stopOpacity="0" />
            </linearGradient>
          </defs>
          {hasLine ? <path d={shape.areaPath} fill="url(#portfolio-value-fill)" /> : null}
          {hasLine ? (
            <path
              d={shape.linePath}
              fill="none"
              stroke="#f4c430"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ) : null}
          {hover ? (
            <>
              <line
                x1={hover.viewX}
                x2={hover.viewX}
                y1="0"
                y2="235"
                stroke="#f4c430"
                strokeOpacity="0.18"
              />
              <circle
                cx={hover.viewX}
                cy={hover.y}
                r="5"
                fill="#f4c430"
                stroke="#151920"
                strokeWidth="3"
              />
            </>
          ) : null}
        </svg>

        {loading ? (
          <div className="absolute inset-0 grid place-items-center text-sm font-bold text-[#7a7488]">
            Loading wallet history
          </div>
        ) : unavailable ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-bold text-[#7a7488]">
            Wallet history unavailable from Solana RPC
          </div>
        ) : !hasHistory ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-bold text-[#7a7488]">
            No confirmed wallet history yet
          </div>
        ) : hover ? (
          <div
            className="pointer-events-none absolute top-3 z-10 rounded-lg border border-[#3b3342] bg-[#141119]/95 px-3 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
            style={{ left: hover.pixelX, transform: tooltipSide }}
          >
            <div className="font-mono text-sm font-black text-white">
              {formatUsd(hover.point.value)}
            </div>
            <div className="mt-1 whitespace-nowrap text-[11px] font-semibold text-[#a9b0d4]">
              {formatPortfolioPointTime(hover.point.timestamp, range)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useLocalTradeReceipts(walletAddress?: string) {
  const [receipts, setReceipts] = useState<TradeReceipt[]>([]);

  useEffect(() => {
    if (!walletAddress) {
      setReceipts([]);
      return;
    }

    try {
      const current = JSON.parse(
        window.localStorage.getItem(RECEIPT_KEY) || "[]",
      ) as TradeReceipt[];
      setReceipts(
        current
          .filter((receipt) => receipt.wallet?.toLowerCase() === walletAddress.toLowerCase())
          .slice(0, 24),
      );
    } catch {
      setReceipts([]);
    }
  }, [walletAddress]);

  return receipts;
}

function useLocalFollowedTraders(walletAddress?: string) {
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => {
    if (!walletAddress) {
      setFollowed([]);
      return;
    }

    try {
      const current = JSON.parse(
        window.localStorage.getItem(`${PROFILE_KEY}:follows:${walletAddress}`) || "[]",
      ) as string[];
      setFollowed(current.filter(Boolean));
    } catch {
      setFollowed([]);
    }
  }, [walletAddress]);

  const updateFollowed = (targetWallet: string, following: boolean) => {
    if (!walletAddress || targetWallet === walletAddress) return;

    setFollowed((current) => {
      const next = following
        ? Array.from(new Set([...current, targetWallet]))
        : current.filter((wallet) => wallet !== targetWallet);
      window.localStorage.setItem(`${PROFILE_KEY}:follows:${walletAddress}`, JSON.stringify(next));
      return next;
    });
  };

  return [followed, updateFollowed] as const;
}

function mergeTradeReceipts(primary: TradeReceipt[], fallback: TradeReceipt[]) {
  const bySignature = new Map<string, TradeReceipt>();

  for (const receipt of [...primary, ...fallback]) {
    if (!receipt.signature) continue;
    bySignature.set(receipt.signature, {
      ...receipt,
      explorerUrl: receipt.explorerUrl ?? `https://solscan.io/tx/${receipt.signature}`,
    });
  }

  return Array.from(bySignature.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 50);
}

function useStoredProfile(
  walletAddress: string | undefined,
  fallback: StoredProfile,
  remoteProfile?: UserProfileRecord | null,
) {
  const [profile, setProfile] = useState<StoredProfile>(fallback);
  const fallbackUsername = fallback.username;
  const fallbackDisplayName = fallback.displayName;
  const fallbackBio = fallback.bio;
  const fallbackAvatarDataUrl = fallback.avatarDataUrl;
  const fallbackBannerDataUrl = fallback.bannerDataUrl;

  useEffect(() => {
    const fallbackProfile = {
      username: fallbackUsername,
      displayName: fallbackDisplayName,
      bio: fallbackBio,
      avatarDataUrl: fallbackAvatarDataUrl,
      bannerDataUrl: fallbackBannerDataUrl,
    };

    if (!walletAddress) {
      setProfile(fallbackProfile);
      return;
    }

    if (remoteProfile) {
      setProfile({
        username: normalizeHandle(remoteProfile.username || fallbackUsername) || fallbackUsername,
        displayName: remoteProfile.displayName?.trim() || fallbackDisplayName,
        bio: (remoteProfile.bio || "").slice(0, BIO_MAX_LENGTH),
        avatarDataUrl: isDataImage(remoteProfile.avatarDataUrl)
          ? remoteProfile.avatarDataUrl
          : fallbackAvatarDataUrl,
        bannerDataUrl: isDataImage(remoteProfile.bannerDataUrl)
          ? remoteProfile.bannerDataUrl
          : fallbackBannerDataUrl,
      });
      return;
    }

    try {
      const stored = window.localStorage.getItem(`${PROFILE_KEY}:${walletAddress}`);
      if (!stored) {
        setProfile(fallbackProfile);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StoredProfile>;
      setProfile({
        username: normalizeHandle(parsed.username || fallbackUsername) || fallbackUsername,
        displayName: parsed.displayName?.trim() || fallbackDisplayName,
        bio: (parsed.bio || "").slice(0, BIO_MAX_LENGTH),
        avatarDataUrl: isDataImage(parsed.avatarDataUrl)
          ? parsed.avatarDataUrl
          : fallbackAvatarDataUrl,
        bannerDataUrl: isDataImage(parsed.bannerDataUrl)
          ? parsed.bannerDataUrl
          : fallbackBannerDataUrl,
      });
    } catch {
      setProfile(fallbackProfile);
    }
  }, [
    fallbackAvatarDataUrl,
    fallbackBannerDataUrl,
    fallbackBio,
    fallbackDisplayName,
    fallbackUsername,
    remoteProfile,
    walletAddress,
  ]);

  const saveProfile = (nextProfile: StoredProfile) => {
    const normalized = {
      username: normalizeHandle(nextProfile.username) || fallbackUsername,
      displayName: nextProfile.displayName.trim() || fallbackDisplayName,
      bio: nextProfile.bio.trim().slice(0, BIO_MAX_LENGTH),
      avatarDataUrl: isDataImage(nextProfile.avatarDataUrl) ? nextProfile.avatarDataUrl : "",
      bannerDataUrl: isDataImage(nextProfile.bannerDataUrl) ? nextProfile.bannerDataUrl : "",
    };
    setProfile(normalized);

    if (!walletAddress) return;
    window.localStorage.setItem(`${PROFILE_KEY}:${walletAddress}`, JSON.stringify(normalized));
    void recordUserProfile({
      wallet: walletAddress,
      username: normalized.username,
      displayName: normalized.displayName,
      bio: normalized.bio,
      avatarDataUrl: normalized.avatarDataUrl,
      bannerDataUrl: normalized.bannerDataUrl,
    });
  };

  return { profile, saveProfile };
}

function normalizeHandle(value: string) {
  return value
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 24);
}

function isDataImage(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(value);
}

function normalizeSendError(error: unknown) {
  return normalizeSolanaTransactionError(
    error,
    "Unable to send this transfer. Check the recipient wallet, balance, and wallet approval.",
  );
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

function formatTokenAmount(value: number) {
  if (value >= 1_000_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1, notation: "compact" });
  }

  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  return value.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function buildPortfolioShape(points: PortfolioHistoryPoint[], range: PortfolioHistoryRange) {
  const width = 1000;
  const height = 235;
  const top = 24;
  const bottom = 26;
  const baseline = height - bottom;
  const sortedPoints = points
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (!sortedPoints.length) {
    return {
      areaPath: "",
      chartPoints: [] as Array<{ point: PortfolioHistoryPoint; x: number; y: number }>,
      linePath: "",
      width,
    };
  }

  const now = Date.now();
  const spanMs = getPortfolioRangeSpan(range);
  const rangeStart = range === "ALL" ? sortedPoints[0].timestamp : now - spanMs;
  const rangeEnd = Math.max(now, sortedPoints[sortedPoints.length - 1].timestamp);
  const rangeSpan = Math.max(1, rangeEnd - rangeStart);
  const values = sortedPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const chartPoints = sortedPoints.map((point) => {
    const x = clamp(((point.timestamp - rangeStart) / rangeSpan) * width, 0, width);
    if (!span) return { point, x, y: 130 };
    const y = top + ((max - point.value) / span) * (height - top - bottom - 18);
    return { point, x, y };
  });

  const linePoints =
    chartPoints.length === 1
      ? [
          { ...chartPoints[0], x: 0 },
          { ...chartPoints[0], x: width },
        ]
      : chartPoints;
  const linePath = buildStepLinePath(linePoints);
  const first = linePoints[0] ?? { x: 0, y: 130 };
  const last = linePoints[linePoints.length - 1] ?? first;

  return {
    areaPath: `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`,
    chartPoints,
    linePath,
    width,
  };
}

function buildStepLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    return `${path} L ${point.x} ${previous.y} L ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function getPortfolioRangeSpan(range: PortfolioHistoryRange) {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (range === "24H") return day;
  if (range === "7D") return 7 * day;
  if (range === "30D") return 30 * day;
  return 180 * day;
}

function formatPortfolioPointTime(timestamp: number, range: PortfolioHistoryRange) {
  const date = new Date(timestamp);

  if (range === "24H") {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(range === "ALL" ? { year: "numeric" } : {}),
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    if (file.size > 1_500_000) {
      reject(new Error("Image is too large. Use an image under 1.5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && isDataImage(result)) {
        resolve(result);
        return;
      }

      reject(new Error("Could not read that image."));
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function getLoginEmail(user: ReturnType<typeof usePrivy>["user"]) {
  if (!user) return null;
  if (user.email?.address) return user.email.address;

  const account = user.linkedAccounts.find(
    (linked) =>
      linked.type === "google_oauth" || linked.type === "apple_oauth" || linked.type === "email",
  );

  return account && "email" in account
    ? account.email
    : account && "address" in account
      ? account.address
      : null;
}

function getDisplayName(user: ReturnType<typeof usePrivy>["user"], email: string | null) {
  const googleAccount = user?.linkedAccounts.find((linked) => linked.type === "google_oauth");
  if (googleAccount?.name?.trim()) return googleAccount.name.trim();

  if (email) {
    const localPart = email.split("@")[0] ?? "";
    const readable = localPart
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim();
    if (readable) return readable;
  }

  return "Chad Trader";
}

function getProfileHandle(displayName: string, email: string | null) {
  const base = email?.split("@")[0] || displayName;
  const handle = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18);
  return handle || "ChadTrader";
}

async function copyToClipboard(value: string) {
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
