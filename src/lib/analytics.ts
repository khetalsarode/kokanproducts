import { sql } from "@/lib/db";

export type AnalyticsRange = "day" | "week" | "month" | "year";

function rangeStart(range: AnalyticsRange): Date {
  const d = new Date();
  if (range === "day") d.setHours(0, 0, 0, 0);
  else if (range === "week") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

type OrderRow = {
  id: string;
  total: number;
  subtotal: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  items_json: unknown;
  created_at: Date | string;
  customer_id: string | null;
};

type Line = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  sellerName?: string;
};

function parseItems(raw: unknown): Line[] {
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (JSON.parse(raw) as unknown[])
      : [];
  return arr.map((item) => {
    const i = item as Record<string, unknown>;
    return {
      productId: String(i.productId || ""),
      name: String(i.name || "Item"),
      qty: Number(i.qty) || 0,
      price: Number(i.price) || 0,
      sellerName: i.sellerName ? String(i.sellerName) : undefined,
    };
  });
}

function costEstimate(price: number): number {
  // Approximate COGS at 65% of selling price for profit analytics
  return Math.round(price * 0.65);
}

export async function getAdminAnalytics(range: AnalyticsRange = "month") {
  const since = rangeStart(range).toISOString();

  const [
    customers,
    sellers,
    products,
    pendingSellers,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    orders,
  ] = await Promise.all([
    sql<{ n: string | number }>(
      `select count(*)::int as n from customers where role = 'customer'`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from seller_profiles where coalesce(registration_status, case when approved then 'approved' else 'pending' end) = 'approved'`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from catalog_products where active = true`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from seller_profiles where coalesce(registration_status, 'pending') = 'pending' and approved = false`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests where status = 'pending'`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests where status = 'approved'`,
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests where status = 'rejected'`,
    ),
    sql<OrderRow>(
      `select id, total, subtotal, status, payment_status, payment_method, items_json, created_at, customer_id
       from shop_orders
       where created_at >= $1::timestamptz
       order by created_at desc`,
      [since],
    ),
  ]);

  const paid = orders.filter(
    (o) => o.payment_status === "paid" || o.payment_method === "cod",
  );
  let revenue = 0;
  let profit = 0;
  let units = 0;
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  const sellerSales = new Map<string, { revenue: number; units: number }>();
  const seriesMap = new Map<string, { sales: number; revenue: number; profit: number }>();

  for (const order of paid) {
    revenue += Number(order.total) || 0;
    const items = parseItems(order.items_json);
    let orderCost = 0;
    for (const line of items) {
      units += line.qty;
      orderCost += costEstimate(line.price) * line.qty;
      const cur = productSales.get(line.productId) || {
        name: line.name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += line.qty;
      cur.revenue += line.price * line.qty;
      productSales.set(line.productId, cur);
      const sellerKey = line.sellerName || "internal";
      const s = sellerSales.get(sellerKey) || { revenue: 0, units: 0 };
      s.revenue += line.price * line.qty;
      s.units += line.qty;
      sellerSales.set(sellerKey, s);
    }
    profit += (Number(order.total) || 0) - orderCost;

    const created =
      typeof order.created_at === "string"
        ? order.created_at
        : order.created_at.toISOString();
    const bucket = created.slice(0, 10);
    const point = seriesMap.get(bucket) || { sales: 0, revenue: 0, profit: 0 };
    point.sales += 1;
    point.revenue += Number(order.total) || 0;
    point.profit += (Number(order.total) || 0) - orderCost;
    seriesMap.set(bucket, point);
  }

  const bestSelling = [...productSales.entries()]
    .map(([id, v]) => ({ productId: id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const sellerIds = [...sellerSales.keys()].filter((k) => k !== "internal");
  const sellerNames =
    sellerIds.length === 0
      ? []
      : await sql<{ id: string; name: string; shop_name: string | null }>(
          `select c.id, c.name, sp.shop_name
           from customers c
           left join seller_profiles sp on sp.user_id = c.id
           where c.id = any($1::text[])`,
          [sellerIds],
        );
  const nameById = new Map(
    sellerNames.map((s) => [s.id, s.shop_name || s.name]),
  );

  const topSellers = [...sellerSales.entries()]
    .map(([id, v]) => ({
      sellerId: id,
      name: id === "internal" ? "KonkanProducts" : nameById.get(id) || id,
      ...v,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const series = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const recentOrders = orders.slice(0, 12).map((o) => ({
    id: o.id,
    total: Number(o.total) || 0,
    status: o.status,
    paymentStatus: o.payment_status,
    createdAt:
      typeof o.created_at === "string" ? o.created_at : o.created_at.toISOString(),
    itemCount: parseItems(o.items_json).reduce((n, i) => n + i.qty, 0),
  }));

  return {
    range,
    kpis: {
      totalSales: units,
      totalRevenue: revenue,
      totalProfit: Math.max(0, profit),
      totalOrders: orders.length,
      totalProducts: Number(products[0]?.n || 0),
      totalSellers: Number(sellers[0]?.n || 0),
      totalCustomers: Number(customers[0]?.n || 0),
      pendingSellerRegistrations: Number(pendingSellers[0]?.n || 0),
      pendingProductApprovals: Number(pendingProducts[0]?.n || 0),
      approvedProductRequests: Number(approvedProducts[0]?.n || 0),
      rejectedProductRequests: Number(rejectedProducts[0]?.n || 0),
    },
    bestSelling,
    topSellers,
    series,
    recentOrders,
  };
}

export async function getSellerAnalytics(
  sellerUserId: string,
  range: AnalyticsRange = "month",
) {
  const since = rangeStart(range).toISOString();

  const [products, pending, approved, rejected, orders] = await Promise.all([
    sql<{ id: string; name: string; stock: number; active: boolean; price: number }>(
      `select id, name, stock, active, price from catalog_products where seller_user_id = $1`,
      [sellerUserId],
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests
       where seller_user_id = $1 and status = 'pending'`,
      [sellerUserId],
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests
       where seller_user_id = $1 and status = 'approved'`,
      [sellerUserId],
    ),
    sql<{ n: string | number }>(
      `select count(*)::int as n from product_approval_requests
       where seller_user_id = $1 and status = 'rejected'`,
      [sellerUserId],
    ),
    sql<OrderRow>(
      `select id, total, subtotal, status, payment_status, items_json, created_at, customer_id
       from shop_orders
       where created_at >= $1::timestamptz
       order by created_at desc`,
      [since],
    ),
  ]);

  const myProductIds = new Set(products.map((p) => p.id));
  let revenue = 0;
  let profit = 0;
  let units = 0;
  let orderCount = 0;
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  const seriesMap = new Map<string, { sales: number; revenue: number }>();
  const recent: {
    id: string;
    total: number;
    status: string;
    createdAt: string;
    qty: number;
  }[] = [];

  for (const order of orders) {
    const items = parseItems(order.items_json).filter(
      (i) => myProductIds.has(i.productId) || i.sellerName === sellerUserId,
    );
    if (!items.length) continue;
    orderCount += 1;
    let orderRev = 0;
    let orderCost = 0;
    let orderQty = 0;
    for (const line of items) {
      orderRev += line.price * line.qty;
      orderCost += costEstimate(line.price) * line.qty;
      orderQty += line.qty;
      units += line.qty;
      const cur = productSales.get(line.productId) || {
        name: line.name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += line.qty;
      cur.revenue += line.price * line.qty;
      productSales.set(line.productId, cur);
    }
    revenue += orderRev;
    profit += orderRev - orderCost;
    const created =
      typeof order.created_at === "string"
        ? order.created_at
        : order.created_at.toISOString();
    const bucket = created.slice(0, 10);
    const point = seriesMap.get(bucket) || { sales: 0, revenue: 0 };
    point.sales += 1;
    point.revenue += orderRev;
    seriesMap.set(bucket, point);
    if (recent.length < 12) {
      recent.push({
        id: order.id,
        total: orderRev,
        status: order.status,
        createdAt: created,
        qty: orderQty,
      });
    }
  }

  const lowStock = products
    .filter((p) => p.active && p.stock <= 5)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock }))
    .sort((a, b) => a.stock - b.stock);

  return {
    range,
    kpis: {
      totalSales: units,
      totalRevenue: revenue,
      totalProfit: Math.max(0, profit),
      totalOrders: orderCount,
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.active).length,
      pendingProducts: Number(pending[0]?.n || 0),
      rejectedProducts: Number(rejected[0]?.n || 0),
      approvedProducts: Number(approved[0]?.n || 0),
      availableStock: products.reduce((n, p) => n + (p.active ? p.stock : 0), 0),
      lowStockCount: lowStock.length,
    },
    bestSelling: [...productSales.entries()]
      .map(([id, v]) => ({ productId: id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8),
    series: [...seriesMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    lowStock,
    recentOrders: recent,
    purchasedProducts: [...productSales.values()].sort((a, b) => b.qty - a.qty),
  };
}
