"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DeveloperKeyState } from "./types";

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createApiKey(
  _previous: DeveloperKeyState,
  formData: FormData,
): Promise<DeveloperKeyState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = text(formData, "store_id", 64);
  const name = text(formData, "name", 80) || "Default API key";

  if (!storeId) return { error: "Select a store." };

  const token = "ep_live_" + randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 18);

  const { error } = await supabase.from("api_keys").insert({
    store_id: storeId,
    name,
    key_prefix: prefix,
    key_hash: hash,
    scopes: ["products:read"],
    created_by: auth.user.id,
  });

  if (error) return { error: "API key could not be created." };

  revalidatePath("/dashboard/developer");
  return {
    secret: token,
  };
}

export async function revokeApiKey(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const keyId = text(formData, "key_id", 64);
  const storeId = text(formData, "store_id", 64);

  if (!keyId || !storeId) return;

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("store_id", storeId);

  revalidatePath("/dashboard/developer");
}
