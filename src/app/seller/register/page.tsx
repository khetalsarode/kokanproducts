"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
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

  if (ready && customer) {
    router.replace(customer.role === "seller" ? "/seller" : "/account");
  }

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
    <div className="section !pt-10 max-w-lg">
      <BrandLogo href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">Sell on KokanProducts</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Seller registration</h1>
      <p className="mt-2 text-ink/60">
        Create a seller account to list Konkan products, manage stock, and fulfil your orders.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-3">
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
              type={key.includes("password") || key === "confirm" ? "password" : key === "email" ? "email" : "text"}
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

      <p className="mt-6 text-sm text-ink/60">
        Already registered?{" "}
        <Link href="/login?next=/seller" className="font-medium text-sea hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
