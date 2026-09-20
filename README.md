# E-Commerce Premium

Independent multi-tenant commerce SaaS/store builder. It is not a shared marketplace: each seller has an isolated storefront, catalog, cart and order space.

## Runtime
- Next.js 16.3.5
- React 19.2
- Node.js 22.23.2 LTS, pinned by .nvmrc and CI
- Supabase SSR + PostgreSQL
- TypeScript + App Router + Vercel

There is no supported "Next.js 22" major in the current Next.js release line. Node.js 22 is the runtime; Next.js 16 is the framework.

## Foundation
Store subdomain/custom-domain routing, seller dashboard, catalog, variants, media, checkout/order transaction foundation, customers, coupons, teams/RBAC, analytics, notifications, API keys, webhooks, store settings, platform admin feature flags, PWA/offline fallback, rate-limited commerce APIs, payment/shipping/localization/risk abstractions, loyalty/marketing/support/A-B/automation database foundations, AI/3D provider interfaces, and production error boundaries.

## Deployment
Vercel stays on the Git integration. vercel.json uses an ignore command so documentation-only changes do not create unnecessary builds. CI uses one Node 22 job with concurrency cancellation. Avoid repeated force redeploys while debugging.

## Configuration
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_PLATFORM_DOMAIN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
PLATFORM_FEE_BPS or PLATFORM_TRANSACTION_FEE
COMMERCE_AI_PROVIDER
THREED_WORKER_URL

Never commit service-role keys, Supabase secret keys, OAuth secrets or payment provider secrets.

## External integrations
Cash on delivery is modeled as the first payment provider. Online gateways, real AI generation, Python 3D reconstruction, AR, courier integrations and chat require external credentials/worker infrastructure; interfaces and database boundaries are prepared so those integrations do not require a rewrite.
