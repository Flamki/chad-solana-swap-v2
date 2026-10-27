# soll

A Solana trading interface with market data, wallet sign-in, and Jupiter-based swap routing. The web app is available at [trysoll.vercel.app](https://trysoll.vercel.app). Mobile apps are not available yet.

## Current status

- Early-stage web product. The founder has reported performing a trade; independent end-to-end production verification and user traction have not yet been documented here.
- Email, Twitter, and wallet sign-in are configured through Privy. Google is currently hidden from the sign-in screen.
- The trading interface includes token discovery, charts, wallet balances, quotes, and a Jupiter transaction flow. Availability depends on provider configuration and market conditions.
- Screenshots and illustrations on the landing page are previews; they should not be read as verified live prices or user activity.

## Architecture

```text
Browser
  |-- Next.js App Router UI
  |-- Privy authentication + embedded Solana wallet
  |-- Cloudflare Worker (optional cached GET /api/market/* edge)
  `-- Vercel API routes
      |-- BirdEye / Jupiter / GeckoTerminal / DexScreener
      |-- Alchemy Solana RPC
      |-- Jupiter order and execution APIs
      `-- Supabase trade-intent persistence
```

Market endpoints return an explicit `live`, `cached`, or `unavailable` state.
The UI does not fabricate candles when a provider cannot supply real data.

## Technology

- Next.js 16 App Router and React 19
- Tailwind CSS 4
- Privy
- Solana Kit and Alchemy RPC
- BirdEye Data API
- Jupiter Tokens and Swap APIs
- GeckoTerminal and DexScreener fallbacks
- TradingView Lightweight Charts
- Supabase
- Cloudflare Workers
- Vercel

## Local Development

Requirements:

- Node.js 24
- npm 10 or newer

```bash
git clone https://github.com/Flamki/chad-solana-swap-v2.git
cd chad-solana-swap-v2
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

The application degrades gracefully when optional providers are not configured.
Use `.env.example` as the source of truth.

```bash
# Public browser configuration
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_PRIVY_CLIENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_EDGE_API_URL=

# Optional browser fallbacks used by local demos
NEXT_PUBLIC_BIRDEYE_API_KEY=
NEXT_PUBLIC_JUPITER_API_KEY=
NEXT_PUBLIC_ALCHEMY_SOLANA_RPC_URL=
NEXT_PUBLIC_SOLANA_RPC_URL=

# Server-only provider credentials
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

Do not expose server-only credentials through `NEXT_PUBLIC_*` variables in a
real production deployment.

## Database

Apply the Supabase migration through the SQL editor or CLI:

```text
supabase/migrations/20260623000100_create_trade_intents.sql
supabase/migrations/20260623000200_allow_demo_trade_intent_inserts.sql
```

## Cloudflare Worker

The worker only proxies read-only `/api/market/*` requests. Trading, signing, and
account actions remain on the Vercel origin and are never edge-cached.

```bash
npm run cloudflare:dev
npm run cloudflare:deploy
```

Set `NEXT_PUBLIC_EDGE_API_URL` to the deployed worker URL when edge routing is
desired.

## Quality Gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Run all checks together with:

```bash
npm run check
```

## Production Notes

- Live swaps require a funded wallet and explicit user approval.
- Mainnet activity should always be tested with small values first.
- Apple sign-in requires Apple Developer credentials before it can be enabled.
- Arbitrary Solana tokens use TradingView Lightweight Charts with live provider
  data. The licensed self-hosted TradingView Charting Library can be integrated
  after access is granted.

## Repository

- Production: <https://trysoll.vercel.app>
- Repository: <https://github.com/Flamki/chad-solana-swap-v2>
