"use client";

import Link from "next/link";
import { RoleAuthShell } from "@/components/RoleAuthShell";
import { DEMO_ADMIN } from "@/lib/demoCredentials";

export default function AdminRegisterPage() {
  return (
    <RoleAuthShell role="admin" mode="register">
      <p className="text-sm text-ink/65">
        Admin accounts are not self-registered. Sign in with the demo admin
        credentials:{" "}
        <span className="font-medium text-ink">{DEMO_ADMIN.email}</span> /{" "}
        <span className="font-medium text-ink">{DEMO_ADMIN.password}</span>.
      </p>
      <Link href="/admin/login" className="btn-primary mt-6 inline-flex">
        Go to admin sign in
      </Link>
    </RoleAuthShell>
  );
}
