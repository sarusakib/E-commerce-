'use client';

import { useActionState } from "react";
import type { DeveloperKeyState } from "./types";
import { createApiKey } from "./actions";

export default function ApiKeyForm({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<DeveloperKeyState, FormData>(createApiKey, {});

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        <span>Key name</span>
        <input name="name" maxLength={80} placeholder="Analytics integration" />
      </label>
      {state.secret ? (
        <div className="secret-panel">
          <strong>Copy this key now.</strong>
          <code>{state.secret}</code>
          <p>It will not be shown again. Store it in your secret manager.</p>
        </div>
      ) : null}
      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create API key"}
      </button>
    </form>
  );
}
