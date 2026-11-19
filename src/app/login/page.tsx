"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { dashboardPathForRole, useAuth } from "@/context/AuthContext";

function LoginForm() {
  const { login, customer, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && customer) {
    router.replace(next || dashboardPathForRole(customer.role));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await login(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
  }

  return (
    <div className="section !pt-10 max-w-lg">
      <BrandLogo href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">Welcome back</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Sign in</h1>
      <p className="mt-2 text-ink/60">
        Customers, sellers, and admins use the same sign-in — you’ll land on the right dashboard.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-ink/70">Email</span>
          <input
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-ink/70">Password</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p className="text-sm text-spice">{error}</p>}
        <button type="submit" className="btn-primary w-fit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        New customer?{" "}
        <Link href="/register" className="font-medium text-sea hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink/60">
        Want to sell?{" "}
        <Link href="/seller/register" className="font-medium text-sea hover:underline">
          Seller registration
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
