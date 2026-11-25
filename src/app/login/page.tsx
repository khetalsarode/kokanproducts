"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { RolePortalSelect } from "@/components/RolePortalSelect";

export default function LoginHubPage() {
  return (
    <div className="section !pt-10 max-w-lg">
      <div className="rounded-2xl border border-sea/10 bg-gradient-to-br from-foam via-white/80 to-sand/40 p-6 shadow-[0_20px_50px_-28px_rgba(12,74,70,0.45)] sm:p-8">
        <BrandLogo href="/" />
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">KonkanProducts</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Choose your role</h1>
        <p className="mt-2 text-ink/60">
          Select Customer, Seller, or Admin — you’ll be taken to that portal’s dedicated sign-in
          page automatically.
        </p>

        <div className="mt-8 rounded-xl border border-white/70 bg-white/75 p-4 sm:p-5">
          <RolePortalSelect mode="login" label="Sign in as" />
        </div>

        <div className="mt-4 rounded-xl border border-white/70 bg-white/55 p-4 sm:p-5">
          <RolePortalSelect mode="register" label="Register as" />
        </div>
      </div>
    </div>
  );
}
