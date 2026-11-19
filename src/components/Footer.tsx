import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-sea/10 bg-sea text-foam">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <BrandLogo light href="/" />
          <p className="mt-3 max-w-xs text-sm text-foam/75">
            Authentic Konkan Food · Direct from Source · To Your Home
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-mango/90">
            From Konkan, For the World
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-foam/50">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-foam/85">
            <li>
              <Link href="/products" className="hover:text-white">
                All products
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-white">
                Track orders
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-white">
                Returns & refunds
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-white">
                Profile & addresses
              </Link>
            </li>
            <li>
              <Link href="/seller/register" className="hover:text-white">
                Sell with us
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-foam/50">Trust</p>
          <ul className="mt-3 space-y-2 text-sm text-foam/85">
            <li>FSSAI-aligned sellers</li>
            <li>Internal stock & marketplace dispatch</li>
            <li>Cash on Delivery available</li>
            <li className="text-foam/55">Online payments via Cashfree sandbox</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-foam/10 py-4 text-center text-xs text-foam/45">
        © 2026 KonkanProducts.com · Sample catalog demo
      </div>
    </footer>
  );
}
