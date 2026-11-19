import { Suspense } from "react";
import { ProductsClient } from "./ProductsClient";

export const metadata = {
  title: "Shop",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading pantry…</div>}>
      <ProductsClient />
    </Suspense>
  );
}
