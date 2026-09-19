'use client';

import { useActionState } from "react";
import type { ProductActionState } from "../../types";

type Variant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  option_values: Record<string, unknown>;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number;
  weight_grams: number | string | null;
  image_url: string | null;
  sort_order: number;
};

type Action = (
  state: ProductActionState,
  formData: FormData,
) => Promise<ProductActionState>;

export default function VariantForm({
  storeId,
  productId,
  variant,
  action,
}: {
  storeId: string;
  productId: string;
  variant?: Variant;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="variant-form">
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="product_id" value={productId} />
      {variant?.id && <input type="hidden" name="variant_id" value={variant.id} />}

      <div className="variant-form-grid">
        <label><span>Title</span><input name="title" defaultValue={variant?.title ?? ""} placeholder="Black / Large" maxLength={180} required /></label>
        <label><span>SKU</span><input name="sku" defaultValue={variant?.sku ?? ""} maxLength={80} /></label>
        <label><span>Barcode</span><input name="barcode" defaultValue={variant?.barcode ?? ""} maxLength={80} /></label>
        <label><span>Price</span><input name="price" type="number" min="0" step="0.01" defaultValue={variant?.price ?? ""} required /></label>
        <label><span>Compare-at</span><input name="compare_at_price" type="number" min="0" step="0.01" defaultValue={variant?.compare_at_price ?? ""} /></label>
        <label><span>Stock</span><input name="stock" type="number" min="0" step="1" defaultValue={variant?.stock ?? 0} required /></label>
        <label><span>Weight (g)</span><input name="weight_grams" type="number" min="0" step="0.001" defaultValue={variant?.weight_grams ?? ""} /></label>
        <label><span>Image URL</span><input name="image_url" type="url" defaultValue={variant?.image_url ?? ""} maxLength={2048} /></label>
      </div>

      <label>
        <span>Option values JSON</span>
        <input name="option_values" defaultValue={JSON.stringify(variant?.option_values ?? {})} placeholder='{"size":"L","color":"Black"}' maxLength={1200} />
      </label>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : variant ? "Save variant" : "Add variant"}
      </button>
    </form>
  );
}
