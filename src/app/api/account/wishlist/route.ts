import { NextResponse } from "next/server";
import { getRequestCustomer } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const rows = await sql<{ product_id: string }>(
    `select product_id from customer_wishlist
     where customer_id = $1 order by created_at desc`,
    [customer.id],
  );
  return NextResponse.json(
    { wishlist: rows.map((r) => r.product_id) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PUT(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as { wishlist?: string[] };
  const wishlist = Array.isArray(body.wishlist)
    ? [...new Set(body.wishlist.filter((id) => typeof id === "string"))]
    : [];

  await sql(`delete from customer_wishlist where customer_id = $1`, [customer.id]);
  for (const productId of wishlist) {
    await sql(
      `insert into customer_wishlist (customer_id, product_id) values ($1, $2)
       on conflict do nothing`,
      [customer.id, productId],
    );
  }

  return NextResponse.json(
    { wishlist },
    { headers: { "cache-control": "private, no-store" } },
  );
}
