"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { useAuth } from "@/context/AuthContext";

export default function CustomerRegisterPage() {
  const { register, customer, ready } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && customer?.role === "customer") {
      router.replace("/account");
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
      role: "customer",
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
      <form onSubmit={onSubmit} className="grid gap-3">
        {(
          [
            ["name", "Full name", "text"],
            ["email", "Email", "email"],
            ["phone", "Phone", "tel"],
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
              required={key !== "phone"}
              minLength={key === "password" || key === "confirm" ? 8 : undefined}
            />
          </label>
        ))}
        {error && <p className="text-sm text-spice">{error}</p>}
        <button type="submit" className="btn-primary w-fit" disabled={busy}>
          {busy ? "Creating…" : "Create customer account"}
        </button>
      </form>
    </RoleAuthShell>
  );
}
