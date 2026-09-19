"use client";

import { useActionState } from "react";
import { createTeamInvite } from "./actions";
import type { TeamInviteState } from "./types";

const initialState: TeamInviteState = {};

export default function TeamInviteForm({ storeId }: { storeId: string }) {
  const [state, formAction, pending] = useActionState(createTeamInvite, initialState);

  return (
    <div>
      <form action={formAction} className="auth-form">
        <input type="hidden" name="store_id" value={storeId} />
        <div className="form-grid">
          <label>
            <span>Email</span>
            <input type="email" name="email" maxLength={254} required />
          </label>
          <label>
            <span>Role</span>
            <select name="role" defaultValue="staff">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="product_manager">Product Manager</option>
              <option value="order_manager">Order Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </div>

        {state.error && <div className="alert error" role="alert">{state.error}</div>}
        {state.success && <div className="alert success" role="status">{state.success}</div>}
        {state.inviteUrl && (
          <div className="alert success" role="status">
            <strong>Invitation URL</strong>
            <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{state.inviteUrl}</code>
          </div>
        )}

        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invitation"}
        </button>
      </form>
    </div>
  );
}
