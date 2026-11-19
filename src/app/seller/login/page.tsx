"use client";

import { Suspense } from "react";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { RoleLoginForm } from "@/components/RoleLoginForm";

function Inner() {
  return (
    <RoleAuthShell role="seller" mode="login">
      <p className="mb-4 text-sm text-ink/55">
        Sign in with the seller email and password from your Cursor Secrets (
        <span className="font-medium text-ink">SEED_SELLER_EMAIL</span> /{" "}
        <span className="font-medium text-ink">SEED_SELLER_PASSWORD</span>).
      </p>
      <RoleLoginForm role="seller" />
    </RoleAuthShell>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
