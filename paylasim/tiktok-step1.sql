-- Paylaşım: Instagram + TikTok (TikTok API sonra). Yalnız sütun əlavə edir.
alter table public.smm_posts
  add column if not exists platforms text[] not null default '{instagram}',
  add column if not exists caption_tt text not null default '';
alter table public.smm_venues
  add column if not exists tt_link text not null default '';
