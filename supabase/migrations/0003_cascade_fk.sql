-- Add ON DELETE CASCADE to child tables so deleting a snapshot cascades to holdings and analyses.
-- Run this in Supabase SQL editor before production launch.

alter table holdings
  drop constraint if exists holdings_snapshot_id_fkey,
  add constraint holdings_snapshot_id_fkey
    foreign key (snapshot_id) references portfolio_snapshots(id)
    on delete cascade;

alter table ai_analyses
  drop constraint if exists ai_analyses_snapshot_id_fkey,
  add constraint ai_analyses_snapshot_id_fkey
    foreign key (snapshot_id) references portfolio_snapshots(id)
    on delete cascade;
