"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function validHostname(value: string) {
  const host = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return host.length <= 253
    && /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])$/.test(host)
    && !host.includes("..")
    && host.split(".").length >= 2;
}

export type DomainState = {
  error?: string;
  verificationToken?: string;
  success?: string;
};

export async function addCustomDomain(
  _previous: DomainState,
  formData: FormData,
): Promise<DomainState> {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = text(formData, "store_id", 64);
  const hostname = text(formData, "hostname", 253).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!storeId || !validHostname(hostname)) return { error: "Enter a valid custom domain." };

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) return { error: "Store not found or access is not allowed." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase.from("custom_domains").insert({
    store_id: storeId,
    hostname,
    status: "pending",
    verification_method: "txt",
    verification_token_hash: tokenHash,
  });

  if (error) {
    return { error: error.code === "23505" ? "That domain is already registered." : "Custom domain could not be added." };
  }

  revalidatePath("/dashboard/domains");
  return {
    success: "Custom domain added. Add the TXT record, then verify.",
    verificationToken: token,
  };
}

export async function verifyCustomDomain(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const domainId = text(formData, "domain_id", 64);
  const storeId = text(formData, "store_id", 64);
  if (!domainId || !storeId) return;

  const { data: domain } = await supabase
    .from("custom_domains")
    .select("id,store_id,hostname,verification_token_hash,status")
    .eq("id", domainId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!domain) return;

  try {
    const dnsUrl = "https://dns.google/resolve?name=" +
      encodeURIComponent("_ecommerce-premium." + domain.hostname) +
      "&type=TXT";
    const response = await fetch(dnsUrl, {
      headers: { accept: "application/dns-json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("DNS lookup failed.");

    const dns = await response.json() as {
      Answer?: Array<{ data?: string }>;
    };

    const found = (dns.Answer ?? []).some((answer) => {
      const raw = String(answer.data ?? "").replace(/^"|"$/g, "").replaceAll('"', "");
      return createHash("sha256").update(raw).digest("hex") === domain.verification_token_hash;
    });

    if (!found) {
      throw new Error("Verification TXT record was not found.");
    }

    await supabase
      .from("custom_domains")
      .update({ status: "active", verified_at: new Date().toISOString() })
      .eq("id", domain.id)
      .eq("store_id", domain.store_id);

    revalidatePath("/dashboard/domains");
  } catch {
    throw new Error("TXT verification failed. Confirm the DNS record and try again.");
  }
}
