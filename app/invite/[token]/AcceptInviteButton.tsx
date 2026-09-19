'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/login?next=" + encodeURIComponent("/invite/" + token));
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });

      if (invokeError) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : invokeError.message;
        throw new Error(message);
      }

      if (!data || typeof data !== "object" || typeof data.store_id !== "string") {
        throw new Error("Invitation response was incomplete.");
      }

      router.replace("/dashboard?store=" + encodeURIComponent(data.store_id));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invitation could not be accepted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <button className="button primary auth-submit" type="button" onClick={accept} disabled={busy}>
        {busy ? "Joining store…" : "Accept invitation"}
      </button>
    </div>
  );
}
