export type FreeProviderKey =
  | "cod"
  | "supabase-realtime"
  | "cloudflare-workers-ai"
  | "python-local-worker"
  | "threejs-arjs";

export type FreeModeConfig = {
  enabled: boolean;
  payment: { provider: "cod"; onlineGatewayRequired: true };
  ai: { provider: "cloudflare-workers-ai"; credentialRequired: true };
  threeD: { provider: "python-local-worker"; gpuRecommended: true };
  ar: { provider: "threejs-arjs"; credentialRequired: false };
  chat: { provider: "supabase-realtime"; credentialRequired: false };
};

export const FREE_FIRST_CONFIG: FreeModeConfig = {
  enabled: true,
  payment: { provider: "cod", onlineGatewayRequired: true },
  ai: { provider: "cloudflare-workers-ai", credentialRequired: true },
  threeD: { provider: "python-local-worker", gpuRecommended: true },
  ar: { provider: "threejs-arjs", credentialRequired: false },
  chat: { provider: "supabase-realtime", credentialRequired: false },
};

export function isFreeFirstMode() {
  return process.env.COMMERCE_FREE_MODE !== "false";
}

export function getFreeFirstStatus() {
  const enabled = isFreeFirstMode();

  return {
    enabled,
    payment: {
      provider: FREE_FIRST_CONFIG.payment.provider,
      ready: enabled,
      note: "COD is available without a payment-gateway account.",
    },
    ai: {
      provider: FREE_FIRST_CONFIG.ai.provider,
      ready: enabled && Boolean(process.env.COMMERCE_AI_PROVIDER),
      note: "Free quota is available, but provider credentials/binding are required.",
    },
    threeD: {
      provider: FREE_FIRST_CONFIG.threeD.provider,
      ready: enabled && Boolean(process.env.THREED_WORKER_URL),
      note: "The worker can be self-hosted; GPU compute is not guaranteed to be free.",
    },
    ar: {
      provider: FREE_FIRST_CONFIG.ar.provider,
      ready: enabled,
      note: "Open-source browser AR stack; device/browser support still applies.",
    },
    chat: {
      provider: FREE_FIRST_CONFIG.chat.provider,
      ready: enabled,
      note: "Use Supabase Realtime within the project's free quota.",
    },
  };
}
