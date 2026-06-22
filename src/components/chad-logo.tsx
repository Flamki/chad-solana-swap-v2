import darkLogo from "@/assets/logo/dark.png";
import lightLogo from "@/assets/logo/light.png";

export function ChadLogo({
  className = "",
  variant = "dark",
  size = "md",
}: {
  className?: string;
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}) {
  const logo = variant === "light" ? lightLogo : darkLogo;
  const imgSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logo}
        alt="ChadWallet"
        className={`${imgSize} rounded-xl object-contain shadow-sm`}
      />
      <span className={`font-display font-semibold ${textSize} tracking-tight`}>
        chadwallet
      </span>
    </div>
  );
}
