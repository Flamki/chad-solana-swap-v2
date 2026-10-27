"use client";

import Image from "next/image";
import { AppComingSoonButton } from "@/components/landing/download-app-button";

export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Image
        src="/assets/landing/store-badges-v3-cropped.png"
        alt="App Store and Google Play"
        width={1482}
        height={264}
        sizes="296px"
        className="h-14 w-auto object-contain"
      />
      <AppComingSoonButton
        platform="ios"
        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
        label="Download on the App Store"
      />
      <AppComingSoonButton
        platform="android"
        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
        label="Get it on Google Play"
      />
    </div>
  );
}
