# ChadWallet - Product & Engineering One-Pager

**Live product:** https://chad-solana-swap-v2.vercel.app  
**GitHub:** https://github.com/Flamki/chad-solana-swap-v2

## Product and design

ChadWallet is a production-oriented Solana trading experience built as a high-fidelity response to the fomo.family brief. It combines a cinematic, responsive landing page with a real trading workspace: live token discovery, universal search, market data, candlestick charts, holders and trades, wallet controls, deposits, positions, and Jupiter-powered swap routing.

The landing experience was rebuilt twice during the three-day sprint. The second rebuild replaced the original direction with a more distinctive ChadWallet visual system, improved motion and depth, optimized media, real-time token rails, and tighter mobile and desktop behavior.

**Core stack:** Next.js 16, React 19, Tailwind CSS, Privy, Solana, Alchemy RPC, Jupiter, BirdEye, GeckoTerminal, Supabase, Cloudflare Workers, TradingView Lightweight Charts, and Vercel.

## AI tools used

- **Codex:** codebase analysis, Next.js architecture, frontend implementation, API integration, debugging, performance work, testing, Git operations, and deployment.
- **ChatGPT + Gemini:** visual ideation, asset generation, background removal, image manipulation, and exploration of landing-page composition.

## Three-day timeline

| Task                                                                     |    Time |
| ------------------------------------------------------------------------ | ------: |
| Next.js foundation, project structure, and deployment setup              | 3 hours |
| Landing page v1, branding, responsive layout, and token rails            | 5 hours |
| Trading workspace, charts, market activity, and responsive panels        | 6 hours |
| Authentication, embedded Solana wallet, account, deposit, and swap flows | 4 hours |
| Real market data, universal token search, and chart reliability          | 4 hours |
| Landing page v2 high-fidelity rebuild, motion, and asset refinement      | 4 hours |
| Performance optimization, QA, Cloudflare, Vercel, and documentation      | 3 hours |

**Total:** approximately 29 focused hours across three days.

## Issues and fixes

- **BirdEye endpoints could be unavailable, rate-limited, or sparse for newer tokens.** Added Jupiter token data and GeckoTerminal/DexScreener fallbacks, server-side caching, retries, and explicit unavailable states instead of fabricated market data.
- **The first search implementation only covered a curated token list.** Rebuilt search around Jupiter's live token universe, mint-address lookup, first-character queries, debouncing, and same-origin server routes.
- **Charts failed for tokens whose best pool orientation or address was not obvious.** Added canonical pool discovery, support for base/quote orientation, cached pool resolution, and retry handling for provider throttling.
- **Large visual assets and authentication code slowed initial rendering.** Moved the landing shell server-side, lazy-loaded Privy, optimized images and video delivery, and reduced unnecessary client hydration.
- **The desktop trading workspace needed independent navigation without losing context.** Implemented stable three-column geometry, dedicated scroll regions, persistent controls, and responsive behavior.

## How the project can improve

- Complete repeated funded-mainnet swap tests and add automated transaction receipt verification.
- Add WebSocket streaming, deeper indexed holder analytics, alerting, and provider-health monitoring.
- Integrate the licensed TradingView Charting Library when access is granted.
- Expand end-to-end tests across authentication, deposits, swaps, mobile breakpoints, and provider failures.
- Add production security hardening, key rotation, observability, and audited transaction policies.
- Add Apple sign-in after Apple Developer credentials are available.

---

GitHub collaborator invitation sent to the account associated with `pengcheng.chen@gmail.com`.
