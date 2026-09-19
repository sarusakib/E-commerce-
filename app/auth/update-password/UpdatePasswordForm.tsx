'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setPassword("");
      setConfirm("");
      setMessage("Password updated successfully.");
      setTimeout(() => router.replace("/dashboard"), 700);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card compact">
      <div className="auth-brand">
        <span className="logo-mark" aria-hidden="true">EP</span>
        <div>
          <strong>E-Commerce Premium</strong>
          <span>Password recovery</span>
        </div>
      </div>

      <div className="auth-heading">
        <div className="kicker">Account security</div>
        <h1>Choose a new password.</h1>
        <p>Use at least 8 characters. Do not reuse a password from another service.</p>
      </div>

      <form onSubmit={submit} className="auth-form">
        <label>
          <span>New password</span>
          <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        <label>
          <span>Confirm password</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required />
        </label>
        <button className="button primary auth-submit" type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>

      {error && <div className="alert error" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}
    </section>
  );
}
