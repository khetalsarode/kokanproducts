import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import type { AuthRole } from "@/context/AuthContext";

const copy: Record<
  AuthRole,
  { eyebrow: string; title: string; blurb: string; home: string }
> = {
  customer: {
    eyebrow: "Customer",
    title: "Shop & track orders",
    blurb: "Sign in to checkout, save addresses, and follow deliveries.",
    home: "/account",
  },
  seller: {
    eyebrow: "Seller",
    title: "Manage your Konkan shop",
    blurb: "Sign in to list products and update orders for your catalogue.",
    home: "/seller",
  },
  admin: {
    eyebrow: "Admin",
    title: "Operations console",
    blurb: "Sign in to manage catalogue, users, seller approvals, and orders.",
    home: "/admin",
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
    role === "customer"
      ? "/customer/register"
      : role === "seller"
        ? "/seller/register"
        : "/admin/register";

  return (
    <div className="section !pt-10 max-w-lg">
      <BrandLogo href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-lagoon">{c.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl text-ink">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-ink/60">{c.blurb}</p>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {(
          [
            ["customer", "Customer"],
            ["seller", "Seller"],
            ["admin", "Admin"],
          ] as const
        ).map(([r, label]) => (
          <Link
            key={r}
            href={
              mode === "login"
                ? r === "customer"
                  ? "/customer/login"
                  : r === "seller"
                    ? "/seller/login"
                    : "/admin/login"
                : r === "customer"
                  ? "/customer/register"
                  : r === "seller"
                    ? "/seller/register"
                    : "/admin/register"
            }
            className={`rounded-sm border px-3 py-1.5 transition ${
              r === role
                ? "border-sea bg-white/80 text-sea"
                : "border-sea/15 text-ink/55 hover:border-sea/40"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-8">{children}</div>

      <p className="mt-6 text-sm text-ink/60">
        {mode === "login" ? (
          <>
            Need an account?{" "}
            <Link href={registerHref} className="font-medium text-sea hover:underline">
              Register as {c.eyebrow.toLowerCase()}
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href={loginHref} className="font-medium text-sea hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-ink/50">
        <Link href="/login" className="hover:text-sea hover:underline">
          All sign-in options
        </Link>
        {" · "}
        <Link href={c.home} className="hover:text-sea hover:underline">
          {c.eyebrow} home
        </Link>
      </p>
    </div>
  );
}
