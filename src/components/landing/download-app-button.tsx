"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Smartphone } from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BRAND } from "@/lib/brand";

type AppPlatform = "ios" | "android" | "all";

const PLATFORM_COPY = {
  ios: { title: `${BRAND.name} for iPhone`, label: "APP STORE" },
  android: { title: `${BRAND.name} for Android`, label: "GOOGLE PLAY" },
  all: { title: `${BRAND.name} on mobile`, label: "MOBILE APP" },
};

function PlatformIcon({ platform }: { platform: AppPlatform }) {
  if (platform === "android") {
    return (
      <Image
        src="/assets/icons/google-play.png"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />
    );
  }
  if (platform === "ios") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  return <Smartphone className="h-7 w-7" strokeWidth={1.5} />;
}

export function AppComingSoonButton({
  platform = "all",
  children,
  className,
  label,
}: {
  platform?: AppPlatform;
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  const copy = PLATFORM_COPY[platform];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className} aria-label={label}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        overlayClassName="z-[90] bg-black/20"
        className="soll-glass-modal z-[100] w-[calc(100%-2rem)] max-w-[440px] overflow-hidden rounded-[28px] p-0 text-white sm:rounded-[28px] [&>button]:right-5 [&>button]:top-5 [&>button]:text-white/70"
      >
        <div className="relative p-7 pt-8 sm:p-9">
          <div className="flex items-center gap-3.5">
            <div className="soll-glass-platform grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white">
              <PlatformIcon platform={platform} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/55">{copy.label}</p>
              <p className="mt-1.5 text-sm font-medium text-white/90">{copy.title}</p>
            </div>
          </div>

          <DialogTitle className="mt-8 text-[32px] font-semibold leading-[1.05] tracking-tight">
            Coming soon.
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-[330px] text-sm leading-relaxed text-white/70">
            {copy.title} is in the works. For now, you can trade on the web.
          </DialogDescription>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <DialogClose asChild>
              <button
                type="button"
                className="soll-glass-action min-h-11 flex-1 rounded-xl px-5 text-sm font-semibold text-white"
              >
                Got it
              </button>
            </DialogClose>
            <DialogClose asChild>
              <Link
                href={BRAND.tradeHref}
                className="soll-glass-action hidden min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-white/90 md:flex"
              >
                Trade on web <ArrowUpRight className="h-4 w-4" />
              </Link>
            </DialogClose>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-white/45">
            The web terminal is available on desktop.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DownloadAppButton() {
  return (
    <AppComingSoonButton className="soll-glass-button cursor-pointer rounded-full px-7 py-2.5 text-sm font-semibold text-white">
      Get the app
    </AppComingSoonButton>
  );
}
