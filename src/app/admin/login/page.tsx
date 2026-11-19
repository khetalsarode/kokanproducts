"use client";

import { Suspense } from "react";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { RoleLoginForm } from "@/components/RoleLoginForm";

function Inner() {
  return (
    <RoleAuthShell role="admin" mode="login">
      <p className="mb-4 text-sm text-ink/55">
        Use the exact email and password saved in Cursor Secrets as{" "}
        <span className="font-medium text-ink">SEED_ADMIN_EMAIL</span> and{" "}
        <span className="font-medium text-ink">SEED_ADMIN_PASSWORD</span>.
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
