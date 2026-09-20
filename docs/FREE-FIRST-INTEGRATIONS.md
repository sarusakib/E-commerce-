# Free-first integration setup

The platform defaults to a free-first architecture. This does not claim that every external service is permanently free.

## Enabled without paid providers

- **Payments:** Cash on Delivery (COD) remains the zero-provider-cost payment path.
- **Chat:** Supabase Realtime is the first text-chat path and stays inside the project's free quota until the quota is exceeded.
- **AR:** Three.js + AR.js are the open-source browser stack for the AR viewer.
- **PWA/offline:** served by the existing application.

## Free-tier / self-hosted paths

- **AI:** Cloudflare Workers AI is the preferred free-first provider path. The current free allocation is limited, so production usage must be quota-aware.
- **3D:** Python reconstruction runs as an asynchronous worker outside the Next.js/Vercel build. Self-hosting is the free-first option; GPU compute may still cost money.
- **Courier:** keep the shipping provider adapter; courier postage itself is not a free software feature.

## Safety rules

1. Never put provider secret keys in client code.
2. Never put a 3D reconstruction job inside a Vercel build or request.
3. Keep online payment gateways disabled until merchant credentials are configured.
4. Keep provider choice behind environment variables and feature flags.
5. Fail closed: an unconfigured provider must report unavailable rather than pretending to be live.

## Environment

Set `COMMERCE_FREE_MODE=true`.

Set `COMMERCE_AI_PROVIDER` only after a real AI provider is configured.

Set `THREED_WORKER_URL` only after a reachable Python worker is deployed.

The architecture remains provider-neutral so paid gateways, paid AI, hosted GPU workers or courier APIs can be added later without changing the tenant/order model.
