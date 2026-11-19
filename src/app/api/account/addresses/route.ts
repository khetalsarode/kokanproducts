import { NextResponse } from "next/server";
import { getRequestCustomer, newId } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { Address } from "@/types";

export const dynamic = "force-dynamic";

type AddressRow = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2 || undefined,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  };
}

export async function GET() {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const rows = await sql<AddressRow>(
    `select id, label, name, phone, line1, line2, city, state, pincode, is_default
     from customer_addresses where customer_id = $1
     order by is_default desc, created_at asc`,
    [customer.id],
  );
  return NextResponse.json(
    { addresses: rows.map(mapAddress) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as Partial<Address>;
  if (!body.name || !body.line1 || !body.city || !body.pincode) {
    return NextResponse.json({ error: "Address is incomplete." }, { status: 400 });
  }
  const isDefault = Boolean(body.isDefault);
  if (isDefault) {
    await sql(
      `update customer_addresses set is_default = false where customer_id = $1`,
      [customer.id],
    );
  }

  if (body.id) {
    const owned = await sql<{ id: string }>(
      `select id from customer_addresses where id = $1 and customer_id = $2 limit 1`,
      [body.id, customer.id],
    );
    if (!owned[0]) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    await sql(
      `update customer_addresses set
         label = $1, name = $2, phone = $3, line1 = $4, line2 = $5,
         city = $6, state = $7, pincode = $8, is_default = $9
       where id = $10 and customer_id = $11`,
      [
        body.label || "Home",
        body.name,
        body.phone || "—",
        body.line1,
        body.line2 || "",
        body.city,
        body.state || "Maharashtra",
        body.pincode,
        isDefault,
        body.id,
        customer.id,
      ],
    );
  } else {
    await sql(
      `insert into customer_addresses
        (id, customer_id, label, name, phone, line1, line2, city, state, pincode, is_default)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        newId(),
        customer.id,
        body.label || "Home",
        body.name,
        body.phone || "—",
        body.line1,
        body.line2 || "",
        body.city,
        body.state || "Maharashtra",
        body.pincode,
        isDefault,
      ],
    );
  }
  return GET();
}

export async function DELETE(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing address id." }, { status: 400 });
  }
  await sql(
    `delete from customer_addresses where id = $1 and customer_id = $2`,
    [id, customer.id],
  );
  return GET();
}
