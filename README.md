# ChadWallet

**Social Solana wallet and trading terminal built for fast-moving token markets.**

ChadWallet is a production-style take-home build inspired by the energy of
fomo.family: a cinematic landing page, live rotating token rails, Privy wallet
authentication, real Solana market data, and a bonus trading interface with
quotes, receipts, charts, holders, trades, and portfolio controls.

Live preview: **https://chad-solana-swap.vercel.app**

<p align="center">
  <video src="public/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm" autoplay muted loop playsinline width="720"></video>
</p>

If the video does not render in your Markdown viewer, open it directly:
[transparent ChadWallet motion asset](public/assets/video/MAKE_VIDEO_NOT_IMAGE-Picsart-BackgroundRemover.webm).

## Why It Stands Out

- **Feels like a real consumer crypto product**: cinematic ChadWallet landing page, responsive app-store CTAs, profile-style wallet controls, and scroll-depth motion.
- **Real market surface**: token rails and trading pages are backed by BirdEye, GeckoTerminal/DexScreener-style fallbacks, Solana RPC, and Jupiter quote routes.
- **Trade-ready architecture**: Jupiter quote, order, Privy wallet signing, execution handoff, Solana confirmation polling, and downloadable JSON trade receipts.
- **Edge-aware data path**: Cloudflare Worker proxies read-only market APIs with cache headers while trading actions stay on the Vercel origin.
- **Submission-focused polish**: Next.js App Router, Tailwind, Supabase persistence, Vercel production deployment, and a clean npm workflow.

## Feature Matrix

| Requirement                                              | Status                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| ChadWallet branded landing page                          | Complete                                                           |
| Mobile app links                                         | Complete                                                           |
| Privy Google sign-in                                     | Complete                                                           |
| Privy wallet sign-in and embedded Solana wallet          | Complete                                                           |
| Apple sign-in                                            | Apple-ready in UI, requires paid Apple Developer OAuth credentials |
| Solana support                                           | Complete                                                           |
| Rotating top and bottom token banners                    | Complete                                                           |
| Token banner opens trading page                          | Complete                                                           |
| Trading UI left panel: tokens/trending                   | Complete                                                           |
| Trading UI middle panel: token info/chart/holders/trades | Complete                                                           |
| Trading UI right panel: buy/sell/position                | Complete                                                           |
| BirdEye market data                                      | Complete, with fallbacks                                           |
| Alchemy/Solana RPC                                       | Complete                                                           |
| Jupiter quotes and execution flow                        | Complete                                                           |
| Supabase trade intent persistence                        | Complete                                                           |
| Cloudflare Worker                                        | Complete                                                           |
| Vercel production deployment                             | Complete                                                           |

## Product Surface

### Landing

The landing page uses ChadWallet branding, the supplied app links, rotating token
banners, scroll-driven depth, and motion assets to sell the core idea quickly:
trade Solana launches from a wallet experience that feels social, fast, and alive.

### Trading Terminal

The `/trade/[mint]` screen is split into three professional trading zones:

- **Left**: scrollable live token list with filters and direct token navigation.
- **Middle**: token identity, market stats, live chart, holder data, and trades.
- **Right**: buy/sell quote panel, slippage controls, route metadata, position card,
  deposit modal, profile menu, and account management.

### Account And Wallet

Privy powers authentication and embedded wallet controls. After login, the app
shows a profile-style wallet pill, account menu, deposit entry points, wallet
address copy actions, and export/profile actions where supported by Privy.

## Data And Execution

ChadWallet is not a static mock. It uses real APIs wherever practical:

- **BirdEye** for token metadata, trending feeds, prices, stats, and OHLCV data.
- **GeckoTerminal / market fallbacks** when a BirdEye endpoint cannot return a token.
- **Alchemy Solana RPC** for chain health, slots, and signature status proof.
- **Jupiter** for quotes, routes, swap order construction, and execution handoff.
- **Supabase** for storing trade intents and demo activity.
- **Cloudflare Workers** for cached read-only market API traffic.

Every submitted Jupiter execution is followed by Solana RPC confirmation polling.
The app stores recent receipts locally and can export a JSON proof containing the
signature, slot, route, wallet, amounts, mint, timestamp, and Solscan link.

## Architecture

```text
Browser
  -> Next.js App Router UI
  -> Privy auth + embedded Solana wallet
  -> Cloudflare Worker for GET /api/market/*
  -> Vercel API routes for private/trade actions
  -> BirdEye / GeckoTerminal / Alchemy / Jupiter / Supabase
```

Read-only market traffic can be routed through Cloudflare by setting
`NEXT_PUBLIC_EDGE_API_URL`. Trade order, signing, execution, and receipt checks
remain on the Vercel origin so they are never cached at the edge.

## Tech Stack

- **Next.js 16** App Router
- **React 19**
- **Tailwind CSS 4**
- **Privy** authentication and embedded wallet infrastructure
- **Solana / Alchemy RPC**
- **BirdEye Data API**
- **Jupiter Swap API**
- **TradingView Lightweight Charts** plus TradingView widget mode for supported assets
- **Supabase**
- **Cloudflare Workers**
- **Vercel**

## Environment

Copy `.env.example` to `.env.local` and fill the keys for the services you want
enabled locally.

```bash
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_PRIVY_CLIENT_ID=
NEXT_PUBLIC_BIRDEYE_API_KEY=
NEXT_PUBLIC_JUPITER_API_KEY=
NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_EDGE_API_URL=
```

Server-side/private keys are also supported for production API routes:

```bash
PRIVY_APP_SECRET=
PRIVY_JWKS_ENDPOINT=
BIRDEYE_API_KEY=
JUPITER_API_KEY=
SOLANA_RPC_URL=
SOLANA_DEVNET_RPC_URL=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase

Run the SQL migration in the Supabase SQL editor:

```bash
supabase/trade_intents.sql
```

This enables demo trade-intent persistence for captured quote and swap activity.

## Cloudflare

The Worker in `cloudflare/worker.js` proxies only read-only market requests:

```bash
npm run cloudflare:dev
npm run cloudflare:deploy
```

After deployment, set the Worker URL in Vercel:

```bash
NEXT_PUBLIC_EDGE_API_URL=https://your-worker.workers.dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

Both commands should pass before deployment.

## Production Notes

- Google login and wallet login are active through Privy.
- Apple login requires Apple Developer credentials before it can be considered production complete.
- Live swaps require a funded wallet and user approval in Privy.
- The chart uses TradingView Lightweight Charts for arbitrary Solana tokens and an official TradingView widget mode for supported exchange-listed assets. The private self-hosted TradingView Charting Library can be swapped in after TradingView grants access.

## Submission

This build is ready to review as a live product demo:

**https://chad-solana-swap.vercel.app**

It demonstrates the minimum landing page requirement and the bonus trading page
with real integrations, real data paths, and production deployment infrastructure.
