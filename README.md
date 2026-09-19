# E-Commerce Premium

Independent multi-tenant commerce infrastructure. This is a SaaS/store-builder architecture, not a shared marketplace.

## Current foundation
- Next.js 16.3.5 + React 19.2
- Node.js 22+
- Supabase SSR client utilities with cookie-based sessions
- Tenant-aware subdomain routing foundation
- No marketplace or mixed-seller checkout

## Tenant model
- Platform: `ecommercepremium.com`
- Store: `{store-slug}.ecommercepremium.com`
- Future custom domains map to a store without weakening tenant isolation.

## Supabase connection
Set these values in Vercel and local development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never commit `.env.local`, service-role keys, database passwords, or other secrets.

## Run
```bash
npm install
npm run dev
npm run build
```
