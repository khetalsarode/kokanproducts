"use client";

import Link from "next/link";
import { RoleAuthShell } from "@/components/RoleAuthShell";

export default function AdminRegisterPage() {
  return (
    <RoleAuthShell role="admin" mode="register">
      <p className="text-sm text-ink/65">
        Admin accounts are not self-registered. Sign in with credentials from
        Cursor Secrets (
        <span className="font-medium text-ink">SEED_ADMIN_EMAIL</span> /{" "}
        <span className="font-medium text-ink">SEED_ADMIN_PASSWORD</span>).
      </p>
      <Link href="/admin/login" className="btn-primary mt-6 inline-flex">
        Go to admin sign in
      </Link>
    </RoleAuthShell>
  );
}
