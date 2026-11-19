create table if not exists customers (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_customer_id_idx on sessions(customer_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists customer_addresses (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  label text not null default 'Home',
  name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null default 'Maharashtra',
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_id_idx on customer_addresses(customer_id);

create table if not exists customer_wishlist (
  customer_id text not null references customers(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists customer_orders (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_orders_customer_id_idx on customer_orders(customer_id);
