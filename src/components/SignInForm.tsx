"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Codes are sent and verified from the browser, not a server action. Supabase rate limits
// these calls per IP, so going through our server would make all users share one limit.

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "That code is wrong or has expired. Check it, or send a new one.",
  email_address_invalid: "That email address doesn't look right.",
  email_address_not_authorized: "We can't send email to that address yet.",
  over_email_send_rate_limit: "Please wait a minute before requesting another code.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
};
const FALLBACK_ERROR = "Something went wrong. Please try again.";

function messageFor(error: { code?: string }) {
  return (error.code && ERROR_MESSAGES[error.code]) || FALLBACK_ERROR;
}

export function SignInForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await createClient().auth.signInWithOtp({ email: email.trim() });
      if (error) {
        setError(messageFor(error));
        return false;
      }
      return true;
    } catch {
      setError(FALLBACK_ERROR);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (await sendCode()) setStep("code");
  }

  async function onResend() {
    if (await sendCode()) setNotice("New code sent.");
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
      if (error) {
        setError(messageFor(error));
        setPending(false);
        return;
      }
      // A full page load clears the browser's router cache. pending stays true until it happens.
      window.location.replace("/leagues");
    } catch {
      setError(FALLBACK_ERROR);
      setPending(false);
    }
  }

  function onChangeEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
  }

  if (step === "email") {
    return (
      <form onSubmit={onSubmitEmail}>
        <label htmlFor="email">Email</label>
        <div className="row">
          <input
            id="email"
            className="grow"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send code"}
          </button>
        </div>
        <p className="hint">Sign in or create an account. We&apos;ll email you a one-time code, with no password needed.</p>
        {error && <p className="error">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCode}>
      <label htmlFor="code">Enter the code sent to {email.trim()}</label>
      <div className="row">
        <input
          id="code"
          className="grow"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <button type="submit" disabled={pending || !code}>
          {pending ? "Verifying…" : "Verify"}
        </button>
      </div>
      <p className="hint">
        <button type="button" className="link-button" disabled={pending} onClick={onResend}>
          Send a new code
        </button>
        {" · "}
        <button type="button" className="link-button" disabled={pending} onClick={onChangeEmail}>
          Use a different email
        </button>
      </p>
      {notice && <p className="muted">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  );
}
