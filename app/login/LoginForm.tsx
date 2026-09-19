'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

const EMAIL_KEY = "ecommerce-premium.login.email";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [busy, setBusy] = useState<"email" | "google" | "facebook" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      // Storage can be blocked by privacy settings; auth still works.
    }
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy("email");

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Enter a valid email address.");
        return;
      }

      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (resetError) throw resetError;

        setMessage("If an account exists for that email, a password-reset link has been sent.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (rememberEmail) {
        window.localStorage.setItem(EMAIL_KEY, cleanEmail);
      } else {
        window.localStorage.removeItem(EMAIL_KEY);
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: name.trim() || undefined,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setMessage("Account created. Check your email to confirm the account, then sign in.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) throw signInError;

      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleOAuth(provider: "google" | "facebook") {
    setError("");
    setMessage("");
    setBusy(provider);

    try {
      const supabase = createClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("The authentication provider did not return a redirect URL.");

      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Social sign-in failed. Please try again.");
      setBusy(null);
    }
  }

  const heading =
    mode === "signup" ? "Create your account." :
    mode === "reset" ? "Reset your password." :
    "Welcome back.";

  const submitLabel =
    mode === "signup" ? "Create account" :
    mode === "reset" ? "Send reset link" :
    "Sign in";

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="logo-mark" aria-hidden="true">EP</span>
        <div>
          <strong>E-Commerce Premium</strong>
          <span>Commerce OS</span>
        </div>
      </div>

      <div className="auth-heading">
        <div className="kicker">Secure account access</div>
        <h1>{heading}</h1>
        <p>
          One account can manage multiple independent stores without mixing seller data.
        </p>
      </div>

      {mode !== "reset" && (
        <div className="oauth-grid">
          <button className="oauth-button" type="button" onClick={() => handleOAuth("google")} disabled={busy !== null}>
            <span className="oauth-icon">G</span>
            {busy === "google" ? "Connecting…" : "Continue with Google"}
          </button>
          <button className="oauth-button" type="button" onClick={() => handleOAuth("facebook")} disabled={busy !== null}>
            <span className="oauth-icon">f</span>
            {busy === "facebook" ? "Connecting…" : "Continue with Facebook"}
          </button>
        </div>
      )}

      {mode !== "reset" && <div className="auth-divider"><span>or</span></div>}

      <form onSubmit={handleEmailSubmit} className="auth-form">
        {mode === "signup" && (
          <label>
            <span>Your name</span>
            <input
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              maxLength={80}
            />
          </label>
        )}

        <label>
          <span>Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
          />
        </label>

        {mode !== "reset" && (
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </label>
        )}

        {mode !== "reset" && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
            />
            <span>Remember my email on this device</span>
          </label>
        )}

        <button className="button primary auth-submit" type="submit" disabled={busy !== null}>
          {busy === "email" ? "Please wait…" : submitLabel}
        </button>
      </form>

      {error && <div className="alert error" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}

      <div className="auth-links">
        {mode === "signin" && (
          <>
            <button type="button" onClick={() => switchMode("reset")}>Forgot password?</button>
            <button type="button" onClick={() => switchMode("signup")}>Create an account</button>
          </>
        )}
        {mode === "signup" && (
          <button type="button" onClick={() => switchMode("signin")}>Already have an account? Sign in</button>
        )}
        {mode === "reset" && (
          <button type="button" onClick={() => switchMode("signin")}>Back to sign in</button>
        )}
      </div>

      <p className="auth-footnote">
        Your password is never stored in browser storage. Email/password and OAuth sessions are handled by Supabase Auth.
      </p>
    </div>
  );
}
