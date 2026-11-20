"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { ShopProvider } from "@/context/ShopContext";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FlashToast } from "./FlashToast";

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  // Desks have their own shell — hide storefront header/footer (bag, wishlist, shop nav).
  const hideStorefrontChrome = pathname === "/admin" || pathname === "/seller";

  return (
    <>
      {!hideStorefrontChrome && (
        <Suspense fallback={<div className="h-14 border-b border-sea/10 bg-foam/85" />}>
          <Header />
        </Suspense>
      )}
      <main className="flex-1">{children}</main>
      {!hideStorefrontChrome && <Footer />}
      <FlashToast />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CatalogProvider>
        <ShopProvider>
          <Shell>{children}</Shell>
        </ShopProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
