"use client";

import { useLinkWithOAuth, usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Clock3, Copy, Pencil, Repeat2, UserPlus } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
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
import { hasPrivy } from "@/lib/env";
import { useTokenPosition } from "@/lib/market-data";
import { SOL_MINT, USDC_MINT, formatUsd } from "@/lib/tokens";

const RECEIPT_KEY = "chadwallet-trade-receipts";
const PROFILE_KEY = "chadwallet-profile";
const BIO_MAX_LENGTH = 160;

type TradeReceipt = {
  signature: string;
  status: "submitted" | "confirmed" | "finalized";
  slot: number | null;
  wallet: string;
  side: "buy" | "sell";
  inputSymbol: string;
  outputSymbol: string;
  inputAmount: string;
  outputAmount: number;
  route: string;
  router: string;
  tokenMint: string;
  createdAt: string;
  explorerUrl: string;
};

type StoredProfile = {
  username: string;
  displayName: string;
  bio: string;
  avatarDataUrl: string;
  bannerDataUrl: string;
};

export function TradeProfileCenter({ solPrice }: { solPrice: number }) {
  if (!hasPrivy) {
    return <SignedOutProfile />;
  }

  return <ConnectedTradeProfileCenter solPrice={solPrice} />;
}

function ConnectedTradeProfileCenter({ solPrice }: { solPrice: number }) {
  const queryClient = useQueryClient();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address ?? user?.wallet?.address;
  const email = getLoginEmail(user);
  const defaultDisplayName = getDisplayName(user, email);
  const defaultHandle = getProfileHandle(defaultDisplayName, email);
  const { profile, saveProfile } = useStoredProfile(address, {
    username: defaultHandle,
    displayName: defaultDisplayName,
    bio: "",
    avatarDataUrl: "",
    bannerDataUrl: "",
  });
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
  const [range, setRange] = useState<"24H" | "7D" | "30D" | "ALL">("24H");
  const [swapTab, setSwapTab] = useState<"swaps" | "buys" | "sells">("swaps");
  const [positionTab, setPositionTab] = useState<"open" | "closed">("open");
  const receipts = useTradeReceipts(address);
  const cashBalance = usdc.data?.balance ?? 0;
  const solBalance = sol.data?.balance ?? 0;
  const solValue = sol.data?.valueUsd ?? 0;
  const portfolioValue = cashBalance + solValue;
  const loadingBalances = sol.isFetching || usdc.isFetching;
  const visibleReceipts = useMemo(() => {
    if (swapTab === "buys") return receipts.filter((receipt) => receipt.side === "buy");
    if (swapTab === "sells") return receipts.filter((receipt) => receipt.side === "sell");
    return receipts;
  }, [receipts, swapTab]);

  const positions = [
    ...(cashBalance > 0
      ? [
          {
            token: "USDC",
            amount: cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }),
            value: formatUsd(cashBalance),
          },
        ]
      : []),
    ...(solBalance > 0
      ? [
          {
            token: "SOL",
            amount: solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 }),
            value: formatUsd(solValue),
          },
        ]
      : []),
  ];

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
              <ProfileStat value="0" label="Following" />
              <ProfileStat value="0" label="Followers" />
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

              <div className="mt-7 h-[235px] min-w-0 bg-[#070a0f] max-xl:h-[210px]">
                <div className="relative h-full border-b border-[#101722]">
                  <div className="absolute left-2 right-0 top-[55%] h-0.5 bg-[#20d772]" />
                  <div className="absolute bottom-0 left-2 right-0 top-[55%] bg-gradient-to-b from-[#20d772]/10 to-transparent" />
                </div>
              </div>

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
                        key={position.token}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(70px,0.8fr)] px-4 py-3 text-xs font-semibold"
                      >
                        <span className="min-w-0 truncate text-white">{position.token}</span>
                        <span className="min-w-0 truncate font-mono text-[#a9b0d4]">
                          {position.amount}
                        </span>
                        <span className="min-w-0 truncate text-right font-mono text-white">
                          {position.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-20 place-items-center text-sm font-semibold text-[#5c5669]">
                    No {positionTab} positions
                  </div>
                )}
              </section>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912]">
              <div className="flex h-12 items-center gap-4 border-b border-[#1b1726] bg-[#15121d] px-4 text-sm font-black">
                {[
                  ["swaps", "All swaps"],
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
              <div className="grid min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(66px,0.7fr)_minmax(0,1.15fr)_minmax(60px,0.75fr)] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
                <span className="min-w-0 truncate">Token</span>
                <span className="min-w-0 truncate">Action</span>
                <span className="min-w-0 truncate">Amount</span>
                <span className="min-w-0 truncate text-right">Time</span>
              </div>
              {visibleReceipts.length ? (
                <div className="divide-y divide-[#171320]">
                  {visibleReceipts.map((receipt) => (
                    <a
                      key={receipt.signature}
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(66px,0.7fr)_minmax(0,1.15fr)_minmax(60px,0.75fr)] px-4 py-3 text-xs font-semibold transition hover:bg-[#151221]"
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
                      <span className="min-w-0 truncate text-right text-[#5c5669]">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="grid h-[380px] place-items-center text-sm font-semibold text-[#5c5669] max-xl:h-[280px]">
                  No trades yet
                </div>
              )}
            </section>
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

export function FollowTopTradersPanel() {
  return (
    <aside className="terminal-scroll w-[300px] shrink-0 overflow-y-auto px-3 pt-2 max-xl:hidden 2xl:w-[320px]">
      <div className="mb-4 flex h-8 items-center gap-2">
        <UserPlus className="h-4 w-4 text-[#5c5669]" />
        <h2 className="text-[15px] font-black leading-none text-white">Follow top traders</h2>
      </div>
      <div className="space-y-2">
        {profileSuggestions.map((trader) => (
          <ProfileTrader key={trader.handle} trader={trader} />
        ))}
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

function ProfileTrader({ trader }: { trader: { name: string; handle: string; color: string } }) {
  return (
    <div className="flex min-h-[48px] items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-[#151221]/50">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${trader.color}, #171421 70%)`,
        }}
      >
        {trader.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold leading-none text-[#e8e4f0]">
          {trader.name}
        </div>
        <div className="mt-1 truncate text-[11.5px] font-semibold leading-none text-[#a9b0d4]">
          {trader.handle}
        </div>
      </div>
      <button className="h-7 shrink-0 rounded-lg bg-[#5365ff] px-3.5 text-[11.5px] font-black text-white transition hover:bg-[#6373ff]">
        Follow
      </button>
    </div>
  );
}

function useTradeReceipts(walletAddress?: string) {
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

function useStoredProfile(walletAddress: string | undefined, fallback: StoredProfile) {
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

const profileSuggestions = [
  { name: "leo", handle: "@0xleo", color: "#ef5f46" },
  { name: "asta", handle: "@astasol", color: "#d8b8c7" },
  { name: "remus (rtr/acc)", handle: "@remusofmars", color: "#c48d42" },
  { name: "Dr Gero", handle: "@0xg3ro", color: "#9db4d8" },
  { name: "GCR Junior", handle: "@gcrJR", color: "#4cf57d" },
  { name: "White Russian", handle: "@WhiteRusskiye", color: "#918d77" },
  { name: "A.L. Trenchman", handle: "@Captain_AL_80", color: "#88905d" },
  { name: "Daumen", handle: "@daumenxyz", color: "#d6ff46" },
  { name: "inyourwalls", handle: "@inyourwalls", color: "#5a9c6f" },
  { name: "Dubi", handle: "@Dubi_CH", color: "#d8d8d8" },
];

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
