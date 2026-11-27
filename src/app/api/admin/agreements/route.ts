import { NextResponse } from "next/server";
import { newId, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  ensureBusinessCategoriesAndAgreements,
  listBusinessCategories,
} from "@/lib/sellerAgreements";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  await ensureBusinessCategoriesAndAgreements();

  const categories = await listBusinessCategories(false);
  const agreements = await sql<{
    id: string;
    category_id: string;
    version: number;
    title: string;
    content: string;
    status: string;
    published_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }>(
    `select * from seller_agreements order by category_id asc, version desc`,
  );

  const acceptances = await sql<{
    id: string;
    seller_user_id: string;
    seller_name: string;
    seller_email: string;
    shop_name: string | null;
    category_id: string;
    category_name: string;
    agreement_id: string;
    agreement_version: number;
    accepted_at: Date | string;
  }>(
    `select a.id, a.seller_user_id, c.name as seller_name, c.email as seller_email,
            sp.shop_name, a.category_id, bc.name as category_name,
            a.agreement_id, a.agreement_version, a.accepted_at
     from seller_agreement_acceptances a
     join customers c on c.id = a.seller_user_id
     left join seller_profiles sp on sp.user_id = a.seller_user_id
     left join business_categories bc on bc.id = a.category_id
     where a.accepted_status = true
     order by a.accepted_at desc
     limit 200`,
  );

  const pending = await sql<{
    user_id: string;
    name: string;
    email: string;
    shop_name: string;
    category_id: string | null;
    category_name: string | null;
    published_version: number | null;
  }>(
    `select sp.user_id, c.name, c.email, sp.shop_name, sp.business_category_id as category_id,
            bc.name as category_name, sa.version as published_version
     from seller_profiles sp
     join customers c on c.id = sp.user_id
     left join business_categories bc on bc.id = sp.business_category_id
     left join seller_agreements sa
       on sa.category_id = sp.business_category_id and sa.status = 'published'
     where sp.business_category_id is not null
       and sa.id is not null
       and not exists (
         select 1 from seller_agreement_acceptances a
         where a.seller_user_id = sp.user_id
           and a.agreement_id = sa.id
           and a.accepted_status = true
       )
     order by c.name asc`,
  );

  return NextResponse.json(
    {
      categories,
      agreements: agreements.map((a) => ({
        id: a.id,
        categoryId: a.category_id,
        version: a.version,
        title: a.title,
        content: a.content,
        status: a.status,
        publishedAt:
          typeof a.published_at === "string"
            ? a.published_at
            : a.published_at?.toISOString(),
        createdAt:
          typeof a.created_at === "string" ? a.created_at : a.created_at.toISOString(),
        updatedAt:
          typeof a.updated_at === "string" ? a.updated_at : a.updated_at.toISOString(),
      })),
      acceptances: acceptances.map((a) => ({
        id: a.id,
        sellerUserId: a.seller_user_id,
        sellerName: a.seller_name,
        sellerEmail: a.seller_email,
        shopName: a.shop_name,
        categoryId: a.category_id,
        categoryName: a.category_name,
        agreementId: a.agreement_id,
        agreementVersion: a.agreement_version,
        acceptedAt:
          typeof a.accepted_at === "string" ? a.accepted_at : a.accepted_at.toISOString(),
      })),
      pendingSellers: pending.map((p) => ({
        userId: p.user_id,
        name: p.name,
        email: p.email,
        shopName: p.shop_name,
        categoryId: p.category_id,
        categoryName: p.category_name,
        publishedVersion: p.published_version,
      })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  await ensureBusinessCategoriesAndAgreements();

  const body = (await request.json()) as {
    action?: string;
    categoryId?: string;
    name?: string;
    description?: string;
    title?: string;
    content?: string;
    publish?: boolean;
    active?: boolean;
  };

  // Expandable categories without code changes
  if (body.action === "create_category") {
    const name = (body.name || "").trim();
    const description = (body.description || "").trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }
    const slug =
      (body.categoryId || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!slug) {
      return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
    }
    const sortRows = await sql<{ v: number }>(
      `select coalesce(max(sort_order), 0)::int as v from business_categories`,
    );
    const sortOrder = Number(sortRows[0]?.v ?? 0) + 10;
    await sql(
      `insert into business_categories (id, name, description, active, sort_order)
       values ($1,$2,$3,true,$4)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         active = true,
         updated_at = now()`,
      [slug, name, description, sortOrder],
    );
    return NextResponse.json(
      { ok: true, categoryId: slug },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  if (body.action === "toggle_category") {
    const categoryId = (body.categoryId || "").trim();
    if (!categoryId) {
      return NextResponse.json({ error: "Missing category id." }, { status: 400 });
    }
    await sql(
      `update business_categories set active = $1, updated_at = now() where id = $2`,
      [body.active !== false, categoryId],
    );
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  }

  const categoryId = (body.categoryId || "").trim();
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();
  if (!categoryId || !title || content.length < 20) {
    return NextResponse.json(
      { error: "Category, title, and agreement content are required." },
      { status: 400 },
    );
  }

  const versions = await sql<{ v: number }>(
    `select coalesce(max(version), 0)::int as v from seller_agreements where category_id = $1`,
    [categoryId],
  );
  const nextVersion = Number(versions[0]?.v ?? 0) + 1;
  const id = newId();
  const status = body.publish ? "published" : "draft";

  if (body.publish) {
    await sql(
      `update seller_agreements
       set status = 'inactive', updated_at = now()
       where category_id = $1 and status = 'published'`,
      [categoryId],
    );
  }

  await sql(
    `insert into seller_agreements
       (id, category_id, version, title, content, status, published_at, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      categoryId,
      nextVersion,
      title,
      content,
      status,
      body.publish ? new Date().toISOString() : null,
      user.id,
    ],
  );

  return NextResponse.json(
    { ok: true, id, version: nextVersion, status },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    content?: string;
    status?: "draft" | "published" | "inactive";
  };
  const id = (body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
  }

  const rows = await sql<{ id: string; category_id: string; status: string }>(
    `select id, category_id, status from seller_agreements where id = $1`,
    [id],
  );
  const current = rows[0];
  if (!current) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  const nextStatus = body.status || current.status;
  if (nextStatus === "published") {
    await sql(
      `update seller_agreements
       set status = 'inactive', updated_at = now()
       where category_id = $1 and status = 'published' and id <> $2`,
      [current.category_id, id],
    );
  }

  await sql(
    `update seller_agreements set
       title = coalesce(nullif($1, ''), title),
       content = coalesce(nullif($2, ''), content),
       status = $3,
       published_at = case when $3 = 'published' then coalesce(published_at, now()) else published_at end,
       updated_at = now()
     where id = $4`,
    [body.title?.trim() || "", body.content?.trim() || "", nextStatus, id],
  );

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
