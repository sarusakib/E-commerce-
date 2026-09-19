"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encryptWebhookSecret } from "@/lib/webhooks";
import type { WebhookActionState } from "./types";

const EVENTS = new Set([
  "order.created",
  "order.updated",
  "coupon.applied",
  "team.invite.accepted",
  "*",
]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function validHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && url.toString().length <= 2048;
  } catch {
    return false;
  }
}

export async function createWebhookEndpoint(
  _previous: WebhookActionState,
  formData: FormData,
): Promise<WebhookActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = text(formData, "store_id", 64);
  const url = text(formData, "url", 2048);
  const rawEvents = String(formData.get("events") ?? "order.created")
    .split(",")
    .map((event) => event.trim())
    .filter(Boolean);

  if (!storeId || !validHttps(url)) return { error: "Webhook URL must be a valid HTTPS endpoint." };
  if (!rawEvents.length || rawEvents.some((event) => !EVENTS.has(event))) return { error: "Unsupported webhook event." };

  try {
    const signingSecret = "whsec_" + randomBytes(32).toString("base64url");
    const encrypted = encryptWebhookSecret(signingSecret);

    const { error } = await supabase.from("webhook_endpoints").insert({
      store_id: storeId,
      url,
      events: Array.from(new Set(rawEvents)),
      secret_encrypted: encrypted,
      active: true,
      created_by: auth.user.id,
    });

    if (error) return { error: "Webhook endpoint could not be created." };

    revalidatePath("/dashboard/developer");
    return {
      success: "Webhook endpoint created.",
      secret: signingSecret,
    };
  } catch (caught) {
    return { error: caught instanceof Error ? caught.message : "Webhook endpoint could not be created." };
  }
}

export async function disableWebhookEndpoint(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const id = text(formData, "endpoint_id", 64);
  const storeId = text(formData, "store_id", 64);
  if (!id || !storeId) return;

  await supabase.from("webhook_endpoints").update({ active: false }).eq("id", id).eq("store_id", storeId);
  revalidatePath("/dashboard/developer");
}
