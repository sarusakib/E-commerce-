'use client';

import { useActionState } from "react";
import type { DomainState } from "./actions";
import { addCustomDomain } from "./actions";

export default function DomainForm({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<DomainState, FormData>(addCustomDomain, {});

  return (
    <form action={action} className="store-form">
      <input type="hidden" name="store_id" value={storeId} />
      <div className="form-section-title">Add custom domain</div>
      <label>
        <span>Domain</span>
        <input name="hostname" type="text" inputMode="url" autoComplete="url" placeholder="www.brand.com" maxLength={253} required />
      </label>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add domain"}
      </button>
      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}
      {state.verificationToken && (
        <div className="dns-instructions">
          <strong>TXT verification</strong>
          <p>Add this DNS record at your domain provider:</p>
          <code>
            Host: _ecommerce-premium<br />
            Type: TXT<br />
            Value: {state.verificationToken}
          </code>
          <p>After DNS propagation, return here and press Verify.</p>
        </div>
      )}
    </form>
  );
}
