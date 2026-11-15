create table public.ad_issues(
  id uuid primary key default gen_random_uuid(),
  client text not null,
  note text not null,
  status text not null default 'Açıq',
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  resolved_by_name text,
  resolved_at timestamptz
);
alter table public.ad_issues enable row level security;
create policy acc_all on public.ad_issues for all using (has_access()) with check (has_access());
revoke all on public.ad_issues from anon;
alter publication supabase_realtime add table public.ad_issues;
