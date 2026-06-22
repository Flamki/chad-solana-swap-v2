import logo from "@/assets/logo/dark.png";

export function ChadLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="ChadWallet" className="h-7 w-7 rounded-md" />
      <span className="font-display font-semibold text-xl tracking-tight">chad</span>
    </div>
  );
}