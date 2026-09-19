# E-Commerce Premium

Independent multi-tenant commerce infrastructure. This is a SaaS/store-builder architecture, not a shared marketplace.

## Current foundation
- Next.js 16.3.5 + React 19.2
- Node.js 22+
- Supabase SSR Auth with cookie-based sessions
- Email/password sign-in, sign-up and password recovery
- Google + Facebook OAuth callback flow
- One account can manage multiple independent stores
- Tenant ownership separated from public storefront rows
- Owner membership binding for new stores
- Store creation with URL slug, currency, language, country and timezone
- Seller dashboard connected to Supabase
- Product create/edit/delete workspace with tenant-scoped RLS
- Public storefront and catalog
- Product pages with canonical share URLs
- Open Graph, Twitter metadata and Product JSON-LD
- Dynamic sitemap, robots policy and site-level OG image
- Responsive cinematic UI from small mobile to 4K
- prefers-reduced-motion support
- Supabase security advisor currently reports zero security lints for the dedicated project

## Tenant URL model

Free Vercel deployment example:

    https://rahim.ecommerce-premium.vercel.app/

Product:

    https://rahim.ecommerce-premium.vercel.app/products/phone-15

Internal route:

    /store/rahim/products/phone-15

The request proxy resolves a store subdomain to the internal tenant route. Custom domains can later map to the same store and product identity without changing database ownership.

## Authentication

The application includes:
- Email/password sign-in
- Email/password sign-up
- Remember-email convenience; the password is never stored in browser storage
- Password reset and password update
- Google OAuth
- Facebook OAuth
- SSR cookie session handling
- Safe callback next-path validation

OAuth providers still require their application credentials and authorized redirect settings to be configured in the dedicated Supabase Auth dashboard before those buttons can complete a real provider login.

Use this callback pattern:

    https://<your-production-host>/auth/callback

Password recovery:

    https://<your-production-host>/auth/update-password

## Supabase

Dedicated backend ref: khcnitnobhbabippkblr
Region: ap-northeast-1
PostgreSQL: 17

Core public tables:
- profiles
- stores
- store_owners
- store_members
- products

All public data tables have RLS enabled. Public storefront reads are limited to active stores/products. Seller ownership is held separately in store_owners, keeping auth user identifiers out of anonymous storefront rows.

Never commit .env.local, service-role keys, database passwords, OAuth client secrets, or other secrets.

## Environment

Copy .env.example to your local environment and set:

    NEXT_PUBLIC_SITE_NAME=E-Commerce Premium
    NEXT_PUBLIC_SITE_URL=https://ecommerce-premium.vercel.app
    NEXT_PUBLIC_PLATFORM_DOMAIN=ecommerce-premium.vercel.app
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

Keep the platform domain configurable so custom domains can be added later.

## Product sharing

Each product has a canonical URL based on its store hostname:

    https://<store>.<platform-domain>/products/<product-slug>

The product page emits canonical metadata, Open Graph/Twitter cards, price/availability metadata and Schema.org Product JSON-LD. The Share action prefers the browser native share sheet and falls back to copying the canonical URL.

The first version keeps heavy 3D/AI processing outside normal Next.js requests. A future Python worker can consume uploaded product media, create optimized GLB/GLTF assets and return web/mobile models asynchronously.

## Development

    npm install
    npm run dev
    npm run build

The GitHub Actions workflow uses Node 22 and runs the production build.

## Architecture direction

Store Builder · Variants · Checkout · Orders · Customers · Marketing · Analytics · AI · 3D · Custom Domains · PWA · Notifications · Chat · Reviews · Loyalty · API/Webhooks · Import/Export · Documents · Finance · Automation · SEO · Media · A/B Testing · Support · Accessibility · Performance · Admin · Backup/Recovery · Events · Feature Flags
