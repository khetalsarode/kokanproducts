"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const portals = [
  {
    role: "Customer",
    href: "/customer/login",
    register: "/customer/register",
    text: "Shop, checkout, and track orders with email or mobile sign-in.",
    showRegister: true,
  },
  {
    role: "Seller",
    href: "/seller/login",
    register: "/seller/register",
    text: "List products and fulfil orders after admin approval.",
    showRegister: true,
  },
  {
    role: "Admin",
    href: "/admin/login",
    register: null,
    text: "Secure operations console — authorised accounts only.",
    showRegister: false,
  },
] as const;

export default function LoginHubPage() {
  return (
    <div className="section !pt-10 max-w-2xl">
      <BrandLogo href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">KonkanProducts</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Sign-in portals</h1>
      <p className="mt-2 text-ink/60">
        Each role has its own dedicated login and registration pages — no shared tab switcher.
      </p>

      <div className="mt-8 grid gap-4">
        {portals.map((p) => (
          <div
            key={p.role}
            className="rounded-2xl border border-sea/15 bg-white/60 px-5 py-5 shadow-[0_16px_40px_-28px_rgba(12,74,70,0.4)]"
          >
            <h2 className="font-display text-2xl text-ink">{p.role}</h2>
            <p className="mt-1 text-sm text-ink/60">{p.text}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={p.href} className="btn-primary">
                {p.role} sign in
              </Link>
              {p.showRegister && p.register ? (
                <Link href={p.register} className="btn-outline">
                  Register
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
