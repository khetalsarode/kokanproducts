"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const portals = [
  {
    role: "Customer",
    href: "/customer/login",
    register: "/customer/register",
    dash: "/account",
    text: "Shop, checkout, and track orders.",
  },
  {
    role: "Seller",
    href: "/seller/login",
    register: "/seller/register",
    dash: "/seller",
    text: "List products and fulfill your lines.",
  },
  {
    role: "Admin",
    href: "/admin/login",
    register: "/admin/register",
    dash: "/admin",
    text: "Catalogue, users, and all orders.",
  },
] as const;

export default function LoginHubPage() {
  return (
    <div className="section !pt-10 max-w-2xl">
      <BrandLogo href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">KonkanProducts</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Choose your portal</h1>
      <p className="mt-2 text-ink/60">
        Customer, seller, and admin each have their own sign-in and registration.
      </p>

      <div className="mt-8 grid gap-4">
        {portals.map((p) => (
          <div
            key={p.role}
            className="rounded-sm border border-sea/15 bg-white/55 px-5 py-4"
          >
            <h2 className="font-display text-2xl text-ink">{p.role}</h2>
            <p className="mt-1 text-sm text-ink/60">{p.text}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={p.href} className="btn-primary">
                Sign in
              </Link>
              <Link href={p.register} className="btn-outline">
                Register
              </Link>
              <Link
                href={p.dash}
                className="self-center text-sm text-sea hover:underline"
              >
                {p.role} home →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
