import { newId } from "@/lib/auth";
import { sql } from "@/lib/db";

export type BusinessCategory = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
};

export type SellerAgreement = {
  id: string;
  categoryId: string;
  version: number;
  title: string;
  content: string;
  status: "draft" | "published" | "inactive";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgreementAcceptanceStatus =
  | "pending"
  | "accepted"
  | "outdated"
  | "no_category"
  | "no_agreement";

export type SellerOnboardingState = {
  categoryId: string | null;
  categoryName: string | null;
  agreement: SellerAgreement | null;
  acceptanceStatus: AgreementAcceptanceStatus;
  acceptedAt?: string;
  acceptedVersion?: number;
  kycStatus: string;
  canAccessKyc: boolean;
};

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

const FOOD_TERMS = `Terms & Conditions — Food & Restaurant Sellers

1. Accurate information. Sellers must provide accurate business, restaurant, and contact information and keep it up to date.

2. FSSAI compliance. Sellers must maintain valid FSSAI registration or licence wherever legally required and produce proof on request.

3. Food quality & hygiene. Sellers are responsible for maintaining food quality, hygiene, and safety standards at all times.

4. Regulatory compliance. All food products listed must comply with applicable food safety regulations and labelling rules.

5. Product accuracy. Sellers must display accurate product descriptions, ingredients, pricing, and availability.

6. Packaging & fulfilment. Sellers are responsible for proper food packaging and timely order preparation and dispatch.

7. Customer issues. Sellers must handle customer complaints, refunds, and order-related issues according to platform policies and applicable laws.

8. Prohibited listings. Sellers must not list prohibited, expired, unsafe, adulterated, or misleading food products.

9. Government rules. Sellers must comply with all applicable central, state, and local government rules and regulations.

10. Enforcement. The platform reserves the right to suspend or terminate seller accounts for violations of these terms or applicable law.`;

const TRAVEL_TERMS = `Terms & Conditions — Tours & Travels Sellers

1. Accurate information. Sellers must provide accurate business and service information, including itineraries and contact details.

2. Registrations & permits. Sellers must maintain valid business registrations and permits wherever legally required.

3. Licensed operations. Tour operations must be conducted with appropriate licences and insurance where applicable.

4. Service clarity. Sellers must clearly disclose package prices, inclusions, exclusions, and cancellation policies.

5. Safety & quality. Sellers are responsible for customer safety and overall service quality during tours and travel services.

6. Availability. Sellers must provide accurate pickup points, schedules, and service availability.

7. Complaints & refunds. Sellers must handle customer complaints, cancellations, and refunds according to platform policies and applicable laws.

8. Legal compliance. Sellers must comply with applicable tourism, transport, and government regulations.

9. No fraud. Fraudulent listings, fake reviews, or misleading offers are prohibited.

10. Enforcement. The platform reserves the right to suspend or terminate accounts for fraudulent activities or policy violations.`;

const CAR_RENTAL_TERMS = `Terms & Conditions — Car Rental Services

1. Accurate information. Sellers must provide accurate business and vehicle/service information.

2. Registrations & permits. Sellers must maintain valid business registrations and permits wherever required.

3. Vehicle documents. All rental vehicles must have valid registration, insurance, and fitness certificates wherever applicable.

4. Driver requirements. Drivers must possess valid driving licences and meet applicable legal requirements.

5. Vehicle condition. Vehicles must be properly maintained, clean, and safe for customers.

6. Pricing transparency. Sellers must clearly mention rental prices, security deposits, additional charges, fuel policies, and cancellation policies.

7. Locations. Sellers must provide accurate pickup and drop-off locations and service availability.

8. Safety & quality. Sellers are responsible for customer safety and service quality.

9. Complaints & refunds. Sellers must handle customer complaints, cancellations, and refunds according to platform policies and applicable laws.

10. Legal compliance. Sellers must comply with applicable transportation and government regulations.

11. Enforcement. The platform reserves the right to suspend or terminate accounts for fraudulent activities or policy violations.`;

const OTHER_TERMS = `Terms & Conditions — General Business Sellers

1. Accurate information. Sellers must provide accurate business and contact information.

2. Lawful operation. Sellers must maintain any licences or permits required for their category of business.

3. Honest listings. Product and service descriptions, pricing, and availability must be accurate and not misleading.

4. Customer care. Sellers must handle complaints, cancellations, and refunds according to platform policies and applicable laws.

5. Compliance. Sellers must comply with all applicable government rules and regulations.

6. Enforcement. The platform reserves the right to suspend or terminate seller accounts for violations.`;

export async function ensureBusinessCategoriesAndAgreements(): Promise<void> {
  const categories: {
    id: string;
    name: string;
    description: string;
    sort: number;
    title: string;
    content: string;
  }[] = [
    {
      id: "food-restaurant",
      name: "Food & Restaurant",
      description: "Restaurants, cloud kitchens, and packaged food sellers",
      sort: 10,
      title: "Food & Restaurant Seller Agreement",
      content: FOOD_TERMS,
    },
    {
      id: "tours-travels",
      name: "Tours & Travels",
      description: "Tour operators and travel service providers",
      sort: 20,
      title: "Tours & Travels Seller Agreement",
      content: TRAVEL_TERMS,
    },
    {
      id: "car-rental",
      name: "Car Rental Services",
      description: "Self-drive and chauffeur car rental providers",
      sort: 30,
      title: "Car Rental Services Seller Agreement",
      content: CAR_RENTAL_TERMS,
    },
    {
      id: "other",
      name: "Other",
      description: "Other business categories expandable by admin",
      sort: 90,
      title: "General Business Seller Agreement",
      content: OTHER_TERMS,
    },
  ];

  for (const cat of categories) {
    await sql(
      `insert into business_categories (id, name, description, active, sort_order)
       values ($1,$2,$3,true,$4)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order,
         updated_at = now()`,
      [cat.id, cat.name, cat.description, cat.sort],
    );

    const existing = await sql<{ n: string | number }>(
      `select count(*)::int as n from seller_agreements where category_id = $1`,
      [cat.id],
    );
    if (Number(existing[0]?.n ?? 0) > 0) continue;

    const agreementId = newId();
    await sql(
      `insert into seller_agreements
         (id, category_id, version, title, content, status, published_at)
       values ($1,$2,1,$3,$4,'published', now())`,
      [agreementId, cat.id, cat.title, cat.content],
    );
  }
}

export async function listBusinessCategories(activeOnly = true): Promise<BusinessCategory[]> {
  await ensureBusinessCategoriesAndAgreements();
  const rows = await sql<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    sort_order: number;
  }>(
    `select id, name, description, active, sort_order
     from business_categories
     ${activeOnly ? "where active = true" : ""}
     order by sort_order asc, name asc`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    active: r.active,
    sortOrder: r.sort_order,
  }));
}

