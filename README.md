# ChadWallet Take-Home

Fomo-style ChadWallet landing page plus Solana trading page.

Live preview: https://chad-solana-swap.vercel.app

## What is wired

- ChadWallet brand assets and mobile app badges
- Privy auth entry with Apple, Google, and Solana wallet support
- Rotating token banners at the top and bottom; every token opens `/trade/:mint`
- Trading UI with trending tokens, token stats, TradingView Lightweight Charts, holders, live trades, and buy/sell quote panel
- Jupiter quote routing with free lite fallback and optional API-key v2 order path
- BirdEye trending token feed when `NEXT_PUBLIC_BIRDEYE_API_KEY` is set
- Alchemy/Solana RPC health check in the trading header
- Optional Supabase insert path for captured trade intents
- Next.js App Router build with Tailwind, ready for Vercel deployment

## Environment

Copy `.env.example` to `.env.local` and fill the keys you have.

```bash
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_BIRDEYE_API_KEY=
NEXT_PUBLIC_JUPITER_API_KEY=
NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Without keys, the app still runs with curated Solana tokens and Jupiter lite quote attempts.

## Supabase

Run `supabase/trade_intents.sql` in the Supabase SQL editor to enable demo trade-intent persistence.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
