"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { useAuth } from "@/context/AuthContext";

type Channel = "email" | "phone";
type Step = "details" | "code";

export default function CustomerRegisterPage() {
  const { register, customer, ready } = useAuth();
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    code: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && customer?.role === "customer") {
      router.replace("/account");
    }
  }, [ready, customer, router]);

  function destination() {
    return channel === "email" ? form.email.trim() : form.phone.trim();
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    setInfo(null);
    if (form.password !== form.confirm) {
      setBusy(false);
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setBusy(false);
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.name.trim().length < 2) {
      setBusy(false);
      setError("Enter your full name.");
      return;
    }
    const res = await fetch("/api/auth/verify/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel,
        destination: destination(),
        purpose: "register",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send verification code.");
      return;
    }
    setInfo(data.message || "Verification code sent.");
    setStep("code");
  }

  async function confirmCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const confirmRes = await fetch("/api/auth/verify/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel,
        destination: destination(),
        purpose: "register",
        code: form.code,
      }),
    });
    const confirmData = (await confirmRes.json().catch(() => ({}))) as {
      error?: string;
      verificationToken?: string;
    };
    if (!confirmRes.ok || !confirmData.verificationToken) {
      setBusy(false);
      setError(confirmData.error || "Could not verify code.");
      return;
    }

    const err = await register({
      name: form.name,
      email: channel === "email" ? form.email : "",
      phone: form.phone,
      password: form.password,
      role: "customer",
      channel,
      verificationToken: confirmData.verificationToken,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/account");
  }

  return (
    <RoleAuthShell role="customer" mode="register">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-foam/80 p-1">
        {(
          [
            ["email", "Email"],
            ["phone", "Mobile OTP"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={step === "code"}
            onClick={() => {
              setChannel(key);
              setError(null);
              setInfo(null);
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              channel === key
                ? "bg-white text-sea shadow-sm"
                : "text-ink/55 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {step === "details" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="grid gap-3"
        >
          <label className="grid gap-1 text-sm">
            <span className="text-ink/70">Full name</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          {channel === "email" ? (
            <label className="grid gap-1 text-sm">
              <span className="text-ink/70">Email</span>
              <input
                className="field"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
          ) : (
            <label className="grid gap-1 text-sm">
              <span className="text-ink/70">Mobile number</span>
              <input
                className="field"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
          )}
          {channel === "email" && (
            <label className="grid gap-1 text-sm">
              <span className="text-ink/70">Phone (optional)</span>
              <input
                className="field"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          )}
          <label className="grid gap-1 text-sm">
            <span className="text-ink/70">Password</span>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink/70">Confirm password</span>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              minLength={8}
            />
          </label>
          <p className="text-xs text-ink/50">
            {channel === "email"
              ? "A verification code is emailed to you (requires Resend secrets)."
              : "An OTP is texted to you (requires Twilio SMS secrets)."}
          </p>
          {error && <p className="text-sm text-spice">{error}</p>}
          <button type="submit" className="btn-primary w-fit" disabled={busy}>
            {busy
              ? "Sending…"
              : channel === "email"
                ? "Send email verification"
                : "Send mobile OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="grid gap-3">
          <p className="text-sm text-ink/65">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-ink">{destination()}</span>.
          </p>
          {info && <p className="text-sm text-lagoon">{info}</p>}
          <label className="grid gap-1 text-sm">
            <span className="text-ink/70">Verification code</span>
            <input
              className="field tracking-[0.3em]"
              inputMode="numeric"
              maxLength={6}
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              required
            />
          </label>
          {error && <p className="text-sm text-spice">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary w-fit" disabled={busy}>
              {busy ? "Creating…" : "Verify & create account"}
            </button>
            <button
              type="button"
              className="btn-outline w-fit"
              disabled={busy}
              onClick={() => {
                setStep("details");
                setForm({ ...form, code: "" });
                setInfo(null);
                setError(null);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="text-sm font-medium text-sea hover:underline"
              disabled={busy}
              onClick={() => void sendCode()}
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </RoleAuthShell>
  );
}
