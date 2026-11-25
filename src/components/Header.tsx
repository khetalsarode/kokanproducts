"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { dashboardPathForRole, useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";

const links = [
  { href: "/products", label: "Shop" },
  { href: "/products?category=kokum", label: "Kokum" },
  { href: "/products?category=cashews", label: "Cashews" },
  { href: "/products?category=spices", label: "Spices" },
  { href: "/orders", label: "Orders" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, ready: authReady } = useAuth();
  const { cartCount, wishlist, ready } = useShop();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const isStaff =
    customer?.role === "admin" ||
    customer?.role === "seller" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller");
  const showShopActions = !isStaff;
  const showCartCount = showShopActions && ready && cartCount > 0;
  const showWishCount = showShopActions && ready && wishlist.length > 0;
  const dash = dashboardPathForRole(customer?.role);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-sea/10 bg-foam/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="sm:hidden text-sea"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          ☰
        </button>
        <BrandLogo />
        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-md md:flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search kokum, cashews, hapus…"
            className="field w-full !py-2"
            aria-label="Search products"
          />
        </form>
        <nav className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
          {showShopActions && (
            <Link href="/wishlist" className="nav-icon" aria-label="Wishlist">
              ♡<span className="sr-only">Wishlist</span>
              {showWishCount && <em>{wishlist.length}</em>}
            </Link>
          )}
          {authReady && customer ? (
            <Link href={dash} className="hidden text-ink/70 hover:text-sea sm:inline">
              {customer.role === "admin"
                ? "Admin"
                : customer.role === "seller"
                  ? "Seller"
                  : customer.name.split(" ")[0]}
            </Link>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/customer/login" className="text-ink/70 hover:text-sea">
                Customer
              </Link>
              <Link href="/seller/login" className="text-ink/70 hover:text-sea">
                Seller
              </Link>
              <Link href="/login" className="text-ink/45 hover:text-sea">
                All portals
              </Link>
            </div>
          )}
          {showShopActions && (
            <Link href="/cart" className="nav-icon" aria-label="Cart">
              Bag
              {showCartCount && <em>{cartCount}</em>}
            </Link>
          )}
        </nav>
      </div>
      <div className="hidden border-t border-sea/5 sm:block">
        <nav className="mx-auto flex max-w-6xl gap-6 px-6 py-2 text-sm">
          {links.map((l) => {
            const base = l.href.split("?")[0];
            const active =
              l.href === "/products"
                ? pathname.startsWith("/products")
                : pathname === base || pathname.startsWith(`${base}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`tracking-wide transition ${
                  active ? "text-sea font-medium" : "text-ink/65 hover:text-sea"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {!customer && (
            <div className="ml-auto flex items-center gap-3 self-center text-xs font-medium">
              <Link href="/customer/register" className="text-spice hover:underline">
                Customer register
              </Link>
              <Link href="/seller/register" className="text-sea hover:underline">
                Sell with us
              </Link>
            </div>
          )}
        </nav>
      </div>
      {open && (
        <div className="border-t border-sea/10 bg-foam px-4 py-4 sm:hidden">
          <form onSubmit={onSearch} className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="field w-full"
            />
          </form>
          <div className="flex flex-col gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-1 text-sea"
              >
                {l.label}
              </Link>
            ))}
            {customer ? (
              <Link href={dash} onClick={() => setOpen(false)} className="py-1 text-sea">
                {customer.role === "admin"
                  ? "Admin"
                  : customer.role === "seller"
                    ? "Seller desk"
                    : "Account"}
              </Link>
            ) : (
              <>
                <Link
                  href="/customer/login"
                  onClick={() => setOpen(false)}
                  className="py-1 text-sea"
                >
                  Customer sign in
                </Link>
                <Link
                  href="/customer/register"
                  onClick={() => setOpen(false)}
                  className="py-1 text-sea"
                >
                  Customer register
                </Link>
                <Link href="/seller/login" onClick={() => setOpen(false)} className="py-1 text-sea">
                  Seller sign in
                </Link>
                <Link
                  href="/seller/register"
                  onClick={() => setOpen(false)}
                  className="py-1 text-sea"
                >
                  Seller register
                </Link>
                <Link href="/admin/login" onClick={() => setOpen(false)} className="py-1 text-sea">
                  Admin sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
