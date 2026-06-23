import { cn } from "@/lib/utils";

interface StoreBadgeProps {
  className?: string;
  variant?: "dark" | "light";
  href?: string;
  target?: string;
  rel?: string;
}

function AppStoreLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayStoreLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.609 1.814L13.792 12 3.61 22.186c-.175-.1-.318-.293-.318-.52V2.334c0-.227.143-.42.318-.52zm10.89 10.893l4.103-4.102L6.975 1.058l7.524 11.649zm5.091 1.243l-4.603 4.603 5.126 3.006c.38.222.865-.04.865-.51V13.06c0-.45-.45-.71-.848-.51l-.54.317zm-4.603 4.603l-6.86 4.024L17.017 12l-7.92-7.573 6.89 4.043 4.606 4.606-.005.005-.005.005z" />
    </svg>
  );
}

function Badge({
  icon,
  top,
  bottom,
  variant,
  href,
  target,
  rel,
  className,
}: {
  icon: React.ReactNode;
  top: string;
  bottom: string;
  variant?: "dark" | "light";
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 transition hover:opacity-90";
  const theme =
    variant === "light"
      ? "bg-white text-black border-black/10"
      : "bg-black text-white border-white/20";

  const content = (
    <>
      {icon}
      <div className="text-left leading-tight">
        <div className="text-[10px] opacity-80">{top}</div>
        <div className="text-[15px] font-semibold tracking-tight">{bottom}</div>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={cn(base, theme, className)}>
        {content}
      </a>
    );
  }

  return <div className={cn(base, theme, className)}>{content}</div>;
}

export function AppStoreBadge({ className = "", variant = "dark", href, target, rel }: StoreBadgeProps) {
  return (
    <Badge
      icon={<AppStoreLogo className="h-7 w-7" />}
      top="Download on the"
      bottom="App Store"
      variant={variant}
      href={href}
      target={target}
      rel={rel}
      className={className}
    />
  );
}

export function PlayStoreBadge({ className = "", variant = "dark", href, target, rel }: StoreBadgeProps) {
  return (
    <Badge
      icon={<PlayStoreLogo className="h-7 w-7" />}
      top="Get it on"
      bottom="Google Play"
      variant={variant}
      href={href}
      target={target}
      rel={rel}
      className={className}
    />
  );
}
