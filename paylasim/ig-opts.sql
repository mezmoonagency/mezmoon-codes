alter table public.smm_posts add column if not exists ig_opts jsonb not null default '{}'::jsonb;
