-- Expandable business categories for seller onboarding
create table if not exists business_categories (
  id text primary key,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table seller_profiles
  add column if not exists business_category_id text references business_categories(id);
alter table seller_profiles
  add column if not exists kyc_status text not null default 'locked';

-- Versioned category agreements (draft / published / inactive)
create table if not exists seller_agreements (
  id text primary key,
  category_id text not null references business_categories(id) on delete cascade,
  version integer not null,
  title text not null,
  content text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'inactive')),
  published_at timestamptz,
  created_by text references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, version)
);

create index if not exists seller_agreements_category_status_idx
  on seller_agreements (category_id, status);

-- At most one published agreement per category
create unique index if not exists seller_agreements_one_published_idx
  on seller_agreements (category_id)
  where status = 'published';

-- Immutable acceptance audit trail (never overwrite; insert new rows)
create table if not exists seller_agreement_acceptances (
  id text primary key,
  seller_user_id text not null references customers(id) on delete cascade,
  category_id text not null references business_categories(id),
  agreement_id text not null references seller_agreements(id),
  agreement_version integer not null,
  accepted_status boolean not null default true,
  accepted_at timestamptz not null default now(),
  ip_address text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_agreement_acceptances_seller_idx
  on seller_agreement_acceptances (seller_user_id, accepted_at desc);
create index if not exists seller_agreement_acceptances_agreement_idx
  on seller_agreement_acceptances (agreement_id);

-- Minimal KYC record; stays locked until current agreement is accepted
create table if not exists seller_kyc (
  seller_user_id text primary key references customers(id) on delete cascade,
  status text not null default 'locked'
    check (status in ('locked', 'not_started', 'submitted', 'approved', 'rejected')),
  legal_name text not null default '',
  business_pan text not null default '',
  document_notes text not null default '',
  rejection_reason text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
