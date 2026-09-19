"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TeamInviteState } from "./types";

const ROLES = new Set(["admin", "manager", "product_manager", "order_manager", "staff"]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createTeamInvite(
  _previous: TeamInviteState,
  formData: FormData,
): Promise<TeamInviteState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = text(formData, "store_id", 64);
  const email = text(formData, "email", 254).toLowerCase();
  const role = text(formData, "role", 30);

  if (!storeId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid invitation email." };
  }
  if (!ROLES.has(role)) return { error: "Choose a valid team role." };

  const token = randomBytes(48).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();

  const { data: store } = await supabase
    .from("stores")
    .select("id,slug")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) return { error: "Store not found or access is not allowed." };

  const { error } = await supabase.from("store_invitations").insert({
    store_id: storeId,
    email,
    role,
    permissions: {},
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: auth.user.id,
  });

  if (error) {
    return { error: error.code === "23505" ? "An active invitation already exists for this email." : "Invitation could not be created." };
  }

  revalidatePath("/dashboard/team");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-premium.vercel.app";
  return {
    success: "Invitation created.",
    inviteUrl: origin + "/invite/" + token,
  };
}

export async function revokeTeamInvite(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const inviteId = text(formData, "invite_id", 64);
  const storeId = text(formData, "store_id", 64);
  if (!inviteId || !storeId) return;

  await supabase
    .from("store_invitations")
    .delete()
    .eq("id", inviteId)
    .eq("store_id", storeId);

  revalidatePath("/dashboard/team");
}
