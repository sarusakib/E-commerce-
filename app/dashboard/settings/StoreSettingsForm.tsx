"use client";

import { useActionState } from "react";
import { updateStoreSettings, type StoreSettingsState } from "./actions";

type Props = {
  storeId: string;
  slug: string;
  initial: {
    name: string;
    description: string;
    currency: string;
    locale: string;
    timezone: string;
    countryCode: string;
    announcement: string;
    accent: string;
  };
};

export default function StoreSettingsForm({ storeId, slug, initial }: Props) {
  const [state, action, pending] = useActionState(updateStoreSettings, {} as StoreSettingsState);

  return (
    <form className="store-form" action={action}>
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="form-grid">
        <label><span>Store name</span><input name="name" defaultValue={initial.name} maxLength={80} required /></label>
        <label><span>Currency</span><input name="currency" defaultValue={initial.currency} maxLength={3} required /></label>
        <label><span>Language / locale</span><input name="locale" defaultValue={initial.locale} maxLength={10} required /></label>
        <label><span>Country</span><input name="country_code" defaultValue={initial.countryCode} maxLength={2} required /></label>
        <label><span>Timezone</span><input name="timezone" defaultValue={initial.timezone} placeholder="Asia/Dhaka" required /></label>
        <label><span>Accent color</span><input name="accent" defaultValue={initial.accent} placeholder="#73edff" required /></label>
      </div>
      <label><span>Store description</span><textarea name="description" defaultValue={initial.description} rows={5} maxLength={5000} /></label>
      <label><span>Announcement</span><textarea name="announcement" defaultValue={initial.announcement} rows={3} maxLength={500} /></label>
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
      </div>
      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}
    </form>
  );
}
