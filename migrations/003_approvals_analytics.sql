-- Seller registration tri-state + review metadata
alter table seller_profiles
  add column if not exists registration_status text not null default 'pending';
alter table seller_profiles
  add column if not exists rejection_reason text not null default '';
alter table seller_profiles
  add column if not exists reviewed_at timestamptz;
alter table seller_profiles
  add column if not exists reviewed_by text references customers(id) on delete set null;

update seller_profiles
set registration_status = case when approved then 'approved' else 'pending' end
where registration_status is null
   or registration_status = 'pending' and approved = true
   or (approved = false and registration_status = 'pending');

update seller_profiles
set registration_status = 'approved'
where approved = true and registration_status <> 'approved';

-- Product approval queue (create / update proposals)
create table if not exists product_approval_requests (
  id text primary key,
  seller_user_id text not null references customers(id) on delete cascade,
  product_id text references catalog_products(id) on delete set null,
  request_type text not null check (request_type in ('create', 'update')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  proposed_json jsonb not null,
  previous_json jsonb,
  rejection_reason text not null default '',
  reviewed_by text references customers(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_approval_requests_status_idx
  on product_approval_requests(status);
create index if not exists product_approval_requests_seller_idx
  on product_approval_requests(seller_user_id);
create index if not exists product_approval_requests_created_idx
  on product_approval_requests(created_at desc);

-- Seller registration review history
create table if not exists seller_approval_events (
  id text primary key,
  seller_user_id text not null references customers(id) on delete cascade,
  action text not null check (action in ('approved', 'rejected', 'pending')),
  reason text not null default '',
  actor_id text references customers(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists seller_approval_events_seller_idx
  on seller_approval_events(seller_user_id);
