import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function secret() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { const parsed = JSON.parse(raw) as Record<string,string>; if (parsed.default) return parsed.default; } catch {} }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function publishable() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) { try { const parsed = JSON.parse(raw) as Record<string,string>; if (parsed.default) return parsed.default; } catch {} }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
  const token = authHeader.slice(7).trim();
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = secret();
  const publicKey = publishable();
  if (!url || !serviceKey || !publicKey) return json({ error: "Invitation service is not configured." }, 503);

  try {
    const identityClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await identityClient.auth.getUser(token);
    if (userError || !userData.user || !userData.user.email) return json({ error: "Invalid customer session." }, 401);

    const body = await request.json() as Record<string, unknown>;
    const inviteToken = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[A-Za-z0-9_-]{40,160}$/.test(inviteToken)) return json({ error: "Invalid invitation token." }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("accept_store_invite", {
      p_token: inviteToken,
      p_user_id: userData.user.id,
      p_user_email: userData.user.email.toLowerCase(),
    });
    if (error) throw error;
    return json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe = /invalid|expired|different email|Authentication required/i.test(message) ? message : "Invitation could not be accepted.";
    return json({ error: safe }, 400);
  }
});