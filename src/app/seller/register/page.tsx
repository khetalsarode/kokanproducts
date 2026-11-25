"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { useAuth } from "@/context/AuthContext";

type Step = "details" | "code";

export default function SellerRegisterPage() {
  const { register, customer, ready } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    location: "Konkan, Maharashtra",
    businessAddress: "",
    gstin: "",
    fssaiLicense: "",
    password: "",
    confirm: "",
    code: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && customer?.role === "seller") {
      router.replace("/seller");
    }
  }, [ready, customer, router]);

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
    const res = await fetch("/api/auth/verify/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel: "email",
        destination: form.email.trim(),
        purpose: "register",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send verification email.");
      return;
    }
    setInfo(data.message || "Verification code sent to your email.");
    setStep("code");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "details") {
      void sendCode();
      return;
    }

    setBusy(true);
    setError(null);
    const confirmRes = await fetch("/api/auth/verify/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channel: "email",
        destination: form.email.trim(),
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
      setError(confirmData.error || "Could not verify email.");
      return;
    }

    const err = await register({
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: "seller",
      shopName: form.shopName,
      location: form.location,
      businessAddress: form.businessAddress,
      gstin: form.gstin,
      fssaiLicense: form.fssaiLicense,
      channel: "email",
      verificationToken: confirmData.verificationToken,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/seller");
  }

  return (
    <RoleAuthShell role="seller" mode="register">
      <p className="mb-4 text-sm text-ink/55">
        Verify your business email, then submit. Your shop stays{" "}
        <strong>Pending Approval</strong> until an admin reviews it.
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        {step === "details" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
              Personal details
            </p>
            {(
              [
                ["name", "Your full name", "text"],
                ["email", "Business email", "email"],
                ["phone", "Mobile number", "tel"],
                ["password", "Password", "password"],
                ["confirm", "Confirm password", "password"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="grid gap-1 text-sm">
                <span className="text-ink/70">{label}</span>
                <input
                  className="field"
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                  minLength={key === "password" || key === "confirm" ? 8 : undefined}
                />
              </label>
            ))}

            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
              Business details
            </p>
            {(
              [
                ["shopName", "Shop / brand name", "text", true],
                ["location", "City / region", "text", true],
                ["businessAddress", "Business address", "text", false],
                ["gstin", "GSTIN (optional)", "text", false],
                ["fssaiLicense", "FSSAI license (optional)", "text", false],
              ] as const
            ).map(([key, label, type, required]) => (
              <label key={key} className="grid gap-1 text-sm">
                <span className="text-ink/70">{label}</span>
                <input
                  className="field"
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={required}
                />
              </label>
            ))}
            <p className="text-xs text-ink/50">
              We’ll email a verification code (requires Resend secrets).
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/65">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-ink">{form.email}</span>.
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
          </>
        )}
        {error && <p className="text-sm text-spice">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary w-fit" disabled={busy}>
            {busy
              ? step === "details"
                ? "Sending…"
                : "Submitting…"
              : step === "details"
                ? "Send email verification"
                : "Verify & submit registration"}
          </button>
          {step === "code" && (
            <>
              <button
                type="button"
                className="btn-outline w-fit"
                disabled={busy}
                onClick={() => {
                  setStep("details");
                  setForm({ ...form, code: "" });
                  setError(null);
                  setInfo(null);
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
            </>
          )}
        </div>
      </form>
    </RoleAuthShell>
  );
}
