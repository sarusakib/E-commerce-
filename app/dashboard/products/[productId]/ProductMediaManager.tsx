'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Media = {
  id: string;
  storage_path: string | null;
  public_url: string | null;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
};

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "model/gltf-binary",
  "model/gltf+json",
]);

export default function ProductMediaManager({
  storeId,
  productId,
  currentPrimary,
}: {
  storeId: string;
  productId: string;
  currentPrimary: string | null;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("product_images")
      .select("id,storage_path,public_url,alt_text,is_primary,sort_order")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });

    if (loadError) {
      setError("Could not load product media.");
      return;
    }

    setItems((data ?? []) as Media[]);
  }

  useEffect(() => {
    void load();
  }, [productId, storeId]);

  async function upload(file: File) {
    setError("");
    setMessage("");

    if (!ALLOWED.has(file.type)) {
      setError("This file type is not allowed.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Files must be 20 MB or smaller.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = storeId + "/" + productId + "/" + crypto.randomUUID() + "." + extension;

      const { error: uploadError } = await supabase.storage
        .from("product-media")
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("product-media")
        .getPublicUrl(path);

      const isFirst = items.length === 0;
      const { data: row, error: insertError } = await supabase
        .from("product_images")
        .insert({
          store_id: storeId,
          product_id: productId,
          storage_path: path,
          public_url: publicUrl.publicUrl,
          alt_text: file.name.slice(0, 160),
          is_primary: isFirst,
          sort_order: items.length,
        })
        .select("id,storage_path,public_url,alt_text,is_primary,sort_order")
        .single();

      if (insertError) {
        await supabase.storage.from("product-media").remove([path]);
        throw insertError;
      }

      if (isFirst) {
        const { error: productError } = await supabase
          .from("products")
          .update({ primary_image_url: publicUrl.publicUrl })
          .eq("id", productId)
          .eq("store_id", storeId);
        if (productError) throw productError;
      }

      setItems((current) => [...current, row as Media]);
      setMessage("Media uploaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(item: Media) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      if (item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("product-media")
          .remove([item.storage_path]);
        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from("product_images")
        .delete()
        .eq("id", item.id)
        .eq("product_id", productId)
        .eq("store_id", storeId);

      if (deleteError) throw deleteError;

      const next = items.filter((current) => current.id !== item.id);
      const replacement = item.is_primary ? next[0] : undefined;

      if (item.is_primary) {
        await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", replacement?.id ?? "__none__")
          .eq("product_id", productId)
          .eq("store_id", storeId);

        await supabase
          .from("products")
          .update({ primary_image_url: replacement?.public_url ?? null })
          .eq("id", productId)
          .eq("store_id", storeId);

        setItems(next.map((current, index) => ({
          ...current,
          is_primary: replacement?.id === current.id,
          sort_order: index,
        })));
      } else {
        setItems(next);
      }

      setMessage("Media removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="media-manager">
      <div className="form-section-title">Product media</div>
      <p className="checkout-note">Images, MP4 video and GLB/GLTF assets are accepted up to 20 MB. Published images use the product-media CDN bucket.</p>

      <label className="media-upload">
        <span>Select media</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,.glb,.gltf"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {(currentPrimary || items.length > 0) && (
        <div className="media-grid">
          {items.map((item) => (
            <article className="media-card" key={item.id}>
              <div className="media-preview">
                {item.public_url && item.public_url.match(/\.(mp4)$/i) ? (
                  <video src={item.public_url} controls preload="metadata" />
                ) : item.public_url ? (
                  <Image src={item.public_url} alt={item.alt_text} fill sizes="180px" />
                ) : (
                  <span>3D</span>
                )}
              </div>
              <div className="media-card-copy">
                <small>{item.is_primary ? "Primary" : "Gallery"}</small>
                {!item.is_primary && (
                  <button type="button" onClick={() => void removeMedia(item)} disabled={busy} className="remove-button">
                    Remove
                  </button>
                )}
                {item.is_primary && (
                  <button type="button" onClick={() => void removeMedia(item)} disabled={busy} className="remove-button">
                    Remove primary
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {error && <div className="alert error" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}
    </section>
  );
}
