import { BRAND } from "@/lib/brand";

export function BrandName({
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
  const titleSize = size === "lg" ? "text-[32px]" : size === "sm" ? "text-2xl" : "text-[28px]";
  return (
    <div
      className={`flex flex-col leading-none ${variant === "light" ? "text-black" : ""} ${className}`}
    >
      <span className={`font-display font-bold tracking-[-0.025em] ${titleSize}`}>
        {BRAND.name}
      </span>
      {showTagline && (
        <span className="mt-1.5 text-[9px] tracking-widest text-muted-foreground">
          TRADE SOLANA
        </span>
      )}
    </div>
  );
}
