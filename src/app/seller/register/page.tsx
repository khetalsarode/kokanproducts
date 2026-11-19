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
        New seller shops stay pending until an admin approves them under Admin → Users.
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        {(
          [
            ["name", "Your full name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["shopName", "Shop / brand name"],
            ["location", "Location"],
            ["password", "Password"],
            ["confirm", "Confirm password"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span className="text-ink/70">{label}</span>
            <input
              className="field"
              type={
                key.includes("password") || key === "confirm"
                  ? "password"
                  : key === "email"
                    ? "email"
                    : "text"
              }
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key !== "phone"}
              minLength={key.includes("password") || key === "confirm" ? 8 : undefined}
            />
          </label>
        ))}
        {error && <p className="text-sm text-spice">{error}</p>}
        <button type="submit" className="btn-primary w-fit" disabled={busy}>
          {busy ? "Creating…" : "Create seller account"}
        </button>
      </form>
    </RoleAuthShell>
  );
}
