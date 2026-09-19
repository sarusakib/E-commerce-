'use client';

import { useActionState } from "react";
import { createStoreAction, type CreateStoreState } from "@/app/store/create/actions";

const initialState: CreateStoreState = {};

export default function CreateStoreForm() {
  const [state, action, pending] = useActionState(createStoreAction, initialState);

  return (
    <form action={action} className="store-form">
      <div className="form-grid">
        <label>
          <span>Store name</span>
          <input name="name" placeholder="Aurora Living" maxLength={80} required />
          <small>Your storefront name can be changed later.</small>
        </label>

        <label>
          <span>URL slug</span>
          <input name="slug" placeholder="aurora-living" pattern="[a-z0-9-]+" maxLength={63} required />
          <small>Lowercase letters, numbers and hyphens only.</small>
        </label>

        <label>
          <span>Default currency</span>
          <select name="currency" defaultValue="USD">
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound Sterling</option>
            <option value="BDT">BDT — Bangladeshi Taka</option>
            <option value="INR">INR — Indian Rupee</option>
          </select>
        </label>

        <label>
          <span>Store language</span>
          <select name="locale" defaultValue="en">
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>

        <label>
          <span>Timezone</span>
          <select name="timezone" defaultValue="Asia/Dhaka">
            <option value="Asia/Dhaka">Asia/Dhaka</option>
            <option value="UTC">UTC</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </label>
      </div>

      <div className="domain-preview">
        <span>Store URL</span>
        <strong><span>your-slug</span>.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommerce-premium.vercel.app"}</strong>
      </div>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <button className="button primary auth-submit" type="submit" disabled={pending}>
        {pending ? "Creating store…" : "Create store"}
      </button>
    </form>
  );
}
