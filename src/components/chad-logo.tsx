export function ChadLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-display font-bold ${className}`}>
      <div className="relative h-8 w-8 rounded-lg bg-cosmic glow-purple grid place-items-center overflow-hidden">
        <span className="text-gradient-chad text-lg font-extrabold leading-none">C</span>
        <div className="absolute inset-0 ring-1 ring-primary/30 rounded-lg" />
      </div>
      <span className="text-lg tracking-tight">
        Chad<span className="text-gradient-chad">Wallet</span>
      </span>
    </div>
  );
}