-- TikTok paylaşım ayarları (kim baxa bilər, şərh, duet, stitch, AI işarəsi)
alter table public.smm_posts add column if not exists tt_opts jsonb not null default '{}'::jsonb;
