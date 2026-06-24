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
  Check,
  ChevronDown,
  Copy,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
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
  const portfolioValue = cashBalance + (sol.data?.valueUsd ?? 0);
  const loadingBalances = sol.isFetching || usdc.isFetching;
  const displayMoney = (value: number) =>
    blurBalances ? "••••" : loadingBalances ? "..." : formatUsd(value);
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
          className="min-w-[108px] rounded-lg border border-border bg-card/60 px-3 py-1.5 text-left transition hover:bg-card"
        >
          <div className="font-mono text-xs font-semibold">{displayMoney(cashBalance)} cash</div>
          <div className="text-[10px] font-semibold text-primary">Deposit more</div>
        </button>
        <div className="min-w-[90px] rounded-lg border border-border bg-card/60 px-3 py-1.5">
          <div className="font-mono text-xs font-semibold">{displayMoney(portfolioValue)}</div>
          <div className="text-[10px] text-muted-foreground">Portfolio</div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-11 min-w-0 max-w-[190px] items-center gap-2.5 rounded-full border border-border bg-card/70 py-1.5 pl-1.5 pr-3 shadow-lg shadow-black/15 backdrop-blur transition hover:border-primary/30 hover:bg-card"
            aria-label="Open account menu"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_0_18px_rgba(20,241,149,0.22)]">
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
        copied={copied}
        onCopy={(value, key) => copyText(value, key)}
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
  copied,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null;
  address: string;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const { exportWallet } = useExportWallet();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

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
      <DialogContent className="max-w-xl rounded-xl border-border bg-popover p-5">
        <DialogHeader className="text-center">
          <DialogTitle>Manage account</DialogTitle>
          <DialogDescription>Verified login and wallet security settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <AccountRow
            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            label="Login email"
            value={email ?? "Connected with wallet"}
          />
          <AccountRow
            icon={<Wallet className="h-4 w-4 text-primary" />}
            label="Solana address"
            value={address}
            action={
              <button
                onClick={() => onCopy(address, "address")}
                title="Copy Solana address"
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
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
        <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
          Your private key is displayed only inside Privy&apos;s isolated security window.
          ChadWallet cannot read or store it.
        </div>
        <button
          onClick={exportKeys}
          disabled={exporting}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-destructive/40 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Export wallet key
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
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
