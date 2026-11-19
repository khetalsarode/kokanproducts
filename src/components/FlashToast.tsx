"use client";

import { useShop } from "@/context/ShopContext";

export function FlashToast() {
  const { flash } = useShop();
  if (!flash) return null;
  return (
    <div className="flash-toast" role="status">
      {flash}
    </div>
  );
}
