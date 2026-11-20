import { NextResponse } from "next/server";
import { newId, requireUser } from "@/lib/auth";
import { createProductRequest, type ProductProposal } from "@/lib/approvals";
import { listCatalogProducts, mapCatalogRow } from "@/lib/catalog";
import { sql } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  const products = await listCatalogProducts({
    sellerUserId: user.role === "seller" ? user.id : undefined,
    includeInactive: true,
  });
  return NextResponse.json(
    { products },
    { headers: { "cache-control": "private, no-store" } },
  );
}

function proposalFromBody(body: Record<string, unknown>, id?: string): ProductProposal {
  const name = String(body.name || "").trim();
  return {
    id,
    slug: String(body.slug || ""),
    name,
    shortName: String(body.shortName || name),
    category: String(body.category || "spices"),
    description: String(body.description || ""),
    price: Math.max(1, Number(body.price) || 1),
    mrp: Math.max(1, Number(body.mrp) || Number(body.price) || 1),
    unit: String(body.unit || "pack"),
    weight: String(body.weight || ""),
    stock: Math.max(0, Number(body.stock) || 0),
    tags: String(body.tags || ""),
    accent: String(body.accent || "#0c4a46"),
    imageUrl: String(body.imageUrl || ""),
    imageUrl2: String(body.imageUrl2 || ""),
    fssai: body.fssai !== false,
  };
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  if (user.role === "seller" && !user.shopApproved) {
    return NextResponse.json({ error: "Seller account pending approval." }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  // Sellers submit for admin approval — never overwrite live catalog directly.
  if (user.role === "seller") {
    const existingId = String(body.id || "").trim();
    let previous: ProductProposal | null = null;
    let requestType: "create" | "update" = "create";
    if (existingId) {
      const rows = await sql<Record<string, unknown>>(
        `select * from catalog_products where id = $1 and seller_user_id = $2 limit 1`,
        [existingId, user.id],
      );
      if (!rows[0]) {
        return NextResponse.json({ error: "Product not found." }, { status: 404 });
      }
      const mapped = mapCatalogRow(rows[0] as never);
      previous = {
        id: mapped.id,
        slug: mapped.slug,
        name: mapped.name,
        shortName: mapped.shortName,
        category: mapped.category,
        description: mapped.description,
        price: mapped.price,
        mrp: mapped.mrp,
        unit: mapped.unit,
        weight: mapped.weight,
        stock: mapped.stock,
        tags: mapped.tags.join(","),
        accent: mapped.accent,
        imageUrl: mapped.images[0] || "",
        imageUrl2: mapped.images[1] || "",
        fssai: mapped.fssai,
      };
      requestType = "update";
    }
    const proposed = proposalFromBody(body, existingId || undefined);
    const requestId = await createProductRequest({
      sellerUserId: user.id,
      requestType,
      productId: existingId || null,
      proposed,
      previous,
    });
    return NextResponse.json(
      {
        ok: true,
        pendingApproval: true,
        requestId,
        message:
          requestType === "create"
            ? "Product submitted for admin approval."
            : "Product update submitted for admin approval. Live listing unchanged until approved.",
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const slug =
    String(body.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `product-${Date.now()}`;
  const id = String(body.id || newId());
  const sellerUserId = (body.sellerUserId as string) || null;
  const fulfillment = String(body.fulfillment || "internal");

  await sql(
    `insert into catalog_products (
      id, slug, name, short_name, category, description, price, mrp, unit, weight,
      stock, seller_user_id, fulfillment, tags, accent, image_url, image_url_2, fssai, active
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    on conflict (id) do update set
      name = excluded.name,
      short_name = excluded.short_name,
      category = excluded.category,
      description = excluded.description,
      price = excluded.price,
      mrp = excluded.mrp,
      unit = excluded.unit,
      weight = excluded.weight,
      stock = excluded.stock,
      image_url = excluded.image_url,
      image_url_2 = excluded.image_url_2,
      active = excluded.active,
      updated_at = now()`,
    [
      id,
      slug,
      name,
      String(body.shortName || name),
      String(body.category || "spices"),
      String(body.description || ""),
      Math.max(1, Number(body.price) || 1),
      Math.max(1, Number(body.mrp) || Number(body.price) || 1),
      String(body.unit || "pack"),
      String(body.weight || ""),
      Math.max(0, Number(body.stock) || 0),
      sellerUserId,
      fulfillment,
      String(body.tags || ""),
      String(body.accent || "#0c4a46"),
      String(body.imageUrl || ""),
      String(body.imageUrl2 || ""),
      body.fssai !== false,
      body.active !== false,
    ],
  );

  const rows = await sql(`select * from catalog_products where id = $1`, [id]);
  return NextResponse.json(
    { product: rows[0] ? mapCatalogRow(rows[0] as never) : null },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  if (user.role === "seller" && !user.shopApproved) {
    return NextResponse.json({ error: "Seller account pending approval." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  if (user.role === "seller") {
    await sql(
      `update catalog_products set active = false, updated_at = now()
       where id = $1 and seller_user_id = $2`,
      [id, user.id],
    );
  } else {
    await sql(
      `update catalog_products set active = false, updated_at = now() where id = $1`,
      [id],
    );
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
