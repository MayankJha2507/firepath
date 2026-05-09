-- Phase 3.5: Quick Start onboarding + data completeness tracking

alter table profiles add column if not exists income_range text;
alter table profiles add column if not exists expense_range text;
alter table profiles add column if not exists savings_range text;
alter table profiles add column if not exists fire_expense_range text;
alter table profiles add column if not exists years_working integer default 5;
alter table profiles add column if not exists data_completeness jsonb default '{
  "income": "estimated",
  "expenses": "estimated",
  "savings": "estimated",
  "indian_stocks": "missing",
  "us_stocks": "missing",
  "mutual_funds": "missing",
  "gold": "missing",
  "epf": "estimated",
  "nps": "missing",
  "ppf": "missing",
  "sips": "missing"
}';

-- RLS refresh: drop and recreate all policies to ensure clean state
-- (safe to re-run; drop if exists prevents errors)

alter table profiles enable row level security;
alter table holdings enable row level security;
alter table portfolio_snapshots enable row level security;
alter table ai_analyses enable row level security;
alter table milestones enable row level security;

drop policy if exists "own profile select" on profiles;
drop policy if exists "own profile insert" on profiles;
drop policy if exists "own profile update" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

drop policy if exists "own snapshots all" on portfolio_snapshots;
drop policy if exists "Users can manage own snapshots" on portfolio_snapshots;
create policy "Users can manage own snapshots" on portfolio_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own holdings all" on holdings;
drop policy if exists "Users can manage own holdings" on holdings;
create policy "Users can manage own holdings" on holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own analyses all" on ai_analyses;
drop policy if exists "Users can manage own analyses" on ai_analyses;
create policy "Users can manage own analyses" on ai_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own milestones all" on milestones;
drop policy if exists "Users can manage own milestones" on milestones;
create policy "Users can manage own milestones" on milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Grants (required alongside RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on portfolio_snapshots to authenticated;
grant select, insert, update, delete on holdings to authenticated;
grant select, insert, update, delete on ai_analyses to authenticated;
grant select, insert, update, delete on milestones to authenticated;
