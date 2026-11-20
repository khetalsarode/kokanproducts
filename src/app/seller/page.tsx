"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashShell } from "@/components/dashboard/DashShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/types";

type Range = "day" | "week" | "month" | "year";

type ProductRequest = {
  id: string;
  requestType: "create" | "update";
  status: "pending" | "approved" | "rejected";
  proposed: {
    name: string;
    category: string;
    price: number;
    stock: number;
    description: string;
  };
  rejectionReason: string;
  createdAt: string;
};

type SellerAnalytics = {
  kpis: {
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalProducts: number;
    activeProducts: number;
    pendingProducts: number;
    rejectedProducts: number;
    approvedProducts: number;
    availableStock: number;
    lowStockCount: number;
  };
  bestSelling: { productId: string; name: string; qty: number; revenue: number }[];
  series: { date: string; sales: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number }[];
  recentOrders: {
    id: string;
    total: number;
    status: string;
    createdAt: string;
    qty: number;
  }[];
  purchasedProducts: { name: string; qty: number; revenue: number }[];
};

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
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState<Range>("month");
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<(Order & { paymentStatus?: string })[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    shortName: "",
    category: "mango",
    price: "249",
    mrp: "299",
    stock: "15",
    imageUrl: "",
    description: "",
  });

  useEffect(() => {
    if (!ready) return;
    if (!customer) {
      router.replace("/seller/login?next=/seller");
      return;
    }
    if (customer.role !== "seller" && customer.role !== "admin") {
      router.replace("/account");
    }
  }, [ready, customer, router]);

  const approved = customer?.shopApproved !== false;

  const load = useCallback(async () => {
    const [p, o, r] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/orders", { cache: "no-store" }),
      fetch("/api/admin/product-requests?status=all", { cache: "no-store" }),
    ]);
    if (p.ok) setProducts(((await p.json()) as { products: Product[] }).products);
    if (o.ok) setOrders(((await o.json()) as { orders: typeof orders }).orders);
    if (r.ok) setRequests(((await r.json()) as { requests: ProductRequest[] }).requests);
    if (approved) {
      const a = await fetch(`/api/seller/analytics?range=${range}`, { cache: "no-store" });
      if (a.ok) setAnalytics((await a.json()) as SellerAnalytics);
    }
  }, [range, approved]);

  useEffect(() => {
    if (customer?.role === "seller" || customer?.role === "admin") void load();
  }, [customer, load]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!approved) {
      setMsg("Your seller account is pending admin approval.");
      return;
    }
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
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      pendingApproval?: boolean;
    };
    setMsg(
      res.ok
        ? data.message || "Submitted for admin approval."
        : data.error || "Could not submit product.",
    );
    if (res.ok) {
      setForm({
        id: "",
        name: "",
        shortName: "",
        category: "mango",
        price: "249",
        mrp: "299",
        stock: "15",
        imageUrl: "",
        description: "",
      });
      setTab("requests");
    }
    await load();
  }

  async function setStatus(id: string, status: OrderStatus) {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  if (!ready || !customer || (customer.role !== "seller" && customer.role !== "admin")) {
    return <div className="section text-ink/50">Loading seller desk…</div>;
  }

  const k = analytics?.kpis;
  const rejected = customer.registrationStatus === "rejected";

  return (
    <DashShell
      title="Seller workspace"
      subtitle={`${customer.shopName || customer.name} — products, orders, and performance`}
      active={tab}
      onNavigate={setTab}
      onLogout={() => void logout()}
      topRight={
        approved ? (
          <select
            className="field !w-auto !py-2"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
          >
            <option value="day">Today</option>
            <option value="week">7 days</option>
            <option value="month">30 days</option>
            <option value="year">12 months</option>
          </select>
        ) : null
      }
      nav={[
        { id: "overview", label: "Overview" },
        { id: "products", label: "My products" },
        { id: "submit", label: "Submit product" },
        { id: "requests", label: "Approval status", badge: pendingCount },
        { id: "orders", label: "Orders" },
      ]}
    >
      {!approved && (
        <div className="mb-4 rounded-xl border border-spice/25 bg-spice/5 px-4 py-3 text-sm text-ink/75">
          {rejected ? (
            <>
              Your seller registration was <strong>rejected</strong>.
              {customer.rejectionReason
                ? ` Reason: ${customer.rejectionReason}`
                : " Contact support or re-register with corrected details."}
            </>
          ) : (
            <>
              Your seller registration is <strong>pending admin approval</strong>. You can
              browse this workspace, but catalogue tools stay locked until approved.
            </>
          )}
        </div>
      )}

      {msg && (
        <p className="mb-4 rounded-xl border border-lagoon/20 bg-lagoon/5 px-3 py-2 text-sm text-ink/70">
          {msg}
        </p>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Revenue" value={formatINR(k?.totalRevenue || 0)} accent="sea" />
            <KpiCard label="Profit" value={formatINR(k?.totalProfit || 0)} accent="lagoon" />
            <KpiCard label="Orders" value={k?.totalOrders || 0} accent="mango" />
            <KpiCard label="Units sold" value={k?.totalSales || 0} />
            <KpiCard label="Active products" value={k?.activeProducts || 0} />
            <KpiCard label="Pending approvals" value={k?.pendingProducts || 0} alert accent="spice" />
            <KpiCard label="Available stock" value={k?.availableStock || 0} />
            <KpiCard
              label="Low stock alerts"
              value={k?.lowStockCount || 0}
              alert={(k?.lowStockCount || 0) > 0}
              accent="spice"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="dash-card lg:col-span-3">
              <h2 className="font-display text-xl">Revenue trend</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.series || []}>
                    <defs>
                      <linearGradient id="srev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0c4a46" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0c4a46" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7ebe4" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0c4a46"
                      fill="url(#srev)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dash-card lg:col-span-2">
              <h2 className="font-display text-xl">Low stock</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {(analytics?.lowStock || []).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-spice/5 px-3 py-2"
                  >
                    <span>{p.name}</span>
                    <StatusBadge status="rejected" label={`${p.stock} left`} />
                  </li>
                ))}
                {!analytics?.lowStock?.length && (
                  <li className="text-ink/50">Stock looks healthy.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="dash-card">
              <h2 className="font-display text-xl">Best sellers</h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.bestSelling || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7ebe4" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#1a7a72" radius={[6, 6, 0, 0]} name="Units" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dash-card">
              <h2 className="font-display text-xl">Customer purchases</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {(analytics?.purchasedProducts || []).slice(0, 8).map((p) => (
                  <li key={p.name} className="flex justify-between gap-2">
                    <span>{p.name}</span>
                    <span className="tabular-nums text-ink/55">
                      {p.qty} · {formatINR(p.revenue)}
                    </span>
                  </li>
                ))}
                {!analytics?.purchasedProducts?.length && (
                  <li className="text-ink/50">No purchases in this range.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink/45">{p.category}</p>
                  </td>
                  <td>{formatINR(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <StatusBadge status={p.stock > 0 ? "active" : "inactive"} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-xs font-semibold text-sea"
                      disabled={!approved}
                      onClick={() => {
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
                        setTab("submit");
                      }}
                    >
                      Request update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <div className="dash-empty">No published products yet.</div>}
        </div>
      )}

      {tab === "submit" && (
        <form onSubmit={onSave} className="dash-card mx-auto grid max-w-xl gap-3">
          <h2 className="font-display text-xl">
            {form.id ? "Submit product update" : "Submit new product"}
          </h2>
          <p className="text-sm text-ink/55">
            Changes go to the admin approval queue. Live listings stay unchanged until approved.
          </p>
          <input
            className="field"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={!approved}
          />
          <input
            className="field"
            placeholder="Short name"
            value={form.shortName}
            onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            disabled={!approved}
          />
          <input
            className="field"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            disabled={!approved}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="field"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              disabled={!approved}
            />
            <input
              className="field"
              placeholder="MRP"
              value={form.mrp}
              onChange={(e) => setForm({ ...form, mrp: e.target.value })}
              disabled={!approved}
            />
            <input
              className="field"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              disabled={!approved}
            />
          </div>
          <input
            className="field"
            placeholder="Image URL"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            disabled={!approved}
          />
          <textarea
            className="field"
            rows={3}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!approved}
          />
          <button type="submit" className="btn-primary w-fit" disabled={!approved}>
            {form.id ? "Submit update for approval" : "Submit for approval"}
          </button>
        </form>
      )}

      {tab === "requests" && (
        <div className="grid gap-3">
          {requests.map((r) => (
            <div key={r.id} className="dash-card">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                <StatusBadge
                  status={r.requestType === "create" ? "placed" : "confirmed"}
                  label={r.requestType}
                />
              </div>
              <h3 className="mt-2 font-display text-lg">{r.proposed.name}</h3>
              <p className="text-sm text-ink/55">
                {r.proposed.category} · {formatINR(r.proposed.price)} · stock{" "}
                {r.proposed.stock} · {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.status === "rejected" && r.rejectionReason ? (
                <p className="mt-2 rounded-lg bg-spice/5 px-3 py-2 text-sm text-spice">
                  Rejection reason: {r.rejectionReason}. Edit and resubmit from My products.
                </p>
              ) : null}
            </div>
          ))}
          {!requests.length && (
            <div className="dash-empty">No approval requests yet. Submit a product to begin.</div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Your items</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <p className="font-medium">{o.id.slice(0, 12)}…</p>
                    <p className="text-xs text-ink/45">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="text-xs">
                    {o.items.map((i) => (
                      <div key={`${o.id}-${i.productId}`}>
                        {i.name} × {i.qty} · {formatINR(i.price)}
                      </div>
                    ))}
                  </td>
                  <td>
                    <select
                      className="field !py-1.5"
                      value={o.status}
                      disabled={!approved}
                      onChange={(e) => void setStatus(o.id, e.target.value as OrderStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <div className="dash-empty">No orders for your products yet.</div>}
        </div>
      )}
    </DashShell>
  );
}
