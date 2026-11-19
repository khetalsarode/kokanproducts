/**
 * Built-in portal credentials. ensureSeeded always upserts these into the DB
 * (overwriting any previous admin / demo-seller password or email).
 */
export const DEMO_ADMIN = {
  email: "admin@kokanproducts.com",
  password: "KokanAdmin#9472",
  name: "Kokan Admin",
  phone: "9999900001",
} as const;

export const DEMO_SELLER = {
  email: "seller@kokanproducts.com",
  password: "KokanSeller#9472",
  name: "Konkan Seller",
  phone: "9999900002",
  shopName: "Konkan Seller Shop",
  location: "Konkan, Maharashtra",
} as const;
