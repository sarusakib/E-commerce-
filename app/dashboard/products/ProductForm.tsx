'use client';

import { useActionState } from "react";
import type { ProductActionState } from "./actions";

type Product = {
  id?: string;
  store_id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  sku?: string | null;
  currency?: string;
  price?: number | string;
  compare_at_price?: number | string | null;
  stock?: number;
  status?: "draft" | "active" | "archived";
  featured?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
};

type Action = (
  state: ProductActionState,
  formData: FormData,
) => Promise<ProductActionState>;

export default function ProductForm({
  storeId,
  storeCurrency,
  product,
  action,
}: {
  storeId: string;
  storeCurrency: string;
  product?: Product;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="store-form">
      <input type="hidden" name="store_id" value={storeId} />
      {product?.id && <input type="hidden" name="product_id" value={product.id} />}

      <div className="form-grid">
        <label>
          <span>Product name</span>
          <input name="name" defaultValue={product?.name ?? ""} maxLength={180} required />
        </label>

        <label>
          <span>URL slug</span>
          <input
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="premium-phone"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={63}
          />
          <small>Used in the shareable product URL.</small>
        </label>

        <label>
          <span>Brand</span>
          <input name="brand" defaultValue={product?.brand ?? ""} maxLength={100} />
        </label>

        <label>
          <span>Category</span>
          <input name="category" defaultValue={product?.category ?? ""} maxLength={100} />
        </label>

        <label>
          <span>SKU</span>
          <input name="sku" defaultValue={product?.sku ?? ""} maxLength={80} />
        </label>

        <label>
          <span>Currency</span>
          <input
            name="currency"
            defaultValue={product?.currency ?? storeCurrency}
            maxLength={3}
            pattern="[A-Za-z]{3}"
            required
          />
        </label>

        <label>
          <span>Price</span>
          <input name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? ""} required />
        </label>

        <label>
          <span>Compare-at price</span>
          <input name="compare_at_price" type="number" min="0" step="0.01" defaultValue={product?.compare_at_price ?? ""} />
        </label>

        <label>
          <span>Stock</span>
          <input name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0} required />
        </label>

        <label>
          <span>Status</span>
          <select name="status" defaultValue={product?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="active">Active / Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <label>
        <span>Description</span>
        <textarea name="description" rows={7} defaultValue={product?.description ?? ""} />
      </label>

      <div className="check-row product-featured">
        <input id="featured" name="featured" type="checkbox" defaultChecked={product?.featured ?? false} />
        <label htmlFor="featured"><span>Feature this product in the storefront</span></label>
      </div>

      <div className="form-section-title">SEO & social preview</div>
      <div className="form-grid">
        <label>
          <span>SEO title</span>
          <input name="seo_title" defaultValue={product?.seo_title ?? ""} maxLength={70} />
        </label>

        <label>
          <span>SEO description</span>
          <input name="seo_description" defaultValue={product?.seo_description ?? ""} maxLength={160} />
        </label>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <button className="button primary auth-submit" type="submit" disabled={pending}>
        {pending ? "Saving product…" : product?.id ? "Save product" : "Create product"}
      </button>
    </form>
  );
}
