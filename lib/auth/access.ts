import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type StoreRole = Database["public"]["Enums"]["store_member_role"];
export type StorePermission =
  | "store:read" | "store:write" | "settings:read" | "settings:write"
  | "products:read" | "products:write" | "orders:read" | "orders:write"
  | "customers:read" | "customers:write" | "analytics:read"
  | "developer:manage" | "team:manage";

const permissions: Record<StoreRole, readonly StorePermission[]> = {
  owner: ["store:read","store:write","settings:read","settings:write","products:read","products:write","orders:read","orders:write","customers:read","customers:write","analytics:read","developer:manage","team:manage"],
  admin: ["store:read","store:write","settings:read","settings:write","products:read","products:write","orders:read","orders:write","customers:read","customers:write","analytics:read","developer:manage","team:manage"],
  manager: ["store:read","settings:read","settings:write","products:read","products:write","orders:read","orders:write","customers:read","customers:write","analytics:read"],
  product_manager: ["store:read","settings:read","products:read","products:write"],
  order_manager: ["store:read","orders:read","orders:write","customers:read","customers:write"],
  staff: ["store:read","products:read","orders:read","customers:read"],
};

export async function requireUser(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required.");
  return data.user;
}

export async function requirePlatformAdmin(supabase: SupabaseClient<Database>) {
  const user = await requireUser(supabase);
  const { data } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (data?.platform_role !== "admin") throw new Error("Platform administrator access required.");
  return user;
}

export async function getStoreRole(supabase: SupabaseClient<Database>, storeId: string, userId: string): Promise<StoreRole | null> {
  const { data: owner } = await supabase.from("store_owners").select("owner_id").eq("store_id", storeId).eq("owner_id", userId).maybeSingle();
  if (owner) return "owner";
  const { data: member } = await supabase.from("store_members").select("role").eq("store_id", storeId).eq("user_id", userId).maybeSingle();
  return member?.role ?? null;
}

export function hasStorePermission(role: StoreRole | null, permission: StorePermission) {
  return Boolean(role && permissions[role]?.includes(permission));
}

export async function requireStorePermission(supabase: SupabaseClient<Database>, storeId: string, permission: StorePermission) {
  const user = await requireUser(supabase);
  const role = await getStoreRole(supabase, storeId, user.id);
  if (!hasStorePermission(role, permission)) throw new Error("Store permission required.");
  return { user, role };
}
