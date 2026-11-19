"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ShopProvider } from "@/context/ShopContext";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FlashToast } from "./FlashToast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShopProvider>
        <Suspense fallback={<div className="h-14 border-b border-sea/10 bg-foam/85" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
        <FlashToast />
      </ShopProvider>
    </AuthProvider>
  );
}
