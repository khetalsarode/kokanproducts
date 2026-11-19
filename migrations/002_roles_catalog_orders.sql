alter table customers add column if not exists role text not null default 'customer';
alter table customers add column if not exists status text not null default 'active';

create table if not exists seller_profiles (
  user_id text primary key references customers(id) on delete cascade,
  shop_name text not null,
  location text not null default 'Konkan',
  bio text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists catalog_products (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  category text not null,
  description text not null default '',
  price integer not null,
  mrp integer not null,
  unit text not null default 'pack',
  weight text not null default '',
  stock integer not null default 0,
  seller_user_id text references customers(id) on delete set null,
  fulfillment text not null default 'internal',
  rating numeric not null default 4.5,
  review_count integer not null default 0,
  tags text not null default '',
  accent text not null default '#0c4a46',
  image_url text not null default '',
  image_url_2 text not null default '',
  fssai boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_products_seller_idx on catalog_products(seller_user_id);
create index if not exists catalog_products_category_idx on catalog_products(category);

create table if not exists shop_orders (
  id text primary key,
  customer_id text references customers(id) on delete set null,
  status text not null default 'placed',
  payment_method text not null,
  payment_status text not null default 'pending',
  payment_provider text not null default 'none',
  subtotal integer not null,
  discount integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null,
  coupon_code text,
  tracking_id text not null,
  courier text not null default 'Delhivery',
  estimated_delivery timestamptz,
  address_json jsonb not null,
  items_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_customer_idx on shop_orders(customer_id);
create index if not exists shop_orders_status_idx on shop_orders(status);
