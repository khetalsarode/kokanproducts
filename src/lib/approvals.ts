import { newId } from "@/lib/auth";
import { sql } from "@/lib/db";

export type RegistrationStatus = "pending" | "approved" | "rejected";
export type RequestStatus = "pending" | "approved" | "rejected";
export type RequestType = "create" | "update";

export type ProductProposal = {
  id?: string;
  slug?: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  weight: string;
  stock: number;
  tags: string;
  accent: string;
  imageUrl: string;
  imageUrl2: string;
  fssai: boolean;
};

export async function setSellerRegistrationStatus(input: {
  sellerUserId: string;
  status: RegistrationStatus;
  reason?: string;
  actorId: string;
}) {
  const approved = input.status === "approved";
  await sql(
    `update seller_profiles
     set approved = $1,
         registration_status = $2,
         rejection_reason = $3,
         reviewed_at = now(),
         reviewed_by = $4
     where user_id = $5`,
    [
      approved,
      input.status,
      input.status === "rejected" ? (input.reason || "").trim() : "",
      input.actorId,
      input.sellerUserId,
    ],
  );
  await sql(
    `insert into seller_approval_events (id, seller_user_id, action, reason, actor_id)
     values ($1,$2,$3,$4,$5)`,
    [
      newId(),
      input.sellerUserId,
      input.status,
      input.reason || "",
      input.actorId,
    ],
  );
}

export async function createProductRequest(input: {
  sellerUserId: string;
  requestType: RequestType;
  productId?: string | null;
  proposed: ProductProposal;
  previous?: ProductProposal | null;
}) {
  const id = newId();
  await sql(
    `insert into product_approval_requests (
      id, seller_user_id, product_id, request_type, status,
      proposed_json, previous_json
    ) values ($1,$2,$3,$4,'pending',$5::jsonb,$6::jsonb)`,
    [
      id,
      input.sellerUserId,
      input.productId || null,
      input.requestType,
      JSON.stringify(input.proposed),
      input.previous ? JSON.stringify(input.previous) : null,
    ],
  );
  return id;
}

