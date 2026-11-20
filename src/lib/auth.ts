import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "./db";

export const SESSION_COOKIE = "kp_session";
const SESSION_DAYS = 30;

export type UserRole = "customer" | "seller" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  status: string;
  createdAt: string;
  shopName?: string;
  shopApproved?: boolean;
  registrationStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
};

/** @deprecated use AuthUser — kept for gradual rename */
export type Customer = AuthUser;

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  created_at: Date | string;
  shop_name?: string | null;
  approved?: boolean | null;
  registration_status?: string | null;
  rejection_reason?: string | null;
};

function mapUser(row: UserRow): AuthUser {
  const registrationStatus = (row.registration_status ||
    (row.approved ? "approved" : undefined)) as
    | "pending"
    | "approved"
    | "rejected"
    | undefined;
  const shopApproved =
    registrationStatus === "approved" || row.approved === true;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: (row.role as UserRole) || "customer",
    status: row.status || "active",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
    shopName: row.shop_name ?? undefined,
    shopApproved,
    registrationStatus,
    rejectionReason: row.rejection_reason || undefined,
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

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  await sql(
    `insert into sessions (id, customer_id, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [newId(), userId, hashToken(token), expires.toISOString()],
  );
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await sql(`delete from sessions where token_hash = $1`, [hashToken(token)]);
}

const USER_SELECT = `
  c.id, c.email, c.name, c.phone, c.role, c.status, c.created_at,
  sp.shop_name, sp.approved, sp.registration_status, sp.rejection_reason
`;

export async function getUserByEmail(
  email: string,
): Promise<(AuthUser & { passwordHash: string }) | null> {
  const rows = await sql<UserRow & { password_hash: string }>(
    `select ${USER_SELECT}, c.password_hash
     from customers c
     left join seller_profiles sp on sp.user_id = c.id
     where lower(c.email) = lower($1) limit 1`,
    [email.trim()],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...mapUser(row), passwordHash: row.password_hash };
}

/** @deprecated */
export const getCustomerByEmail = getUserByEmail;

export async function getUserById(id: string): Promise<AuthUser | null> {
  const rows = await sql<UserRow>(
    `select ${USER_SELECT}
     from customers c
     left join seller_profiles sp on sp.user_id = c.id
     where c.id = $1`,
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

/** @deprecated */
export const getCustomerById = getUserById;

export async function getSessionUser(
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token) return null;
  const rows = await sql<UserRow>(
    `select ${USER_SELECT}
     from sessions s
     join customers c on c.id = s.customer_id
     left join seller_profiles sp on sp.user_id = c.id
     where s.token_hash = $1 and s.expires_at > now()
     limit 1`,
    [hashToken(token)],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getRequestUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  return getSessionUser(jar.get(SESSION_COOKIE)?.value);
}

/** @deprecated */
export const getRequestCustomer = getRequestUser;
/** @deprecated */
export const getSessionCustomer = getSessionUser;

export async function requireUser(
  roles?: UserRole[],
): Promise<AuthUser | NextResponse> {
  const user = await getRequestUser();
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (roles && !roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (user.role === "seller" && user.shopApproved === false && roles?.includes("seller")) {
    // sellers can still log in to dashboard; product mutations check approval separately
  }
  return user;
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
