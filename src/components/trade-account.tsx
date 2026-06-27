"use client";

import { useLogout, usePrivy } from "@privy-io/react-auth";
import {
  useExportWallet,
  useFundWallet,
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  address as solanaAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Decoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Repeat2,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SignInButton } from "@/components/sign-in-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { env, hasPrivy, hasRpcEndpoint } from "@/lib/env";
import { useTokenPosition } from "@/lib/market-data";
import { SOL_MINT, USDC_MINT, formatUsd } from "@/lib/tokens";

type AccountDialog = "deposit" | "withdraw" | "manage" | null;

export function TradeAccount({ solPrice }: { solPrice: number }) {
  if (!hasPrivy) {
    return <SignInButton />;
  }

  return <ConnectedTradeAccount solPrice={solPrice} />;
}

function ConnectedTradeAccount({ solPrice }: { solPrice: number }) {
  const queryClient = useQueryClient();
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { logout } = useLogout();
  const wallet = wallets[0];
  const address = wallet?.address ?? user?.wallet?.address;
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
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [blurBalances, setBlurBalances] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setBlurBalances(window.localStorage.getItem("chadwallet-blur-balances") === "true");
  }, []);

  if (!ready || !authenticated || !address) {
    return <SignInButton />;
  }

  const cashBalance = usdc.data?.balance ?? 0;
  const solBalance = sol.data?.balance ?? 0;
  const portfolioValue = cashBalance + (sol.data?.valueUsd ?? 0);
  const loadingBalances = sol.isFetching || usdc.isFetching;
  const displayMoney = (value: number) =>
    blurBalances ? "****" : loadingBalances ? "..." : formatUsd(value);
  const email = getLoginEmail(user);
  const displayName = getDisplayName(user, email);
  const profileInitial = displayName.charAt(0).toUpperCase();
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  const copyText = async (value: string, key: string) => {
    const didCopy = await copyToClipboard(value);
    if (!didCopy) return;

    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const setBalancePrivacy = (checked: boolean) => {
    setBlurBalances(checked);
    window.localStorage.setItem("chadwallet-blur-balances", String(checked));
  };

  return (
    <>
      <div className="hidden items-stretch gap-1 lg:flex">
        <button
          onClick={() => setDialog("deposit")}
          className="min-w-[108px] rounded-lg border border-[#201b2e] bg-[#100d18] px-3 py-1.5 text-left transition hover:bg-[#171320]"
        >
          <div className="font-mono text-xs font-semibold">{displayMoney(cashBalance)} cash</div>
          <div className="text-[10px] font-semibold text-[#5f73ff]">Deposit more</div>
        </button>
        <div className="min-w-[90px] rounded-lg border border-[#201b2e] bg-[#100d18] px-3 py-1.5">
          <div className="font-mono text-xs font-semibold">{displayMoney(portfolioValue)}</div>
          <div className="text-[10px] text-muted-foreground">Portfolio</div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-11 min-w-0 max-w-[190px] items-center gap-2.5 rounded-full border border-[#201b2e] bg-[#100d18] py-1.5 pl-1.5 pr-3 shadow-lg shadow-black/15 backdrop-blur transition hover:border-[#342c4a] hover:bg-[#171320]"
            aria-label="Open account menu"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5962ff] text-sm font-bold text-white shadow-[0_0_18px_rgba(89,98,255,0.22)]">
              {profileInitial}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold sm:text-sm">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-lg border-border bg-popover/98 p-2 shadow-2xl backdrop-blur"
        >
          <DropdownMenuLabel className="px-2 py-2">
            <div className="truncate text-xs font-semibold">{displayName}</div>
            {email && (
              <div className="mt-0.5 truncate text-[10px] font-normal text-muted-foreground">
                {email}
              </div>
            )}
            <div className="mt-0.5 font-mono text-[10px] font-normal text-muted-foreground">
              {shortAddress}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("deposit")} className="cursor-pointer py-2">
            <ArrowDownToLine />
            Deposit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("withdraw")} className="cursor-pointer py-2">
            <ArrowUpFromLine />
            Withdraw
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("manage")} className="cursor-pointer py-2">
            <UserRound />
            Your profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("manage")} className="cursor-pointer py-2">
            <Settings />
            Manage account
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={blurBalances}
            onCheckedChange={setBalancePrivacy}
            onSelect={(event) => event.preventDefault()}
            className="cursor-pointer py-2 pl-8"
          >
            <EyeOff className="absolute left-2 h-4 w-4" />
            Blur balances
          </DropdownMenuCheckboxItem>
          {/* <DropdownMenuItem
            onSelect={() =>
              copyText(
                `${window.location.origin}/?ref=${encodeURIComponent(user?.id ?? address)}`,
                "referral",
              )
            }
            className="cursor-pointer py-2"
          >
            {copied === "referral" ? <Check /> : <Gift />}
            {copied === "referral" ? "Referral copied" : "Referrals"}
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logout()}
            className="cursor-pointer py-2 text-destructive focus:text-destructive"
          >
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      <ManageAccountDialog
        open={dialog === "manage"}
        onOpenChange={(open) => !open && setDialog(null)}
        email={email}
        address={address}
        displayName={displayName}
        profileInitial={profileInitial}
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        solBalance={solBalance}
        loadingBalances={loadingBalances}
        copied={copied}
        onCopy={(value, key) => copyText(value, key)}
        onDeposit={() => setDialog("deposit")}
        onWithdraw={() => setDialog("withdraw")}
      />
    </>
  );
}

function DepositDialog({
  open,
  onOpenChange,
  address,
  onFundComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  onFundComplete: () => void;
}) {
  const [copied, setCopied] = useState<"SOL" | "USDC" | "address" | null>(null);
  const [fundingAsset, setFundingAsset] = useState<"SOL" | "USDC" | null>(null);
  const [fundingError, setFundingError] = useState("");
  const { fundWallet } = useFundWallet({
    onUserExited: () => setFundingAsset(null),
  });

  const copyDepositAddress = async (asset: "SOL" | "USDC" | "address") => {
    const didCopy = await copyToClipboard(address);
    if (!didCopy) return;

    setCopied(asset);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const openFunding = async (asset: "SOL" | "USDC") => {
    setFundingError("");
    setFundingAsset(asset);

    try {
      await fundWallet({
        address,
        options: {
          chain: "solana:mainnet",
          asset: asset === "SOL" ? "native-currency" : "USDC",
          amount: asset === "SOL" ? "0.25" : "25",
          uiConfig: {
            receiveFundsTitle: `Deposit ${asset}`,
            receiveFundsSubtitle:
              asset === "SOL"
                ? "Add SOL for trading and network fees."
                : "Add Solana USDC to use as trading cash.",
          },
        },
      });
      onFundComplete();
    } catch (error) {
      setFundingError(normalizeError(error, `Unable to open ${asset} funding.`));
    } finally {
      setFundingAsset(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl border-border bg-popover p-5">
        <DialogHeader>
          <DialogTitle>Deposit funds</DialogTitle>
          <DialogDescription>
            Add funds through Privy or transfer SOL / Solana USDC directly to this wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <DepositActionButton
            icon={<span className="font-mono text-xs font-bold">SOL</span>}
            title="Deposit SOL"
            detail="Card, exchange, or another Solana wallet"
            loading={fundingAsset === "SOL"}
            onClick={() => openFunding("SOL")}
          />
          <DepositActionButton
            icon={<span className="font-mono text-[10px] font-bold">USDC</span>}
            title="Deposit USDC"
            detail="Add stablecoin trading balance"
            loading={fundingAsset === "USDC"}
            onClick={() => openFunding("USDC")}
          />
        </div>
        <AddressCard
          label="Solana deposit address"
          address={address}
          copied={copied === "address"}
          onCopy={() => copyDepositAddress("address")}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => copyDepositAddress("SOL")}
            className="h-9 rounded-lg border border-border bg-card/40 text-xs font-semibold transition hover:bg-card"
          >
            {copied === "SOL" ? "SOL address copied" : "Copy SOL address"}
          </button>
          <button
            onClick={() => copyDepositAddress("USDC")}
            className="h-9 rounded-lg border border-border bg-card/40 text-xs font-semibold transition hover:bg-card"
          >
            {copied === "USDC" ? "USDC address copied" : "Copy USDC address"}
          </button>
        </div>
        {fundingError && <p className="text-xs text-destructive">{fundingError}</p>}
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  open,
  onOpenChange,
  address,
  balance,
  wallet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  balance: number;
  wallet: ReturnType<typeof useWallets>["wallets"][number] | undefined;
}) {
  const queryClient = useQueryClient();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const rpc = useMemo(() => (hasRpcEndpoint ? createSolanaRpc(env.solanaRpcUrl) : null), []);

  const withdraw = async () => {
    setError("");
    setSignature("");

    try {
      if (!wallet || !rpc) throw new Error("Wallet or Solana RPC is unavailable.");
      const destination = solanaAddress(recipient.trim());
      const source = solanaAddress(address);
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid SOL amount.");
      if (value > Math.max(balance - 0.001, 0)) {
        throw new Error("Leave at least 0.001 SOL for network fees.");
      }

      setSending(true);
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash({ commitment: "confirmed" })
        .send();
      const transactionMessage = pipe(
        createTransactionMessage({ version: "legacy" }),
        (message) => setTransactionMessageFeePayer(source, message),
        (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
        (message) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: createNoopSigner(source),
              destination,
              amount: BigInt(Math.floor(value * 1_000_000_000)),
            }),
            message,
          ),
      );
      const transaction = compileTransaction(transactionMessage);
      const result = await signAndSendTransaction({
        wallet,
        chain: "solana:mainnet",
        transaction: new Uint8Array(getTransactionEncoder().encode(transaction)),
      });
      const txSignature = getBase58Decoder().decode(result.signature);
      setSignature(txSignature);
      setAmount("");
      setRecipient("");
      await queryClient.invalidateQueries({ queryKey: ["token-position", address] });
    } catch (withdrawError) {
      setError(normalizeError(withdrawError, "Unable to send this withdrawal."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl border-border bg-popover p-5">
        <DialogHeader>
          <DialogTitle>Withdraw SOL</DialogTitle>
          <DialogDescription>
            Send SOL from your Privy wallet. Every transfer requires wallet confirmation.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available</span>
            <span className="font-mono">{balance.toFixed(6)} SOL</span>
          </div>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold">
          Destination address
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Solana address"
            className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-xs outline-none focus:border-primary"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold">
          Amount
          <div className="flex h-11 items-center rounded-lg border border-border bg-background px-3 focus-within:border-primary">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent font-mono outline-none"
            />
            <button
              onClick={() => setAmount(String(Math.max(balance - 0.001, 0)))}
              className="text-xs font-semibold text-primary"
            >
              MAX
            </button>
            <span className="ml-2 font-mono text-xs">SOL</span>
          </div>
        </label>
        <button
          onClick={withdraw}
          disabled={sending || !recipient || !amount}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUpFromLine className="h-4 w-4" />
          )}
          Review withdrawal
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {signature && (
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Withdrawal submitted. View on Solscan
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageAccountDialog({
  open,
  onOpenChange,
  email,
  address,
  displayName,
  profileInitial,
  cashBalance,
  portfolioValue,
  solBalance,
  loadingBalances,
  copied,
  onCopy,
  onDeposit,
  onWithdraw,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null;
  address: string;
  displayName: string;
  profileInitial: string;
  cashBalance: number;
  portfolioValue: number;
  solBalance: number;
  loadingBalances: boolean;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const { exportWallet } = useExportWallet();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"swaps" | "buys" | "sells">("swaps");
  const handle = getProfileHandle(displayName, email);
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;
  const cashText = loadingBalances ? "..." : formatUsd(cashBalance);
  const portfolioText = loadingBalances ? "..." : formatUsd(portfolioValue);
  const solText = loadingBalances ? "..." : `${solBalance.toFixed(4)} SOL`;

  const exportKeys = async () => {
    setError("");
    setExporting(true);
    try {
      await exportWallet({ address });
    } catch (exportError) {
      setError(normalizeError(exportError, "Key export is unavailable for this wallet."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-64px)] w-[min(1120px,calc(100vw-32px))] max-w-none overflow-hidden rounded-xl border-[#1b1726] bg-[#08060f] p-0 text-[#f4f1ff] shadow-[0_24px_90px_rgba(0,0,0,0.68)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-[#8f879d] [&>button:hover]:text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{displayName} profile</DialogTitle>
          <DialogDescription>
            Trading profile, wallet balances, and account security.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[650px] grid-cols-[minmax(0,1fr)_300px] overflow-hidden">
          <main className="terminal-scroll min-w-0 overflow-y-auto">
            <div className="relative h-[150px] border-b border-[#1b1726] bg-[#14111b]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(83,95,255,0.28),transparent_26rem),linear-gradient(135deg,#161221,#090712_72%)]" />
              <button
                type="button"
                className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-[#242132] text-[#e8e4f0] transition hover:bg-[#302b42]"
                title="Edit profile banner"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <section className="px-7 pb-6">
              <div className="-mt-12 flex items-end justify-between gap-6">
                <div className="flex min-w-0 items-end gap-5">
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[#08060f] bg-[radial-gradient(circle_at_30%_20%,#6571ff,#19162b_68%)] text-4xl font-black text-white shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                    {profileInitial}
                  </div>
                  <div className="min-w-0 pb-2">
                    <h2 className="truncate text-[24px] font-black leading-none text-white">
                      {displayName}
                    </h2>
                    <div className="mt-1 truncate text-[17px] font-semibold text-[#a9b0d4]">
                      @{handle}
                    </div>
                  </div>
                </div>

                <div className="mb-1 flex shrink-0 items-center gap-3">
                  <ProfileStat value="2" label="Following" />
                  <ProfileStat value="0" label="Followers" />
                  <button className="h-11 rounded-lg border border-[#252137] bg-[#15121d] px-5 text-sm font-black text-white transition hover:bg-[#1f1b2a]">
                    Edit profile
                  </button>
                  <button
                    className="grid h-11 w-12 place-items-center rounded-lg border border-[#252137] bg-[#15121d] text-white transition hover:bg-[#1f1b2a]"
                    title="Rewards"
                  >
                    <Gift className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 border-b border-[#1b1726] pb-5 text-[13px] font-semibold text-[#9099a3]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-[#5c5669]" />
                  No hold time
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Repeat2 className="h-4 w-4 text-[#5c5669]" />0 trades
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-[#5c5669]" />
                  Joined Jun 2026
                </span>
                <button
                  onClick={() => onCopy(address, "address")}
                  className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#717893] transition hover:text-white"
                >
                  {shortAddress}
                  {copied === "address" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="mt-5 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                <section className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[38px] font-black leading-none text-white">
                        {portfolioText}
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-sm font-bold">
                        <span className="text-[#20d772]">+$0</span>
                        <span className="text-[#a9b0d4]">24h</span>
                      </div>
                    </div>
                    <div className="flex rounded-lg border border-[#252137] bg-[#0d0a13] p-1 text-xs font-black">
                      {["24H", "7D", "30D", "ALL"].map((range) => (
                        <button
                          key={range}
                          className={`h-7 rounded-md px-3 ${
                            range === "24H"
                              ? "bg-[#232031] text-white"
                              : "text-[#5c5669] hover:text-white"
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 h-[210px] rounded-lg border border-[#11101a] bg-[#070a0f] p-4">
                    <div className="relative h-full">
                      <div className="absolute left-0 right-0 top-[55%] h-px bg-[#20d772]" />
                      <div className="absolute bottom-0 left-0 right-0 top-[55%] bg-gradient-to-b from-[#20d772]/10 to-transparent" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[#1b1726] bg-[#0d0a13] p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#201d2c] text-2xl font-black text-white">
                        $
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#a9b0d4]">Cash balance</div>
                        <div className="font-mono text-2xl font-black text-white">{cashText}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={onWithdraw}
                        className="h-11 rounded-lg border border-[#252137] bg-[#15121d] px-5 text-sm font-black text-white transition hover:bg-[#1f1b2a]"
                      >
                        Withdraw
                      </button>
                      <button
                        onClick={onDeposit}
                        className="h-11 rounded-lg bg-[#5365ff] px-6 text-sm font-black text-white transition hover:bg-[#6373ff]"
                      >
                        Deposit
                      </button>
                    </div>
                  </div>

                  <section className="mt-4 overflow-hidden rounded-lg border border-[#1b1726] bg-[#0b0912]">
                    <div className="flex h-11 items-center justify-between border-b border-[#1b1726] bg-[#15121d] px-3">
                      <h3 className="text-sm font-black text-white">Your positions</h3>
                      <div className="flex rounded-md border border-[#28243a] bg-[#0c0a13] p-0.5 text-xs font-black">
                        <button className="rounded bg-[#20254f] px-2.5 py-1 text-[#6575ff]">
                          Open
                        </button>
                        <button className="px-2.5 py-1 text-[#5c5669]">Closed</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
                      <span>Token</span>
                      <span className="text-right">Position</span>
                    </div>
                    <div className="grid h-20 place-items-center text-sm font-semibold text-[#5c5669]">
                      No open positions
                    </div>
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
                        onClick={() => setActiveTab(key as typeof activeTab)}
                        className={
                          activeTab === key ? "text-white" : "text-[#5c5669] hover:text-white"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr] border-b border-[#171320] px-4 py-2 text-xs font-semibold text-[#5c5669]">
                    <span>Token</span>
                    <span>Action</span>
                    <span>MCap</span>
                    <span className="text-right">Time</span>
                  </div>
                  <div className="grid h-[445px] place-items-center text-sm font-semibold text-[#5c5669]">
                    No trades yet
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-lg border border-[#1b1726] bg-[#0b0912] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">Wallet security</h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#7a7488]">
                      Verified login and embedded Solana wallet controls.
                    </p>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#7a7488]">{solText}</div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <AccountRow
                    icon={<ShieldCheck className="h-4 w-4 text-[#6575ff]" />}
                    label="Login email"
                    value={email ?? "Connected with wallet"}
                  />
                  <AccountRow
                    icon={<Wallet className="h-4 w-4 text-[#6575ff]" />}
                    label="Solana address"
                    value={address}
                    action={
                      <button
                        onClick={() => onCopy(address, "address")}
                        title="Copy Solana address"
                        className="grid h-8 w-8 place-items-center rounded-md text-[#8f879d] hover:bg-[#1b1726] hover:text-white"
                      >
                        {copied === "address" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                </div>
                <button
                  onClick={exportKeys}
                  disabled={exporting}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#ff3d57]/45 text-sm font-black text-[#ff3d57] transition hover:bg-[#ff3d57]/10 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Export wallet key
                </button>
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              </section>
            </section>
          </main>

          <aside className="terminal-scroll border-l border-[#1b1726] bg-[#08060f] px-6 py-6">
            <div className="mb-5 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#5c5669]" />
              <h3 className="text-lg font-black text-white">Follow top traders</h3>
            </div>
            <div className="space-y-4">
              {profileSuggestions.map((trader) => (
                <ProfileTrader key={trader.handle} trader={trader} />
              ))}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const profileSuggestions = [
  { name: "leo", handle: "@0xleo", color: "#ef5f46" },
  { name: "asta", handle: "@astasol", color: "#d8b8c7" },
  { name: "remus", handle: "@remusofmars", color: "#c48d42" },
  { name: "Dr Gero", handle: "@0xg3ro", color: "#9db4d8" },
  { name: "GCR Junior", handle: "@gcrJR", color: "#4cf57d" },
  { name: "Daumen", handle: "@daumenxyz", color: "#d6ff46" },
  { name: "inyourwalls", handle: "@inyourwalls", color: "#5a9c6f" },
];

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[72px] border-r border-[#1b1726] pr-4 text-center last:border-r-0">
      <div className="font-mono text-lg font-black text-white">{value}</div>
      <div className="text-xs font-semibold text-[#a9b0d4]">{label}</div>
    </div>
  );
}

function ProfileTrader({ trader }: { trader: { name: string; handle: string; color: string } }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black text-white"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${trader.color}, #171421 70%)`,
        }}
      >
        {trader.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-white">{trader.name}</div>
        <div className="truncate text-xs font-semibold text-[#a9b0d4]">{trader.handle}</div>
      </div>
      <button className="h-9 rounded-lg bg-[#5365ff] px-4 text-xs font-black text-white transition hover:bg-[#6373ff]">
        Follow
      </button>
    </div>
  );
}

function AccountRow({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">{label}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{value}</div>
      </div>
      {action}
    </div>
  );
}

function DepositActionButton({
  icon,
  title,
  detail,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-left transition hover:border-primary/40 hover:bg-card"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function AddressCard({
  label,
  address,
  copied,
  onCopy,
}: {
  label: string;
  address: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs font-semibold">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {address}
        </span>
        <button
          onClick={onCopy}
          title="Copy deposit address"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
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
    // Some browser contexts expose clipboard but still block writes.
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

function normalizeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