export async function getPublishedAgreement(
  categoryId: string,
): Promise<SellerAgreement | null> {
  const rows = await sql<{
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
    `select * from seller_agreements
     where category_id = $1 and status = 'published'
     order by version desc
     limit 1`,
    [categoryId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    categoryId: r.category_id,
    version: r.version,
    title: r.title,
    content: r.content,
    status: r.status as SellerAgreement["status"],
    publishedAt: iso(r.published_at),
    createdAt: iso(r.created_at) || new Date().toISOString(),
    updatedAt: iso(r.updated_at) || new Date().toISOString(),
  };
}

export async function getSellerOnboardingState(
  sellerUserId: string,
): Promise<SellerOnboardingState> {
  await ensureBusinessCategoriesAndAgreements();
  const profiles = await sql<{
    business_category_id: string | null;
    kyc_status: string | null;
    category_name: string | null;
  }>(
    `select sp.business_category_id, sp.kyc_status, bc.name as category_name
     from seller_profiles sp
     left join business_categories bc on bc.id = sp.business_category_id
     where sp.user_id = $1`,
    [sellerUserId],
  );
  const profile = profiles[0];
  const categoryId = profile?.business_category_id || null;
  const categoryName = profile?.category_name || null;
  let kycStatus = profile?.kyc_status || "locked";

  if (!categoryId) {
    return {
      categoryId: null,
      categoryName: null,
      agreement: null,
      acceptanceStatus: "no_category",
      kycStatus,
      canAccessKyc: false,
    };
  }

  const agreement = await getPublishedAgreement(categoryId);
  if (!agreement) {
    return {
      categoryId,
      categoryName,
      agreement: null,
      acceptanceStatus: "no_agreement",
      kycStatus,
      canAccessKyc: false,
    };
  }

  const accepts = await sql<{
    agreement_id: string;
    agreement_version: number;
    accepted_at: Date | string;
  }>(
    `select agreement_id, agreement_version, accepted_at
     from seller_agreement_acceptances
     where seller_user_id = $1 and category_id = $2 and accepted_status = true
     order by accepted_at desc
     limit 1`,
    [sellerUserId, categoryId],
  );
  const latest = accepts[0];
  let acceptanceStatus: AgreementAcceptanceStatus = "pending";
  if (latest) {
    acceptanceStatus =
      latest.agreement_id === agreement.id ? "accepted" : "outdated";
  }

  const canAccessKyc = acceptanceStatus === "accepted";
  if (!canAccessKyc && kycStatus !== "locked") {
    // Keep KYC locked in DB when agreement lapses
    await sql(
      `update seller_profiles set kyc_status = 'locked', updated_at = now() where user_id = $1`,
      [sellerUserId],
    );
    kycStatus = "locked";
  } else if (canAccessKyc && kycStatus === "locked") {
    await sql(
      `update seller_profiles set kyc_status = 'not_started', updated_at = now() where user_id = $1`,
      [sellerUserId],
    );
    await sql(
      `insert into seller_kyc (seller_user_id, status)
       values ($1, 'not_started')
       on conflict (seller_user_id) do update set
         status = case when seller_kyc.status = 'locked' then 'not_started' else seller_kyc.status end,
         updated_at = now()`,
      [sellerUserId],
    );
    kycStatus = "not_started";
  }

  return {
    categoryId,
    categoryName,
    agreement,
    acceptanceStatus,
    acceptedAt: latest ? iso(latest.accepted_at) : undefined,
    acceptedVersion: latest?.agreement_version,
    kycStatus,
    canAccessKyc,
  };
}

export async function recordAgreementAcceptance(input: {
  sellerUserId: string;
  agreementId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{
    id: string;
    category_id: string;
    version: number;
    status: string;
  }>(`select id, category_id, version, status from seller_agreements where id = $1`, [
    input.agreementId,
  ]);
  const agreement = rows[0];
  if (!agreement || agreement.status !== "published") {
    return { ok: false, error: "Agreement is not available for acceptance." };
  }

  const profiles = await sql<{ business_category_id: string | null }>(
    `select business_category_id from seller_profiles where user_id = $1`,
    [input.sellerUserId],
  );
  if (!profiles[0] || profiles[0].business_category_id !== agreement.category_id) {
    return { ok: false, error: "Agreement does not match your business category." };
  }

  await sql(
    `insert into seller_agreement_acceptances
       (id, seller_user_id, category_id, agreement_id, agreement_version,
        accepted_status, accepted_at, ip_address, user_agent)
     values ($1,$2,$3,$4,$5,true,now(),$6,$7)`,
    [
      newId(),
      input.sellerUserId,
      agreement.category_id,
      agreement.id,
      agreement.version,
      (input.ipAddress || "").slice(0, 120),
      (input.userAgent || "").slice(0, 400),
    ],
  );

  await sql(
    `update seller_profiles set kyc_status = 'not_started', updated_at = now() where user_id = $1`,
    [input.sellerUserId],
  );
  await sql(
    `insert into seller_kyc (seller_user_id, status)
     values ($1, 'not_started')
     on conflict (seller_user_id) do update set
       status = case when seller_kyc.status = 'locked' then 'not_started' else seller_kyc.status end,
       updated_at = now()`,
    [input.sellerUserId],
  );

  return { ok: true };
}
