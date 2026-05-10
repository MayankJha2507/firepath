create table if not exists nri_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz default now()
);

alter table nri_waitlist enable row level security;

-- Anyone can insert (public waitlist signup)
create policy "public can join waitlist"
  on nri_waitlist for insert
  to anon, authenticated
  with check (true);

-- Only service role can read
create policy "service role can read waitlist"
  on nri_waitlist for select
  to service_role
  using (true);
