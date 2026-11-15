-- Paylaşım modulu (SMM Plan). Yalnız əlavə edir, mövcud sətirlər "manual" qalır.
create table if not exists public.smm_media(
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.smm_venues(id) on delete cascade,
  client text not null,
  kind text not null default 'foto' check (kind in ('foto','video','dizayn','story')),
  name text not null default '',
  drive_id text not null,
  mime text not null default '',
  size bigint not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists smm_media_venue_idx on public.smm_media(venue_id);
alter table public.smm_media enable row level security;
create policy smm_media_read on public.smm_media for select using (has_access());
create policy smm_media_insert on public.smm_media for insert with check (has_access() and my_role() = any (array['ceo','pm','marketing','account']));
create policy smm_media_delete on public.smm_media for delete using (my_role() = any (array['ceo','pm']));
alter publication supabase_realtime add table public.smm_media;

alter table public.smm_posts
  add column if not exists media_id uuid references public.smm_media(id) on delete set null,
  add column if not exists caption text not null default '',
  add column if not exists publish_mode text not null default 'manual' check (publish_mode in ('manual','auto','remind')),
  add column if not exists as_story boolean not null default false,
  add column if not exists publish_status text not null default '',
  add column if not exists publish_error text not null default '',
  add column if not exists publish_attempts int not null default 0,
  add column if not exists ig_container text not null default '',
  add column if not exists ig_media_id text not null default '',
  add column if not exists publish_started_at timestamptz;

alter table public.ig_accounts add column if not exists publish_ok boolean not null default false;
