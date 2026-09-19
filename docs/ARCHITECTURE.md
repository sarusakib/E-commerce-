# E-Commerce Premium Architecture

## Product boundary

E-Commerce Premium is an independent multi-tenant store builder. It is not a central marketplace and checkout/order data must never mix sellers.

## Request flow

Browser
→ Next.js App Router
→ request proxy / session refresh
→ tenant host resolution
→ store route
→ Supabase RLS
→ store-scoped data

Platform host:
`ecommerce-premium.vercel.app`

Store host:
`<store-slug>.ecommerce-premium.vercel.app`

Product host path:
`<store-slug>.ecommerce-premium.vercel.app/products/<product-slug>`

Internal application route:
`/store/<store-slug>/products/<product-slug>`

## Authentication

- Supabase Auth owns passwords, sessions and provider identities.
- Email/password is supported.
- Google and Facebook OAuth use the same callback route.
- Browser-local storage may remember only the email convenience value; passwords are never written there.
- The server exchanges the OAuth authorization code for the session and validates the next redirect path.

## Tenant ownership

`stores` contains public storefront configuration only.
`store_owners` contains the seller ownership binding.
`store_members` contains team access.
`products.store_id` binds every product to one store.

Ownership is established by a database trigger using the authenticated user id. The client never sends an owner id when creating a store.

## Public vs private data access

Seller/dashboard reads use the SSR Supabase client with the signed-in session.
Public storefront reads use a stateless anonymous Supabase client.
Anonymous RLS policies expose only active storefront/product rows.
Owner identifiers are not exposed through the public storefront rows.

## Product identity

Each product has:
- store-scoped slug
- stable UUID
- optional SKU
- SEO title/description
- primary media URL
- canonical share URL
- Open Graph/Twitter metadata
- Schema.org Product JSON-LD

That identity stays stable when custom domains are introduced later.

## Current module layers

Foundation:
- Auth
- Multi-store account
- Store provisioning
- Seller dashboard
- Product CRUD
- Public storefront
- Catalog
- Product detail
- Guest cart
- SEO/social sharing
- Sitemap/robots/OG image

Planned modules:
- Variants
- Media library
- Checkout
- Orders
- Customers
- Payments
- Shipping
- Reviews
- Coupons
- Analytics
- Notifications
- Team permissions
- Custom domains
- API/webhooks
- PWA
- AI
- Python intelligence
- 3D/AR
- Admin
- Feature flags
- Backup/recovery

## Python / AI boundary

Heavy image, vision, NLP, forecasting and 3D work should run asynchronously outside normal Next.js request/response execution.

Target flow:

Next.js
→ secure upload
→ queue/event
→ Python worker
→ model/reconstruction/optimization
→ object storage
→ CDN-ready artifact
→ storefront

## Security rules

- Never expose service-role keys in browser code.
- Keep authorization in database/RLS or trusted server code, not user-editable profile metadata.
- Keep owner/member policies store-scoped.
- Keep public storefront policies read-only and limited to active data.
- Validate slugs, prices, stock and currency on the server.
- Revalidate product price/stock at checkout; browser cart state is never trusted for final order totals.
- Preserve auditability as financial, payment and moderation modules are added.

## Performance rules

- Use Next.js server rendering for data-heavy public pages where practical.
- Use optimized image handling and lazy loading.
- Keep 3D models compressed and provide mobile-sized assets.
- Honor `prefers-reduced-motion`.
- Keep anonymous storefront access stateless.
- Add caching at the module boundary only after tenant correctness is proven.

## Source of truth

GitHub is the source for application code and migration files.
Supabase is the runtime source for Auth and PostgreSQL.
Vercel is the deployment target.
The platform domain and future custom domains remain configuration, not hard-coded tenant identity.
