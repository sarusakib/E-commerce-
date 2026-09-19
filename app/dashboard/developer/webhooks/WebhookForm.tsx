"use client";

import { useActionState } from "react";
import { createWebhookEndpoint } from "./actions";
import type { WebhookActionState } from "./types";

const initialState: WebhookActionState = {};

export default function WebhookForm({ storeId }: { storeId: string }) {
  const [state, formAction, pending] = useActionState(createWebhookEndpoint, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="store_id" value={storeId} />

      <label>
        <span>HTTPS endpoint</span>
        <input
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://example.com/webhooks"
          maxLength={2048}
          required
        />
      </label>

      <label>
        <span>Events (comma-separated)</span>
        <input
          name="events"
          defaultValue="order.created"
          maxLength={500}
          placeholder="order.created,order.updated"
        />
      </label>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}
      {state.secret && (
        <div className="alert success" role="status">
          <strong>Signing secret — save it now:</strong>
          <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{state.secret}</code>
        </div>
      )}

      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create webhook"}
      </button>
    </form>
  );
}
