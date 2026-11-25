"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  dashboardPathForRole,
  useAuth,
  type AuthRole,
} from "@/context/AuthContext";

export function RoleLoginForm({ role }: { role: AuthRole }) {
  const { login, customer, ready, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowPhone = role === "customer";

  useEffect(() => {
    if (!ready || !customer) return;
    if (customer.role === role) {
      router.replace(next || dashboardPathForRole(role));
      return;
    }
    setError(
      `This portal is for ${role}s. You are signed in as ${customer.role}. Sign out to continue.`,
    );
  }, [ready, customer, role, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await login(identifier, password, role);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace(next || dashboardPathForRole(role));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-ink/70">
          {allowPhone ? "Email or mobile number" : "Email"}
        </span>
        <input
          className="field"
          type={allowPhone ? "text" : "email"}
          autoComplete={allowPhone ? "username" : "email"}
          inputMode={allowPhone ? "email" : undefined}
          placeholder={allowPhone ? "you@email.com or 98765 43210" : undefined}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-spice">{error}</p>
          {customer && customer.role !== role && (
            <button
              type="button"
              className="text-sm font-medium text-sea hover:underline"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          )}
        </div>
      )}
      <button type="submit" className="btn-primary w-fit" disabled={busy}>
        {busy
          ? "Signing in…"
          : role === "admin"
            ? "Sign in to admin"
            : role === "seller"
              ? "Sign in to seller desk"
              : "Sign in"}
      </button>
    </form>
  );
}
