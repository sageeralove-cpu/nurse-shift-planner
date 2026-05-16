-- Run this once in Supabase SQL Editor
-- nurse-shift-planner setup

-- Access codes table
create table if not exists access_codes (
  id bigserial primary key,
  code text unique not null,
  email text,
  used boolean default false,
  created_at timestamptz default now(),
  used_at timestamptz
);

-- Reviews / community table
create table if not exists reviews (
  id bigserial primary key,
  name text not null,
  role text,
  rating integer check (rating between 1 and 5),
  message text not null,
  approved boolean default false,
  created_at timestamptz default now()
);

-- Index for fast code lookup
create index if not exists access_codes_code_idx on access_codes(code);

-- Enable Row Level Security
alter table access_codes enable row level security;
alter table reviews enable row level security;

-- Allow server-side (service_role) full access — handled by our API
-- Allow anonymous reads on approved reviews
create policy "read approved reviews" on reviews
  for select using (approved = true);

-- Allow anyone to insert a review (pending moderation)
create policy "submit review" on reviews
  for insert with check (true);
