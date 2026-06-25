"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Is ChadWallet self-custody?",
    a: "Yes. Keys are generated and stored client-side through Privy.",
  },
  {
    q: "Which chain does it support?",
    a: "Solana first, with the trading experience tuned for Solana tokens.",
  },
  {
    q: "Do I need a seed phrase?",
    a: "No. Sign in with email or socials and your wallet is secured under the hood.",
  },
  {
    q: "Does the trading page use real data?",
    a: "Yes. BirdEye, Alchemy, Jupiter, Supabase, and live chart data power the core flow.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="landing-deferred relative border-t border-white/5 px-6 py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 font-mono text-xs font-bold tracking-[0.3em] text-indigo-400">FAQ</p>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          questions, briefly.
        </h2>
        <div className="mt-12 text-left">
          {FAQS.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q} className="border-t border-white/10 last:border-b">
                <button
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="group flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-base font-semibold text-white sm:text-lg">{faq.q}</span>
                  <span
                    className={`text-xl text-indigo-400 transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-6 text-sm leading-relaxed text-white/60 sm:text-base">{faq.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
