import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function getSecretKey() {
  const direct = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (direct) return direct;

  const raw = process.env.SUPABASE_SECRET_KEYS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed.default ?? "";
    } catch {
      return "";
    }
  }

  return "";
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSecretKey();

  if (!url || !key) {
    throw new Error("Missing server-side Supabase secret configuration.");
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
