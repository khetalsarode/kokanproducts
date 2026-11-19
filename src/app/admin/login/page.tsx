"use client";

import { Suspense } from "react";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { RoleLoginForm } from "@/components/RoleLoginForm";
import { DEMO_ADMIN } from "@/lib/demoCredentials";

function Inner() {
  return (
    <RoleAuthShell role="admin" mode="login">
      <p className="mb-4 text-sm text-ink/55">
        Demo admin:{" "}
        <span className="font-medium text-ink">{DEMO_ADMIN.email}</span> /{" "}
        <span className="font-medium text-ink">{DEMO_ADMIN.password}</span>
      </p>
      <RoleLoginForm role="admin" />
    </RoleAuthShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
