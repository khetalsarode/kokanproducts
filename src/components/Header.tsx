"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useShop } from "@/context/ShopContext";

const links = [
  { href: "/products", label: "Shop" },
  { href: "/products?category=kokum", label: "Kokum" },
  { href: "/products?category=seafood", label: "Seafood" },
  { href: "/products?category=spices", label: "Spices" },
  { href: "/orders", label: "Orders" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, wishlist, ready } = useShop();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const showCartCount = ready && cartCount > 0;
  const showWishCount = ready && wishlist.length > 0;

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
        <Link href="/" className="group flex items-center gap-2">
          <span className="logo-mark" aria-hidden />
          <span className="font-display text-xl tracking-tight text-sea sm:text-2xl">
            KokanProducts
          </span>
        </Link>
        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-md md:flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search kokum, hapus, bombil…"
            className="field w-full !py-2"
            aria-label="Search products"
          />
        </form>
        <nav className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
          <Link href="/wishlist" className="nav-icon" aria-label="Wishlist">
            ♡<span className="sr-only">Wishlist</span>
            {showWishCount && <em>{wishlist.length}</em>}
          </Link>
          <Link href="/account" className="hidden text-ink/70 hover:text-sea sm:inline">
            Account
          </Link>
          <Link href="/cart" className="nav-icon" aria-label="Cart">
            Bag
            {showCartCount && <em>{cartCount}</em>}
          </Link>
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
          <span className="ml-auto text-xs text-ink/40 self-center">
            Seller / Admin portals — coming soon
          </span>
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
            <Link href="/account" onClick={() => setOpen(false)} className="py-1 text-sea">
              Account
            </Link>
            <Link href="/returns" onClick={() => setOpen(false)} className="py-1 text-sea">
              Returns
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
