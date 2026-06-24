# ChadWallet Take-Home

Fomo-style ChadWallet landing page plus Solana trading page.

Live preview: https://chad-solana-swap.vercel.app

## What is wired

- ChadWallet brand assets and mobile app badges
- Privy auth entry with Apple, Google, and Solana wallet support
- Rotating token banners at the top and bottom; every token opens `/trade/:mint`
- Trading UI with trending tokens, token stats, TradingView Lightweight Charts, official TradingView Advanced Chart mode, holders, live trades, and buy/sell execution
- Jupiter v2 quote, order, wallet signing, execution, Solana confirmation checking, and downloadable transaction receipts
- BirdEye market data with GeckoTerminal and Solana RPC fallbacks
- Alchemy/Solana RPC health check in the trading header
- Supabase persistence for captured trade intents
- Cloudflare Worker edge gateway for cached read-only market data
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
NEXT_PUBLIC_EDGE_API_URL=
```

Without keys, the app still runs with curated Solana tokens and Jupiter lite quote attempts.

## Supabase

Run `supabase/trade_intents.sql` in the Supabase SQL editor to enable demo trade-intent persistence.

## Cloudflare

The Worker in `cloudflare/worker.js` proxies only `GET /api/market/*` requests, adds
Cloudflare edge/cache headers, and applies short endpoint-specific cache windows.

```bash
npm run cloudflare:dev
npm run cloudflare:deploy
```

After deployment, set `NEXT_PUBLIC_EDGE_API_URL` to the Worker URL in Vercel. Trade order,
signing, and execution requests intentionally remain on the uncached Vercel origin.

## TradingView

The default chart uses TradingView Lightweight Charts with BirdEye/GeckoTerminal candles so
arbitrary Solana token addresses continue to work. Supported exchange-listed assets also expose
the official TradingView Advanced Chart widget. TradingView's self-hosted Advanced Charts library
can replace the widget after TradingView grants access to its private repository.

## Mainnet proof

Every successful Jupiter execution is checked against Solana RPC. The app stores the latest
receipts in the browser, links to Solscan, and exports a JSON receipt containing the signature,
slot, route, wallet, amounts, and timestamp.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run cloudflare:dev
npm run cloudflare:deploy
```
