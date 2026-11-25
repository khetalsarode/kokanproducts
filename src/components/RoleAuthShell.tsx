import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { RolePortalSelect } from "@/components/RolePortalSelect";
import type { AuthRole } from "@/context/AuthContext";

const copy: Record<
  AuthRole,
  {
    eyebrow: string;
    titleLogin: string;
    titleRegister: string;
    blurbLogin: string;
    blurbRegister: string;
    home: string;
    accentClass: string;
  }
> = {
  customer: {
    eyebrow: "Customer portal",
    titleLogin: "Welcome back",
    titleRegister: "Create your shopper account",
    blurbLogin: "Sign in with email or mobile to checkout, save addresses, and track orders.",
    blurbRegister:
      "Register with email verification or mobile OTP — then shop Konkan staples.",
    home: "/account",
    accentClass: "from-lagoon/15 via-foam to-sand/40",
  },
  seller: {
    eyebrow: "Seller portal",
    titleLogin: "Seller sign in",
    titleRegister: "Apply to sell with us",
    blurbLogin: "Access your shop, warehouse stock, and order desk after admin approval.",
    blurbRegister:
      "Share personal and business details. New shops stay pending until an admin approves you.",
    home: "/seller",
    accentClass: "from-mango/20 via-foam to-mist/50",
  },
  admin: {
    eyebrow: "Admin portal",
    titleLogin: "Operations console",
    titleRegister: "Admin access",
    blurbLogin: "Secure sign-in for authorised KonkanProducts administrators only.",
    blurbRegister: "Admin accounts are provisioned — public registration is closed.",
    home: "/admin",
    accentClass: "from-sea/20 via-foam to-mist/40",
  },
};

export function RoleAuthShell({
  role,
  mode,
  children,
}: {
  role: AuthRole;
  mode: "login" | "register";
  children: ReactNode;
}) {
  const c = copy[role];
  const loginHref =
    role === "customer" ? "/customer/login" : role === "seller" ? "/seller/login" : "/admin/login";
  const registerHref =
    role === "customer" ? "/customer/register" : role === "seller" ? "/seller/register" : null;

  return (
    <div className="section !pt-8 !pb-16">
      <div
        className={`mx-auto max-w-lg overflow-hidden rounded-2xl border border-sea/10 bg-gradient-to-br ${c.accentClass} p-6 shadow-[0_20px_50px_-28px_rgba(12,74,70,0.45)] sm:p-8`}
      >
        <BrandLogo href="/" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-sea/70">
          {c.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
          {mode === "login" ? c.titleLogin : c.titleRegister}
        </h1>
        <p className="mt-2 text-sm text-ink/60 sm:text-base">
          {mode === "login" ? c.blurbLogin : c.blurbRegister}
        </p>

        <div className="mt-6">
          <RolePortalSelect currentRole={role} mode={mode} />
        </div>

        <div className="mt-6 rounded-xl border border-white/60 bg-white/70 p-4 backdrop-blur-sm sm:p-5">
          {children}
        </div>

        <div className="mt-6 space-y-2 text-sm text-ink/60">
          {mode === "login" ? (
            registerHref ? (
              <p>
                Need an account?{" "}
                <Link href={registerHref} className="font-medium text-sea hover:underline">
                  {role === "seller" ? "Register as a seller" : "Create a customer account"}
                </Link>
              </p>
            ) : (
              <p className="text-ink/50">Admin registration is not available publicly.</p>
            )
          ) : (
            <p>
              Already registered?{" "}
              <Link href={loginHref} className="font-medium text-sea hover:underline">
                Sign in
              </Link>
            </p>
          )}
          <p className="text-xs text-ink/45">
            <Link href={c.home} className="hover:text-sea hover:underline">
              {c.eyebrow.replace(" portal", "")} home
            </Link>
            {role === "customer" && (
              <>
                {" · "}
                <Link href="/seller/login" className="hover:text-sea hover:underline">
                  Seller sign in
                </Link>
              </>
            )}
            {role === "seller" && (
              <>
                {" · "}
                <Link href="/customer/login" className="hover:text-sea hover:underline">
                  Customer sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
