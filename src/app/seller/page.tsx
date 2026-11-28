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
import { FoodProductFields } from "@/components/dashboard/FoodProductFields";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import {
  emptyFoodFields,
  foodFieldsFromProduct,
  shelfLifeLabel,
  shelfLifeStatus,
  type FoodInventoryFields,
} from "@/lib/foodProduct";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/types";

type Range = "day" | "week" | "month" | "year";

type OnboardingState = {
  categoryId: string | null;
  categoryName: string | null;
  agreement: {
    id: string;
    version: number;
    title: string;
    content: string;
  } | null;
  acceptanceStatus: "pending" | "accepted" | "outdated" | "no_category" | "no_agreement";
  acceptedAt?: string;
  acceptedVersion?: number;
  kycStatus: string;
  canAccessKyc: boolean;
};

type KycForm = {
  status: string;
  legalName: string;
  businessPan: string;
  documentNotes: string;
  rejectionReason: string;
};

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
  const [food, setFood] = useState<FoodInventoryFields>(emptyFoodFields());
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [kyc, setKyc] = useState<KycForm>({
    status: "locked",
    legalName: "",
    businessPan: "",
    documentNotes: "",
    rejectionReason: "",
  });
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [agreeBusy, setAgreeBusy] = useState(false);

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
  const needsAgreement =
    onboarding != null &&
    (onboarding.acceptanceStatus === "pending" ||
      onboarding.acceptanceStatus === "outdated" ||
      onboarding.acceptanceStatus === "no_category");

  const loadOnboarding = useCallback(async () => {
    const res = await fetch("/api/seller/onboarding", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      onboarding: OnboardingState;
      kyc: KycForm;
    };
    setOnboarding(data.onboarding);
    setKyc(data.kyc);
    if (
      data.onboarding.acceptanceStatus === "pending" ||
      data.onboarding.acceptanceStatus === "outdated"
    ) {
      setTab("agreement");
      setAgreeChecked(false);
    }
  }, []);

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
    await loadOnboarding();
  }, [range, approved, loadOnboarding]);

  useEffect(() => {
    if (customer?.role === "seller" || customer?.role === "admin") void load();
  }, [customer, load]);

  function navigateTab(next: string) {
    if (next === "kyc" && onboarding && !onboarding.canAccessKyc) {
      setMsg("Accept the current Terms & Conditions before opening KYC.");
      setTab("agreement");
      return;
    }
    if (
      needsAgreement &&
      next !== "agreement" &&
      (onboarding?.acceptanceStatus === "pending" ||
        onboarding?.acceptanceStatus === "outdated")
    ) {
      setMsg("You must accept the Terms & Conditions before continuing onboarding.");
      setTab("agreement");
      return;
    }
    setTab(next);
  }

  async function acceptAgreement() {
    if (!onboarding?.agreement || !agreeChecked) {
      setMsg("Tick “I Agree & Accept” to continue.");
      return;
    }
    setAgreeBusy(true);
    const res = await fetch("/api/seller/agreement/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agreementId: onboarding.agreement.id,
        accepted: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      onboarding?: OnboardingState;
    };
    setAgreeBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not record acceptance.");
      return;
    }
    setOnboarding(data.onboarding || null);
    setMsg("Terms accepted. You can continue with KYC registration.");
    setTab("kyc");
    await loadOnboarding();
  }

  async function submitKyc(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/seller/kyc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        legalName: kyc.legalName,
        businessPan: kyc.businessPan,
        documentNotes: kyc.documentNotes,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error || "Could not submit KYC.");
      if (res.status === 403) setTab("agreement");
      return;
    }
    setMsg("KYC submitted for review.");
    await loadOnboarding();
  }

  const agreementStatusLabel =
    onboarding?.acceptanceStatus === "accepted"
      ? "Accepted"
      : onboarding?.acceptanceStatus === "outdated"
        ? "New Agreement Available"
        : "Pending Acceptance";

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
        ...food,
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
      setFood(emptyFoodFields());
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
      onNavigate={navigateTab}
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
        {
          id: "agreement",
          label: "Terms & Conditions",
          badge: needsAgreement ? 1 : undefined,
        },
        { id: "kyc", label: "KYC registration" },
        { id: "products", label: "My products" },
        { id: "inventory", label: "Warehouse & shelf life" },
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

      {onboarding && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-sea/15 bg-white/50 px-4 py-3 text-sm">
          <span className="text-ink/55">Business category:</span>
          <strong>{onboarding.categoryName || "Not set"}</strong>
          <span className="text-ink/55">Agreement:</span>
          <StatusBadge
            status={
              onboarding.acceptanceStatus === "accepted"
                ? "approved"
                : onboarding.acceptanceStatus === "outdated"
                  ? "pending"
                  : "pending"
            }
            label={agreementStatusLabel}
          />
          {onboarding.acceptedVersion ? (
            <span className="text-xs text-ink/45">v{onboarding.acceptedVersion}</span>
          ) : null}
        </div>
      )}

      {tab === "agreement" && (
        <div className="space-y-4">
          {!onboarding?.agreement ? (
            <div className="dash-empty">
              {onboarding?.acceptanceStatus === "no_category"
                ? "No business category on your profile. Contact admin or re-register with a category."
                : "No published agreement for your category yet."}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-sea/15 bg-white/70 p-4">
                <h2 className="font-display text-2xl text-ink">
                  {onboarding.agreement.title}
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {onboarding.categoryName} · Version {onboarding.agreement.version}
                  {onboarding.acceptanceStatus === "outdated"
                    ? " — a newer version requires your acceptance"
                    : null}
                </p>
                <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-foam/80 p-4 text-sm leading-relaxed text-ink/80">
                  {onboarding.agreement.content}
                </pre>
              </div>
              {onboarding.acceptanceStatus === "accepted" ? (
                <p className="text-sm text-lagoon">
                  You accepted this agreement
                  {onboarding.acceptedAt
                    ? ` on ${new Date(onboarding.acceptedAt).toLocaleString("en-IN")}`
                    : ""}
                  .
                </p>
              ) : (
                <div className="space-y-3 rounded-xl border border-spice/20 bg-spice/5 p-4">
                  <p className="text-sm text-ink/70">
                    Acceptance is mandatory and cannot be skipped. KYC stays locked until you
                    agree.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-ink/80">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={agreeChecked}
                      onChange={(e) => setAgreeChecked(e.target.checked)}
                    />
                    <span>
                      I have read and agree to the Terms & Conditions for{" "}
                      <strong>{onboarding.categoryName}</strong>.
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!agreeChecked || agreeBusy}
                    onClick={() => void acceptAgreement()}
                  >
                    {agreeBusy ? "Saving…" : "I Agree & Accept"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-4">
          {!onboarding?.canAccessKyc ? (
            <div className="rounded-xl border border-spice/25 bg-spice/5 px-4 py-3 text-sm text-ink/75">
              KYC registration is locked until you accept the current Terms & Conditions for your
              business category.
              <button
                type="button"
                className="ml-2 font-medium text-sea hover:underline"
                onClick={() => setTab("agreement")}
              >
                Review agreement
              </button>
            </div>
          ) : (
            <form
              onSubmit={submitKyc}
              className="grid max-w-xl gap-3 rounded-xl border border-sea/15 bg-white/70 p-4"
            >
              <h2 className="font-display text-2xl text-ink">KYC registration</h2>
              <p className="text-sm text-ink/55">
                Status: <strong>{kyc.status}</strong>
                {kyc.rejectionReason ? ` — ${kyc.rejectionReason}` : ""}
              </p>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Legal business name</span>
                <input
                  className="field"
                  value={kyc.legalName}
                  onChange={(e) => setKyc({ ...kyc, legalName: e.target.value })}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">PAN / tax ID</span>
                <input
                  className="field"
                  value={kyc.businessPan}
                  onChange={(e) => setKyc({ ...kyc, businessPan: e.target.value })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Document notes</span>
                <textarea
                  className="field"
                  rows={3}
                  value={kyc.documentNotes}
                  onChange={(e) => setKyc({ ...kyc, documentNotes: e.target.value })}
                  placeholder="List documents you will upload / share for verification"
                />
              </label>
              <button type="submit" className="btn-primary w-fit">
                Submit KYC
              </button>
            </form>
          )}
        </div>
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
                <th>Shop / WH</th>
                <th>Shelf life</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const life = shelfLifeStatus(p.bestBefore);
                return (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-ink/45">{p.category}</p>
                    </td>
                    <td>{formatINR(p.price)}</td>
                    <td className="text-xs">
                      {p.stock} / {p.warehouseStock}
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          life === "expired"
                            ? "rejected"
                            : life === "expiring_soon"
                              ? "pending"
                              : life === "ok"
                                ? "approved"
                                : "inactive"
                        }
                        label={shelfLifeLabel(life)}
                      />
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
                          setFood(foodFieldsFromProduct(p));
                          setTab("submit");
                        }}
                      >
                        Request update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!products.length && <div className="dash-empty">No published products yet.</div>}
        </div>
      )}

      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label="Warehouse units"
              value={products.reduce((n, p) => n + (p.warehouseStock || 0), 0)}
            />
            <KpiCard
              label="Expiring soon"
              value={
                products.filter((p) => shelfLifeStatus(p.bestBefore) === "expiring_soon")
                  .length
              }
              accent="mango"
              alert
            />
            <KpiCard
              label="Expired"
              value={products.filter((p) => shelfLifeStatus(p.bestBefore) === "expired").length}
              accent="spice"
              alert
            />
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Warehouse qty</th>
                  <th>Location</th>
                  <th>Best before</th>
                  <th>Batch</th>
                  <th>Storage</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.name}</p>
                      <StatusBadge
                        status={
                          shelfLifeStatus(p.bestBefore) === "expired"
                            ? "rejected"
                            : shelfLifeStatus(p.bestBefore) === "expiring_soon"
                              ? "pending"
                              : "approved"
                        }
                        label={shelfLifeLabel(shelfLifeStatus(p.bestBefore))}
                      />
                    </td>
                    <td className="tabular-nums font-semibold">{p.warehouseStock}</td>
                    <td className="text-xs">{p.warehouseLocation || "—"}</td>
                    <td className="text-xs">{p.bestBefore || "—"}</td>
                    <td className="text-xs">{p.batchNumber || "—"}</td>
                    <td className="text-xs capitalize">
                      {p.temperatureZone}
                      {p.storageInstructions ? (
                        <p className="mt-1 text-ink/45">{p.storageInstructions}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!products.length && (
              <div className="dash-empty">No inventory yet. Submit a food product to begin.</div>
            )}
          </div>
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
          <FoodProductFields value={food} onChange={setFood} disabled={!approved} />
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
