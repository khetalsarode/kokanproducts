-- Phone uniqueness (non-empty) + OTP / verification codes for customer auth
create unique index if not exists customers_phone_unique_idx
  on customers (phone)
  where phone is not null and phone <> '';

create table if not exists auth_verification_codes (
  id text primary key,
  channel text not null check (channel in ('email', 'phone')),
  destination text not null,
  purpose text not null check (purpose in ('register', 'login')),
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_verification_codes_dest_idx
  on auth_verification_codes (channel, destination, purpose);

create table if not exists auth_verification_tokens (
  id text primary key,
  channel text not null check (channel in ('email', 'phone')),
  destination text not null,
  purpose text not null check (purpose in ('register', 'login')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_verification_tokens_hash_idx
  on auth_verification_tokens (token_hash);

-- Optional seller business fields
alter table seller_profiles
  add column if not exists business_address text not null default '';
alter table seller_profiles
  add column if not exists gstin text not null default '';
alter table seller_profiles
  add column if not exists fssai_license text not null default '';
