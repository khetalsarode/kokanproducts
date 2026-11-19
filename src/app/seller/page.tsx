"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/types";

const STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default function SellerPage() {
  const { customer, ready, logout } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<(Order & { paymentStatus?: string })[]>([]);
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    category: "mango",
    price: "249",
    mrp: "299",
    stock: "15",
    imageUrl: "",
    description: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!customer) {
      router.replace("/login?next=/seller");
      return;
    }
    if (customer.role !== "seller" && customer.role !== "admin") {
      router.replace("/account");
    }
  }, [ready, customer, router]);

  async function load() {
    const [p, o] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/orders", { cache: "no-store" }),
    ]);
    if (p.ok) setProducts(((await p.json()) as { products: Product[] }).products);
    if (o.ok) {
      const all = ((await o.json()) as { orders: typeof orders }).orders;
      // Sellers only see orders containing their catalog products
      const mine = new Set(products.map((x) => x.id));
      const filtered = all.filter((ord) =>
        ord.items.some((i) => mine.has(i.productId) || i.sellerName === customer?.id),
      );
      setOrders(customer?.role === "admin" ? all : filtered.length ? filtered : all);
    }
  }

  useEffect(() => {
    if (customer?.role === "seller" || customer?.role === "admin") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  useEffect(() => {
    if (products.length && customer?.role === "seller") {
      void fetch("/api/admin/orders", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { orders: typeof orders }) => {
          const mine = new Set(products.map((x) => x.id));
          setOrders(
            data.orders.filter((ord) =>
              ord.items.some((i) => mine.has(i.productId) || i.sellerName === customer.id),
            ),
          );
        });
    }
  }, [products, customer]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        shortName: form.shortName || form.name,
        category: form.category,
        price: Number(form.price),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        description: form.description,
      }),
    });
    setMsg(res.ok ? "Product saved to your shop." : "Could not save product.");
    await load();
  }

  if (!ready || !customer || (customer.role !== "seller" && customer.role !== "admin")) {
    return <div className="section text-ink/50">Loading seller desk…</div>;
  }

  return (
    <div className="section !pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BrandLogo href="/" size="sm" />
          <h1 className="mt-4 font-display text-4xl text-ink">Seller dashboard</h1>
          <p className="mt-2 text-ink/60">
            {customer.shopName || customer.name} — manage your products, stock, and order statuses.
          </p>
          {customer.shopApproved === false && (
            <p className="mt-3 rounded-sm border border-spice/25 bg-spice/5 px-3 py-2 text-sm text-ink/70">
              Your seller account is pending admin approval. You can sign in, but catalogue and order tools stay locked until approved.
            </p>
          )}
        </div>
        <button type="button" className="btn-outline" onClick={() => void logout()}>
          Sign out
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <form onSubmit={onSave} className="grid gap-3 rounded-sm bg-white/55 p-4">
          <h2 className="font-display text-xl">Add product</h2>
          <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="field" placeholder="Short name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
          <input className="field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className="field" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className="field" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            <input className="field" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <input className="field" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <textarea className="field" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {msg && <p className="text-sm text-lagoon">{msg}</p>}
          <button type="submit" className="btn-primary w-fit">Save product</button>
        </form>

        <div>
          <h2 className="font-display text-xl">Your catalogue</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 rounded-sm border border-sea/10 bg-white/40 px-3 py-2">
                <span>
                  {p.name}
                  <span className="block text-xs text-ink/45">
                    {formatINR(p.price)} · stock {p.stock}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-spice hover:underline"
                  onClick={() =>
                    void fetch(`/api/admin/products?id=${encodeURIComponent(p.id)}`, {
                      method: "DELETE",
                    }).then(load)
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Orders for your products</h2>
        <div className="mt-4 space-y-3">
          {orders.length === 0 && <p className="text-ink/50">No related orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="rounded-sm border border-sea/10 bg-white/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="font-medium text-sea hover:underline">
                  {o.id}
                </Link>
                <span className="text-sm">{formatINR(o.total)}</span>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                Update status
                <select
                  className="field !py-1"
                  value={o.status}
                  onChange={(e) =>
                    void fetch("/api/admin/orders", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ id: o.id, status: e.target.value }),
                    }).then(load)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
