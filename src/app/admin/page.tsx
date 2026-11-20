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

type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  shopName?: string | null;
  location?: string | null;
  bio?: string | null;
  shopApproved?: boolean | null;
  registrationStatus?: "pending" | "approved" | "rejected" | null;
  rejectionReason?: string;
  createdAt: string;
};

type ProductRequest = {
  id: string;
  sellerUserId: string;
  productId: string | null;
  requestType: "create" | "update";
  status: "pending" | "approved" | "rejected";
  proposed: {
    name: string;
    shortName: string;
    category: string;
    description: string;
    price: number;
    mrp: number;
    stock: number;
    imageUrl: string;
  };
  previous: {
    name: string;
    price: number;
    stock: number;
  } | null;
  rejectionReason: string;
  createdAt: string;
  sellerName: string;
  sellerEmail: string;
  shopName: string | null;
};

type Analytics = {
  kpis: {
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalProducts: number;
    totalSellers: number;
    totalCustomers: number;
    pendingSellerRegistrations: number;
    pendingProductApprovals: number;
    approvedProductRequests: number;
    rejectedProductRequests: number;
  };
  bestSelling: { productId: string; name: string; qty: number; revenue: number }[];
  topSellers: { sellerId: string; name: string; revenue: number; units: number }[];
  series: { date: string; sales: number; revenue: number; profit: number }[];
  recentOrders: {
    id: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    itemCount: number;
  }[];
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
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState<Range>("month");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<(Order & { paymentStatus?: string })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
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

  useEffect(() => {
    if (!ready) return;
    if (!customer) {
      router.replace("/admin/login?next=/admin");
      return;
    }
    if (customer.role !== "admin") router.replace("/");
  }, [ready, customer, router]);

  const load = useCallback(async () => {
    const [a, o, p, u, r] = await Promise.all([
      fetch(`/api/admin/analytics?range=${range}`, { cache: "no-store" }),
      fetch("/api/admin/orders", { cache: "no-store" }),
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/product-requests?status=all", { cache: "no-store" }),
    ]);
    if (a.ok) setAnalytics((await a.json()) as Analytics);
    if (o.ok) setOrders(((await o.json()) as { orders: typeof orders }).orders);
    if (p.ok) setProducts(((await p.json()) as { products: Product[] }).products);
    if (u.ok) setUsers(((await u.json()) as { users: AdminUser[] }).users);
    if (r.ok) setRequests(((await r.json()) as { requests: ProductRequest[] }).requests);
  }, [range]);

  useEffect(() => {
    if (customer?.role === "admin") void load();
  }, [customer, load]);

  const pendingSellers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "seller" &&
          (u.registrationStatus === "pending" || (!u.shopApproved && u.registrationStatus !== "rejected")),
      ),
    [users],
  );
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sellerId.toLowerCase().includes(q),
    );
  }, [products, query]);

  async function reviewSeller(id: string, registrationStatus: "approved" | "rejected") {
    const reason =
      registrationStatus === "rejected"
        ? rejectReason || window.prompt("Rejection reason") || "Rejected by admin"
        : "";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, registrationStatus, reason }),
    });
    setMsg(res.ok ? `Seller ${registrationStatus}.` : "Could not update seller.");
    await load();
  }

  async function reviewRequest(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject"
        ? rejectReason || window.prompt("Rejection reason") || "Rejected by admin"
        : undefined;
    const res = await fetch("/api/admin/product-requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    setMsg(res.ok ? `Request ${action}d.` : "Could not update request.");
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
    setMsg(res.ok ? "Product saved to catalogue." : "Could not save product.");
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

  if (!ready || !customer || customer.role !== "admin") {
    return <div className="section text-ink/50">Loading admin…</div>;
  }

  const k = analytics?.kpis;

  return (
    <DashShell
      title="Admin console"
      subtitle="Approvals, catalogue control, and live business analytics"
      active={tab}
      onNavigate={setTab}
      onLogout={() => void logout()}
      topRight={
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
      }
      nav={[
        { id: "overview", label: "Overview" },
        {
          id: "sellers",
          label: "Seller approvals",
          badge: pendingSellers.length,
        },
        {
          id: "requests",
          label: "Product approvals",
          badge: pendingRequests.length,
        },
        { id: "products", label: "Catalogue" },
        { id: "orders", label: "Orders" },
        { id: "reports", label: "Sales reports" },
      ]}
    >
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
            <KpiCard label="Units sold" value={k?.totalSales || 0} accent="spice" />
            <KpiCard label="Customers" value={k?.totalCustomers || 0} />
            <KpiCard label="Sellers" value={k?.totalSellers || 0} />
            <KpiCard label="Live products" value={k?.totalProducts || 0} />
            <KpiCard
              label="Pending approvals"
              value={(k?.pendingSellerRegistrations || 0) + (k?.pendingProductApprovals || 0)}
              hint={`${k?.pendingSellerRegistrations || 0} sellers · ${k?.pendingProductApprovals || 0} products`}
              alert
              accent="spice"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="dash-card lg:col-span-3">
              <h2 className="font-display text-xl text-ink">Sales & profit trend</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.series || []}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a7a72" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1a7a72" stopOpacity={0} />
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
                      fill="url(#rev)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#e8a317"
                      fill="transparent"
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dash-card lg:col-span-2">
              <h2 className="font-display text-xl text-ink">Top sellers</h2>
              <ul className="mt-4 space-y-3">
                {(analytics?.topSellers || []).map((s) => (
                  <li key={s.sellerId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="tabular-nums text-ink/60">
                      {formatINR(s.revenue)} · {s.units} u
                    </span>
                  </li>
                ))}
                {!analytics?.topSellers?.length && (
                  <li className="text-sm text-ink/50">No seller sales in this range.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="dash-card">
              <h2 className="font-display text-xl">Best-selling products</h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.bestSelling || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7ebe4" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#0c4a46" radius={[6, 6, 0, 0]} name="Units" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dash-card">
              <h2 className="font-display text-xl">Recent transactions</h2>
              <ul className="mt-4 space-y-2">
                {(analytics?.recentOrders || []).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-foam/70 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">{o.id.slice(0, 10)}…</p>
                      <p className="text-xs text-ink/50">
                        {new Date(o.createdAt).toLocaleString()} · {o.itemCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-semibold">{formatINR(o.total)}</p>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "sellers" && (
        <div className="space-y-4">
          <div className="dash-card">
            <h2 className="font-display text-xl">Seller registration queue</h2>
            <p className="mt-1 text-sm text-ink/55">
              Approve or reject new seller accounts before they can list products.
            </p>
            <input
              className="field mt-3 max-w-md"
              placeholder="Rejection reason (used when rejecting)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => u.role === "seller")
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <p className="font-medium text-ink">{u.name}</p>
                        <p className="text-xs text-ink/50">{u.email}</p>
                        <p className="text-xs text-ink/50">{u.phone}</p>
                      </td>
                      <td>
                        <p className="font-medium">{u.shopName || "—"}</p>
                        <p className="text-xs text-ink/50">{u.location || "—"}</p>
                        {u.rejectionReason ? (
                          <p className="mt-1 text-xs text-spice">{u.rejectionReason}</p>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge
                          status={u.registrationStatus || (u.shopApproved ? "approved" : "pending")}
                        />
                      </td>
                      <td className="space-x-2">
                        {(u.registrationStatus === "pending" ||
                          (!u.shopApproved && u.registrationStatus !== "rejected")) && (
                          <>
                            <button
                              type="button"
                              className="btn-primary !px-3 !py-1.5 !text-xs"
                              onClick={() => void reviewSeller(u.id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-outline !px-3 !py-1.5 !text-xs"
                              onClick={() => void reviewSeller(u.id, "rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          <div className="dash-card">
            <h2 className="font-display text-xl">Product approval requests</h2>
            <p className="mt-1 text-sm text-ink/55">
              New listings and updates stay off the storefront until you approve them.
            </p>
            <input
              className="field mt-3 max-w-md"
              placeholder="Rejection reason (used when rejecting)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="grid gap-4">
            {requests.map((r) => (
              <div key={r.id} className="dash-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                      <StatusBadge
                        status={r.requestType === "create" ? "placed" : "confirmed"}
                        label={r.requestType === "create" ? "New product" : "Update"}
                      />
                    </div>
                    <h3 className="mt-2 font-display text-lg text-ink">{r.proposed.name}</h3>
                    <p className="text-sm text-ink/55">
                      {r.shopName || r.sellerName} · {r.sellerEmail} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary !px-3 !py-1.5 !text-xs"
                        onClick={() => void reviewRequest(r.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn-outline !px-3 !py-1.5 !text-xs"
                        onClick={() => void reviewRequest(r.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-foam/80 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                      Proposed
                    </p>
                    <p className="mt-1">{r.proposed.category}</p>
                    <p>
                      {formatINR(r.proposed.price)} · stock {r.proposed.stock}
                    </p>
                    <p className="mt-1 text-ink/60">{r.proposed.description}</p>
                  </div>
                  <div className="rounded-xl bg-sand/50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                      Current live
                    </p>
                    {r.previous ? (
                      <>
                        <p className="mt-1">{r.previous.name}</p>
                        <p>
                          {formatINR(r.previous.price)} · stock {r.previous.stock}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-ink/50">No live product yet.</p>
                    )}
                    {r.rejectionReason ? (
                      <p className="mt-2 text-spice">Reason: {r.rejectionReason}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!requests.length && <div className="dash-empty">No product requests yet.</div>}
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={onAddProduct} className="dash-card grid gap-3">
            <h2 className="font-display text-xl">Publish product (admin)</h2>
            <p className="text-sm text-ink/55">Admin saves go live immediately.</p>
            <input
              className="field"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="field"
              placeholder="Short name"
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            />
            <input
              className="field"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className="field"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <input
                className="field"
                placeholder="MRP"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
              />
              <input
                className="field"
                placeholder="Stock"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <input
              className="field"
              placeholder="Image URL"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <textarea
              className="field"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button type="submit" className="btn-primary w-fit">
              {form.id ? "Update product" : "Add product"}
            </button>
          </form>
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-xl">All seller & internal products</h2>
              <input
                className="field !w-48"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="dash-table-wrap max-h-[32rem] overflow-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Seller</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-ink/45">{p.category}</p>
                      </td>
                      <td className="text-xs">{p.sellerId}</td>
                      <td>{formatINR(p.price)}</td>
                      <td>{p.stock}</td>
                      <td>
                        <button
                          type="button"
                          className="text-xs font-semibold text-sea"
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
                            setTab("products");
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Items / sellers</th>
                <th>Total</th>
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
                  <td className="text-xs text-ink/70">
                    {o.items.map((i) => (
                      <div key={`${o.id}-${i.productId}`}>
                        {i.name} × {i.qty} · {i.sellerName || "internal"}
                      </div>
                    ))}
                  </td>
                  <td>{formatINR(o.total)}</td>
                  <td>
                    <select
                      className="field !py-1.5"
                      value={o.status}
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
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Approved requests" value={k?.approvedProductRequests || 0} />
            <KpiCard label="Rejected requests" value={k?.rejectedProductRequests || 0} accent="spice" />
            <KpiCard label="Platform profit" value={formatINR(k?.totalProfit || 0)} accent="lagoon" />
          </div>
          <div className="dash-card">
            <h2 className="font-display text-xl">Seller-wise revenue</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.topSellers || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d7ebe4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#1a7a72" radius={[6, 6, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  );
}
