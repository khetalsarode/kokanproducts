"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { applyCoupon } from "@/data/coupons";
import { defaultAddresses } from "@/data/addresses";
import { getProduct, products } from "@/data/products";
import { getSeller } from "@/data/sellers";
import { useAuth } from "@/context/AuthContext";
import type {
  Address,
  CartItem,
  Order,
  OrderStatus,
  PaymentMethod,
} from "@/types";

const CART_KEY = "kp-cart";
const WISH_KEY = "kp-wishlist";
const ORDERS_KEY = "kp-orders";
const ADDR_KEY = "kp-addresses";

type ShopContextValue = {
  ready: boolean;
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  addresses: Address[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  placeOrder: (input: {
    addressId: string;
    paymentMethod: PaymentMethod;
    couponCode?: string;
  }) => Order | null;
  getOrder: (id: string) => Order | undefined;
  advanceOrderDemo: (id: string) => void;
  saveAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  flash: string | null;
  setFlash: (msg: string | null) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

function makeOrderId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `KP${n}`;
}

function makeTrackingId(): string {
  return `DTDC${Math.floor(100000000 + Math.random() * 900000000)}`;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, customer } = useAuth();
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>(defaultAddresses);
  const [flash, setFlash] = useState<string | null>(null);
  const accountSynced = useRef<string | null>(null);
  const skipWishPersist = useRef(false);
  const skipAddrPersist = useRef(false);
  const skipOrderPersist = useRef(false);

  useEffect(() => {
    setCart(loadJSON(CART_KEY, []));
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function hydrate() {
      if (!customer) {
        accountSynced.current = null;
        skipWishPersist.current = true;
        skipAddrPersist.current = true;
        skipOrderPersist.current = true;
        setWishlist(loadJSON(WISH_KEY, []));
        setOrders(loadJSON(ORDERS_KEY, []));
        setAddresses(loadJSON(ADDR_KEY, defaultAddresses));
        setReady(true);
        queueMicrotask(() => {
          skipWishPersist.current = false;
          skipAddrPersist.current = false;
          skipOrderPersist.current = false;
        });
        return;
      }

      if (accountSynced.current === customer.id) {
        setReady(true);
        return;
      }

      try {
        const guestWish = loadJSON<string[]>(WISH_KEY, []);
        const [wishRes, addrRes, orderRes] = await Promise.all([
          fetch("/api/account/wishlist", { cache: "no-store" }),
          fetch("/api/account/addresses", { cache: "no-store" }),
          fetch("/api/account/orders", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const wishData = wishRes.ok
          ? ((await wishRes.json()) as { wishlist: string[] })
          : { wishlist: [] };
        const addrData = addrRes.ok
          ? ((await addrRes.json()) as { addresses: Address[] })
          : { addresses: [] };
        const orderData = orderRes.ok
          ? ((await orderRes.json()) as { orders: Order[] })
          : { orders: [] };

        const mergedWish = [...new Set([...wishData.wishlist, ...guestWish])];
        skipWishPersist.current = true;
        skipAddrPersist.current = true;
        skipOrderPersist.current = true;
        setWishlist(mergedWish);
        setAddresses(
          addrData.addresses.length > 0 ? addrData.addresses : defaultAddresses,
        );
        setOrders(orderData.orders);
        accountSynced.current = customer.id;

        if (mergedWish.length !== wishData.wishlist.length) {
          await fetch("/api/account/wishlist", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ wishlist: mergedWish }),
          });
        }
      } catch {
        if (!cancelled) {
          setWishlist(loadJSON(WISH_KEY, []));
          setOrders(loadJSON(ORDERS_KEY, []));
          setAddresses(loadJSON(ADDR_KEY, defaultAddresses));
        }
      } finally {
        if (!cancelled) {
          setReady(true);
          queueMicrotask(() => {
            skipWishPersist.current = false;
            skipAddrPersist.current = false;
            skipOrderPersist.current = false;
          });
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [authReady, customer]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!ready || skipWishPersist.current) return;
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
    if (!customer) return;
    const t = window.setTimeout(() => {
      void fetch("/api/account/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wishlist }),
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [wishlist, ready, customer]);

  useEffect(() => {
    if (!ready || skipOrderPersist.current) return;
    if (!customer) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  }, [orders, ready, customer]);

  useEffect(() => {
    if (!ready || skipAddrPersist.current) return;
    if (!customer) {
      localStorage.setItem(ADDR_KEY, JSON.stringify(addresses));
    }
  }, [addresses, ready, customer]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.qty, 0),
    [cart],
  );

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = getProduct(item.productId);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  }, [cart]);

  const addToCart = useCallback((productId: string, qty = 1) => {
    const product = getProduct(productId);
    if (!product || product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, qty: Math.min(i.qty + qty, product.stock) }
            : i,
        );
      }
      return [...prev, { productId, qty: Math.min(qty, product.stock) }];
    });
    setFlash(`Added ${product.shortName} to cart`);
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    const product = getProduct(productId);
    if (!product) return;
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty: Math.min(qty, product.stock) }
          : i,
      ),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        setFlash("Removed from wishlist");
        return prev.filter((id) => id !== productId);
      }
      setFlash("Saved to wishlist");
      return [...prev, productId];
    });
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  );

  const placeOrder = useCallback(
    (input: {
      addressId: string;
      paymentMethod: PaymentMethod;
      couponCode?: string;
    }) => {
      if (cart.length === 0) return null;
      const address = addresses.find((a) => a.id === input.addressId);
      if (!address) return null;

      const subtotal = cartSubtotal;
      let discount = 0;
      if (input.couponCode) {
        const result = applyCoupon(input.couponCode, subtotal);
        if (result.ok) discount = result.discount;
      }
      const deliveryFee = subtotal - discount >= 999 ? 0 : 49;
      const total = Math.max(0, subtotal - discount + deliveryFee);

      const items = cart
        .map((item) => {
          const p = getProduct(item.productId);
          if (!p) return null;
          return {
            productId: p.id,
            name: p.name,
            qty: item.qty,
            price: p.price,
            fulfillment: p.fulfillment,
            sellerName: getSeller(p.sellerId).name,
          };
        })
        .filter(Boolean) as Order["items"];

      const eta = new Date();
      eta.setDate(eta.getDate() + 4);

      const order: Order = {
        id: makeOrderId(),
        createdAt: new Date().toISOString(),
        status: "placed",
        items,
        address,
        paymentMethod: input.paymentMethod,
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode: input.couponCode,
        trackingId: makeTrackingId(),
        courier: "Delhivery",
        estimatedDelivery: eta.toISOString(),
      };

      setOrders((prev) => [order, ...prev]);
      setCart([]);
      setFlash(`Order ${order.id} placed`);
      if (customer) {
        void fetch("/api/account/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order }),
        });
      }
      return order;
    },
    [addresses, cart, cartSubtotal, customer],
  );

  const getOrder = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  );

  const advanceOrderDemo = useCallback(
    (id: string) => {
      setOrders((prev) => {
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const idx = STATUS_FLOW.indexOf(o.status);
          if (idx < 0 || idx >= STATUS_FLOW.length - 1) return o;
          return { ...o, status: STATUS_FLOW[idx + 1] };
        });
        const updated = next.find((o) => o.id === id);
        if (customer && updated) {
          void fetch("/api/account/orders", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ order: updated }),
          });
        }
        return next;
      });
    },
    [customer],
  );

  const saveAddress = useCallback(
    (address: Address) => {
      setAddresses((prev) => {
        const exists = prev.some((a) => a.id === address.id);
        if (exists) {
          return prev.map((a) => (a.id === address.id ? address : a));
        }
        return [...prev, address];
      });
      if (customer) {
        void fetch("/api/account/addresses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(address),
        });
      }
    },
    [customer],
  );

  const removeAddress = useCallback(
    (id: string) => {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (customer) {
        void fetch(`/api/account/addresses?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      }
    },
    [customer],
  );

  const value: ShopContextValue = {
    ready: ready && authReady,
    cart,
    wishlist,
    orders,
    addresses,
    cartCount,
    cartSubtotal,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isWishlisted,
    placeOrder,
    getOrder,
    advanceOrderDemo,
    saveAddress,
    removeAddress,
    flash,
    setFlash,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export function useCatalog() {
  return products;
}
