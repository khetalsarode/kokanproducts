import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";

export const SESSION_COOKIE = "kp_session";
const SESSION_DAYS = 30;

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
};

type CustomerRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  created_at: Date | string;
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(customerId: string): Promise<string> {
  const token = newSessionToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  await sql(
    `insert into sessions (id, customer_id, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [newId(), customerId, hashToken(token), expires.toISOString()],
  );
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await sql(`delete from sessions where token_hash = $1`, [hashToken(token)]);
}

export async function getCustomerByEmail(
  email: string,
): Promise<(Customer & { passwordHash: string }) | null> {
  const rows = await sql<CustomerRow & { password_hash: string }>(
    `select id, email, name, phone, created_at, password_hash
     from customers where lower(email) = lower($1) limit 1`,
    [email.trim()],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...mapCustomer(row), passwordHash: row.password_hash };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const rows = await sql<CustomerRow>(
    `select id, email, name, phone, created_at from customers where id = $1`,
    [id],
  );
  return rows[0] ? mapCustomer(rows[0]) : null;
}

export async function getSessionCustomer(
  token: string | undefined,
): Promise<Customer | null> {
  if (!token) return null;
  const rows = await sql<CustomerRow>(
    `select c.id, c.email, c.name, c.phone, c.created_at
     from sessions s
     join customers c on c.id = s.customer_id
     where s.token_hash = $1 and s.expires_at > now()
     limit 1`,
    [hashToken(token)],
  );
  return rows[0] ? mapCustomer(rows[0]) : null;
}

export async function getRequestCustomer(): Promise<Customer | null> {
  const jar = await cookies();
  return getSessionCustomer(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