export async function listProductRequests(filter: {
  status?: RequestStatus | "all";
  sellerUserId?: string;
  limit?: number;
}) {
  const limit = filter.limit ?? 200;
  const params: unknown[] = [];
  const where: string[] = [];
  if (filter.status && filter.status !== "all") {
    params.push(filter.status);
    where.push(`r.status = $${params.length}`);
  }
  if (filter.sellerUserId) {
    params.push(filter.sellerUserId);
    where.push(`r.seller_user_id = $${params.length}`);
  }
  params.push(limit);
  const rows = await sql<{
    id: string;
    seller_user_id: string;
    product_id: string | null;
    request_type: string;
    status: string;
    proposed_json: ProductProposal | string;
    previous_json: ProductProposal | string | null;
    rejection_reason: string;
    reviewed_by: string | null;
    reviewed_at: Date | string | null;
    created_at: Date | string;
    seller_name: string;
    seller_email: string;
    shop_name: string | null;
  }>(
    `select r.*, c.name as seller_name, c.email as seller_email, sp.shop_name
     from product_approval_requests r
     join customers c on c.id = r.seller_user_id
     left join seller_profiles sp on sp.user_id = r.seller_user_id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by r.created_at desc
     limit $${params.length}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    sellerUserId: r.seller_user_id,
    productId: r.product_id,
    requestType: r.request_type as RequestType,
    status: r.status as RequestStatus,
    proposed:
      typeof r.proposed_json === "string"
        ? (JSON.parse(r.proposed_json) as ProductProposal)
        : r.proposed_json,
    previous: r.previous_json
      ? typeof r.previous_json === "string"
        ? (JSON.parse(r.previous_json) as ProductProposal)
        : r.previous_json
      : null,
    rejectionReason: r.rejection_reason,
    reviewedBy: r.reviewed_by,
    reviewedAt:
      r.reviewed_at == null
        ? null
        : typeof r.reviewed_at === "string"
          ? r.reviewed_at
          : r.reviewed_at.toISOString(),
    createdAt:
      typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    sellerName: r.seller_name,
    sellerEmail: r.seller_email,
    shopName: r.shop_name,
  }));
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `product-${Date.now()}`
  );
}

export async function applyApprovedProductRequest(
  requestId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{
    id: string;
    seller_user_id: string;
    product_id: string | null;
    request_type: string;
    status: string;
    proposed_json: ProductProposal | string;
  }>(`select * from product_approval_requests where id = $1 limit 1`, [requestId]);
  const row = rows[0];
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "pending") return { ok: false, error: "Request is not pending." };

  const proposed =
    typeof row.proposed_json === "string"
      ? (JSON.parse(row.proposed_json) as ProductProposal)
      : row.proposed_json;

  const productId = row.product_id || proposed.id || newId();
  const slug = slugify(proposed.slug || proposed.name);

  if (row.request_type === "create") {
    await sql(
      `insert into catalog_products (
        id, slug, name, short_name, category, description, price, mrp, unit, weight,
        stock, seller_user_id, fulfillment, tags, accent, image_url, image_url_2, fssai, active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'seller',$13,$14,$15,$16,$17,true
      )
      on conflict (id) do update set
        slug = excluded.slug,
        name = excluded.name,
        short_name = excluded.short_name,
        category = excluded.category,
        description = excluded.description,
        price = excluded.price,
        mrp = excluded.mrp,
        unit = excluded.unit,
        weight = excluded.weight,
        stock = excluded.stock,
        tags = excluded.tags,
        accent = excluded.accent,
        image_url = excluded.image_url,
        image_url_2 = excluded.image_url_2,
        fssai = excluded.fssai,
        active = true,
        updated_at = now()`,
      [
        productId,
        slug,
        proposed.name,
        proposed.shortName || proposed.name,
        proposed.category || "spices",
        proposed.description || "",
        Math.max(1, Number(proposed.price) || 1),
        Math.max(1, Number(proposed.mrp) || Number(proposed.price) || 1),
        proposed.unit || "pack",
        proposed.weight || "",
        Math.max(0, Number(proposed.stock) || 0),
        row.seller_user_id,
        proposed.tags || "",
        proposed.accent || "#0c4a46",
        proposed.imageUrl || "",
        proposed.imageUrl2 || "",
        proposed.fssai !== false,
      ],
    );
  } else {
    await sql(
      `update catalog_products set
         name = $1,
         short_name = $2,
         category = $3,
         description = $4,
         price = $5,
         mrp = $6,
         unit = $7,
         weight = $8,
         stock = $9,
         tags = $10,
         accent = $11,
         image_url = $12,
         image_url_2 = $13,
         fssai = $14,
         active = true,
         updated_at = now()
       where id = $15 and seller_user_id = $16`,
      [
        proposed.name,
        proposed.shortName || proposed.name,
        proposed.category || "spices",
        proposed.description || "",
        Math.max(1, Number(proposed.price) || 1),
        Math.max(1, Number(proposed.mrp) || Number(proposed.price) || 1),
        proposed.unit || "pack",
        proposed.weight || "",
        Math.max(0, Number(proposed.stock) || 0),
        proposed.tags || "",
        proposed.accent || "#0c4a46",
        proposed.imageUrl || "",
        proposed.imageUrl2 || "",
        proposed.fssai !== false,
        productId,
        row.seller_user_id,
      ],
    );
  }

  await sql(
    `update product_approval_requests
     set status = 'approved',
         product_id = $1,
         reviewed_by = $2,
         reviewed_at = now(),
         updated_at = now(),
         rejection_reason = ''
     where id = $3`,
    [productId, actorId, requestId],
  );
  return { ok: true };
}

export async function rejectProductRequest(
  requestId: string,
  actorId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{ status: string }>(
    `select status from product_approval_requests where id = $1`,
    [requestId],
  );
  if (!rows[0]) return { ok: false, error: "Request not found." };
  if (rows[0].status !== "pending") return { ok: false, error: "Request is not pending." };
  await sql(
    `update product_approval_requests
     set status = 'rejected',
         rejection_reason = $1,
         reviewed_by = $2,
         reviewed_at = now(),
         updated_at = now()
     where id = $3`,
    [reason.trim() || "Rejected by admin", actorId, requestId],
  );
  return { ok: true };
}
