"use client";

import { useRouter } from "next/navigation";
import type { AuthRole } from "@/context/AuthContext";

const OPTIONS: {
  role: AuthRole;
  label: string;
  login: string;
  register: string | null;
}[] = [
  {
    role: "customer",
    label: "Customer",
    login: "/customer/login",
    register: "/customer/register",
  },
  {
    role: "seller",
    label: "Seller",
    login: "/seller/login",
    register: "/seller/register",
  },
  {
    role: "admin",
    label: "Admin",
    login: "/admin/login",
    register: null,
  },
];

export function portalHref(role: AuthRole, mode: "login" | "register"): string {
  const opt = OPTIONS.find((o) => o.role === role)!;
  if (mode === "register") {
    return opt.register || opt.login;
  }
  return opt.login;
}

/** Role picker that navigates to a dedicated portal URL (no in-page tab content). */
export function RolePortalSelect({
  currentRole,
  mode,
  label = "I am a",
}: {
  currentRole?: AuthRole;
  mode: "login" | "register";
  label?: string;
}) {
  const router = useRouter();

  function go(role: AuthRole) {
    const href = portalHref(role, mode);
    if (typeof window !== "undefined" && window.location.pathname === href) return;
    router.push(href);
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = currentRole === opt.role;
          const disabled = mode === "register" && opt.role === "admin";
          return (
            <button
              key={opt.role}
              type="button"
              disabled={disabled}
              onClick={() => go(opt.role)}
              aria-pressed={active}
              title={
                disabled
                  ? "Admin accounts are not publicly registered"
                  : `Open ${opt.label} ${mode}`
              }
              className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-sea bg-sea text-foam shadow-sm"
                  : disabled
                    ? "cursor-not-allowed border-sea/10 text-ink/30"
                    : "border-sea/15 bg-white/70 text-ink/70 hover:border-sea/40 hover:text-sea"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink/45">
        Selecting a role opens that portal’s dedicated {mode} page.
      </p>
    </div>
  );
}
