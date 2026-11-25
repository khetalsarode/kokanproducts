"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { useAuth } from "@/context/AuthContext";

export default function SellerRegisterPage() {
  const { register, customer, ready } = useAuth();
  const router = useRouter();
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
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && customer?.role === "seller") {
      router.replace("/seller");
    }
  }, [ready, customer, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
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
        After you register, your shop stays <strong>Pending Approval</strong> until an admin
        reviews it. You can sign in, but catalogue tools unlock only after approval.
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
          Personal details
        </p>
        {(
          [
            ["name", "Your full name", "text"],
            ["email", "Email", "email"],
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
        {error && <p className="text-sm text-spice">{error}</p>}
        <button type="submit" className="btn-primary w-fit" disabled={busy}>
          {busy ? "Submitting…" : "Submit seller registration"}
        </button>
      </form>
    </RoleAuthShell>
  );
}
