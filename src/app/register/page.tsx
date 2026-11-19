"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
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

  if (ready && customer) {
    router.replace("/account");
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
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/account");
  }

  return (
    <div className="section !pt-10 max-w-lg">
      <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Join KokanProducts</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Create account</h1>
      <p className="mt-2 text-ink/60">
        Save addresses, track orders, and keep your wishlist across devices.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-ink/70">Full name</span>
          <input
            className="field"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
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
        <label className="grid gap-1 text-sm">
          <span className="text-ink/70">Phone</span>
          <input
            className="field"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="10-digit mobile"
          />
        </label>
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
        {error && <p className="text-sm text-spice">{error}</p>}
        <button type="submit" className="btn-primary w-fit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sea hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
