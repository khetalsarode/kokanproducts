-- Durable rate limiting (shared across instances)
create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  hit_count integer not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limit_buckets_reset_idx
  on rate_limit_buckets (reset_at);

-- Online payment stock holds expire automatically
alter table shop_orders
  add column if not exists payment_hold_until timestamptz;

create index if not exists shop_orders_payment_hold_idx
  on shop_orders (payment_status, payment_hold_until)
  where payment_status = 'awaiting_gateway';
