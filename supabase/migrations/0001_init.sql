-- FIREpath schema. Run in Supabase SQL editor.

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  age integer,
  fire_target_age integer,
  monthly_income numeric,
  monthly_expense numeric,
  parent_support numeric,
  tax_bracket integer default 30,
  tax_regime text default 'new',
  fire_monthly_expense numeric,
  risk_score integer,
  tier text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  snapshot_date date default current_date,
  total_corpus numeric,
  liquid_corpus numeric,
  locked_corpus numeric,
  equity_pct numeric,
  debt_pct numeric,
  gold_pct numeric,
  cash_pct numeric,
  savings_rate numeric,
  projected_fire_age numeric,
  created_at timestamptz default now()
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  snapshot_id uuid references portfolio_snapshots on delete cascade,
  category text,
  name text,
  value_inr numeric,
  monthly_contribution numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  snapshot_id uuid references portfolio_snapshots on delete cascade,
  analysis_json jsonb,
  provider text default 'gemini',
  generated_at timestamptz default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  milestone_type text,
  achieved_at timestamptz default now(),
  corpus_value numeric,
  message text
);

-- Enable RLS
alter table profiles enable row level security;
alter table portfolio_snapshots enable row level security;
alter table holdings enable row level security;
alter table ai_analyses enable row level security;
alter table milestones enable row level security;

-- Policies: users can only access their own rows
create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own snapshots all" on portfolio_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own holdings all" on holdings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own analyses all" on ai_analyses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own milestones all" on milestones for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index if not exists idx_snapshots_user_date on portfolio_snapshots(user_id, snapshot_date desc);
create index if not exists idx_holdings_snapshot on holdings(snapshot_id);
create index if not exists idx_analyses_user_date on ai_analyses(user_id, generated_at desc);
