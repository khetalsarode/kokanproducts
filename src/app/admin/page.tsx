"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/types";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  shopName?: string | null;
  shopApproved?: boolean | null;
};

const STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default function AdminPage() {
  const { customer, ready, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<(Order & { paymentStatus?: string })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<"orders" | "products" | "users">("orders");
  const [form, setForm] = useState({
    id: "",
    name: "",
    shortName: "",
    category: "cashews",
    price: "299",
    mrp: "349",
    stock: "20",
    imageUrl: "",
    description: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!customer) {
      router.replace("/login?next=/admin");
      return;
    }
    if (customer.role !== "admin") {
      router.replace("/");
    }
  }, [ready, customer, router]);

  async function load() {
    const [o, p, u] = await Promise.all([
      fetch("/api/admin/orders", { cache: "no-store" }),
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
    ]);
    if (o.ok) setOrders(((await o.json()) as { orders: typeof orders }).orders);
    if (p.ok) setProducts(((await p.json()) as { products: Product[] }).products);
    if (u.ok) setUsers(((await u.json()) as { users: AdminUser[] }).users);
  }

  useEffect(() => {
    if (customer?.role === "admin") void load();
  }, [customer]);

  async function setStatus(id: string, status: OrderStatus) {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function onAddProduct(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id || undefined,
        name: form.name,
        shortName: form.shortName || form.name,
        category: form.category,
        price: Number(form.price),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        description: form.description,
        fulfillment: "internal",
      }),
    });
    setMsg(res.ok ? (form.id ? "Product updated." : "Product saved.") : "Could not save product.");
    if (res.ok) {
      setForm({
        id: "",
        name: "",
        shortName: "",
        category: "cashews",
        price: "299",
        mrp: "349",
        stock: "20",
        imageUrl: "",
        description: "",
      });
    }
    await load();
  }

  function editProduct(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      category: p.category,
      price: String(p.price),
      mrp: String(p.mrp),
      stock: String(p.stock),
      imageUrl: p.images[0] || "",
      description: p.description,
    });
    setTab("products");
    setMsg(`Editing ${p.name}`);
  }

  if (!ready || !customer || customer.role !== "admin") {
    return <div className="section text-ink/50">Loading admin…</div>;
  }

  return (
    <div className="section !pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BrandLogo href="/" size="sm" />
          <h1 className="mt-4 font-display text-4xl text-ink">Admin dashboard</h1>
          <p className="mt-2 text-ink/60">Manage products, sellers, customers, and every order.</p>
        </div>
        <button type="button" className="btn-outline" onClick={() => void logout()}>
          Sign out
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["orders", "products", "users"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${tab === t ? "!bg-sea !text-foam" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="mt-8 space-y-3">
          {orders.length === 0 && <p className="text-ink/50">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="rounded-sm border border-sea/10 bg-white/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="font-medium text-sea hover:underline">
                  {o.id}
                </Link>
                <span className="text-sm">{formatINR(o.total)}</span>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {o.paymentMethod.toUpperCase()} · {o.paymentStatus || "pending"} · {o.items.length} items
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm">
                Status
                <select
                  className="field !py-1"
                  value={o.status}
                  onChange={(e) => void setStatus(o.id, e.target.value as OrderStatus)}
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
      )}

      {tab === "products" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form onSubmit={onAddProduct} className="grid gap-3 rounded-sm bg-white/55 p-4">
            <h2 className="font-display text-xl">
              {form.id ? "Update product" : "Add product"}
            </h2>
            <p className="text-xs text-ink/50">
              Changes save to the database and show on the shop immediately.
            </p>
            <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="field" placeholder="Short name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
            <input className="field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <input className="field" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input className="field" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
              <input className="field" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <input className="field" placeholder="Image URL (/products/...)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <textarea className="field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            {msg && <p className="text-sm text-lagoon">{msg}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary w-fit">
                {form.id ? "Update product" : "Save product"}
              </button>
              {form.id && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    setForm({
                      id: "",
                      name: "",
                      shortName: "",
                      category: "cashews",
                      price: "299",
                      mrp: "349",
                      stock: "20",
                      imageUrl: "",
                      description: "",
                    })
                  }
                >
                  Clear
                </button>
              )}
            </div>
          </form>
          <ul className="space-y-2 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 rounded-sm border border-sea/10 bg-white/40 px-3 py-2">
                <button type="button" className="text-left" onClick={() => editProduct(p)}>
                  {p.name}
                  <span className="block text-xs text-ink/45">
                    {formatINR(p.price)} · stock {p.stock} · click to edit
                  </span>
                </button>
                <button
                  type="button"
                  className="text-spice hover:underline"
                  onClick={() =>
                    void fetch(`/api/admin/products?id=${encodeURIComponent(p.id)}`, {
                      method: "DELETE",
                    }).then(load)
                  }
                >
                  Deactivate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "users" && (
        <ul className="mt-8 space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-sm border border-sea/10 bg-white/55 px-4 py-3 text-sm">
              <p className="font-medium">
                {u.name} · {u.role}
              </p>
              <p className="text-ink/55">
                {u.email}
                {u.shopName ? ` · ${u.shopName}` : ""}
              </p>
              <p className="text-xs text-ink/40">
                status: {u.status}
                {u.role === "seller"
                  ? ` · shop ${u.shopApproved ? "approved" : "pending approval"}`
                  : ""}
              </p>
              {u.role === "seller" && !u.shopApproved && (
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-sea hover:underline"
                  onClick={() =>
                    void fetch("/api/admin/users", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ id: u.id, approved: true }),
                    }).then(load)
                  }
                >
                  Approve seller
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
