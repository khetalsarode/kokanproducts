"use client";

import { Suspense } from "react";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { RoleLoginForm } from "@/components/RoleLoginForm";
import { DEMO_SELLER } from "@/lib/demoCredentials";

function Inner() {
  return (
    <RoleAuthShell role="seller" mode="login">
      <p className="mb-4 text-sm text-ink/55">
        Demo seller:{" "}
        <span className="font-medium text-ink">{DEMO_SELLER.email}</span> /{" "}
        <span className="font-medium text-ink">{DEMO_SELLER.password}</span>
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
