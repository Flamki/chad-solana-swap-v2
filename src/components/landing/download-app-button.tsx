"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const QR_CODE = "/assets/landing/qr-rounded.svg";

function DownloadModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Download app"
    >
      <div
        className="relative w-full max-w-[340px] rounded-3xl bg-[#0b0b0f] p-6 text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.08]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 text-white/50 transition hover:text-white"
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/[0.12]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="text-sm font-semibold text-white">Download app</span>
        </div>

        <Image
          src={QR_CODE}
          alt="QR code to download ChadWallet"
          width={260}
          height={260}
          unoptimized
          className="mx-auto mb-5 h-auto w-full max-w-[260px]"
        />
        <p className="text-sm leading-relaxed text-white/60">
          Scan the QR code to download the app on your phone.
        </p>
      </div>
    </div>
  );
}

export function DownloadAppButton() {
  const [showQr, setShowQr] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowQr(true)}
        className="cursor-pointer rounded-full bg-white/[0.03] px-7 py-2.5 text-sm font-semibold ring-1 ring-white/[0.12] backdrop-blur transition hover:bg-white/[0.07]"
      >
        Get the app
      </button>
      {showQr && <DownloadModal onClose={() => setShowQr(false)} />}
    </>
  );
}
