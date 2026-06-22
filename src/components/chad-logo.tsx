import darkLogo from "@/assets/logo/dark.png";
import lightLogo from "@/assets/logo/light.png";

export function ChadLogo({
  className = "",
  variant = "dark",
  size = "md",
  showTagline = true,
}: {
  className?: string;
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const logo = variant === "light" ? lightLogo : darkLogo;
  const imgSize = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const titleSize = size === "lg" ? "text-[26px]" : size === "sm" ? "text-lg" : "text-[22px]";
  const taglineSize = size === "lg" ? "text-[10px]" : size === "sm" ? "text-[8px]" : "text-[9px]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logo}
        alt="ChadWallet"
        className={`${imgSize} rounded-2xl object-contain shadow-sm`}
      />
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold ${titleSize} tracking-tight`}>
          ChadWallet
        </span>
        {showTagline && (
          <span className={`font-mono uppercase tracking-[0.22em] text-muted-foreground ${taglineSize} mt-1`}>
            Social Solana Wallet
          </span>
        )}
      </div>
    </div>
  );
}
