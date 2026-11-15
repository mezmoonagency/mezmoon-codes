-- HighLevel oyunu: qeydiyyat, Telegram təsdiqi, hədiyyə kodları.
-- Yalnız YENİ cədvəllər yaradır (hl_ prefiksi), mövcud cədvəllərə toxunmur.
-- Bütün cədvəllərdə RLS açıqdır və heç bir policy yoxdur: yalnız hl-game funksiyası (service role) oxuyub yaza bilir.

create table if not exists public.hl_players (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,              -- 994XXXXXXXXX
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  tg_user_id bigint,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.hl_otp (
  token text primary key,                  -- brauzerə verilən təsadüfi açar (t.me/...?start=token)
  phone text not null,
  payload jsonb not null default '{}'::jsonb,   -- ad, soyad, doğum tarixi (qeydiyyat üçün); girişdə boş
  code text,                               -- bot nömrəni təsdiqləyəndən sonra yaradılan 4 rəqəm
  tg_user_id bigint,
  status text not null default 'pending',  -- pending | verified | used
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index if not exists hl_otp_tg on public.hl_otp (tg_user_id, created_at desc);

create table if not exists public.hl_sessions (
  token text primary key,
  player_id uuid not null references public.hl_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);

create table if not exists public.hl_gifts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.hl_players(id) on delete cascade,
  code text not null unique,               -- HL-1234
  prize text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  redeemed_at timestamptz,
  redeemed_by text
);
create index if not exists hl_gifts_player on public.hl_gifts (player_id, created_at desc);

alter table public.hl_players  enable row level security;
alter table public.hl_otp      enable row level security;
alter table public.hl_sessions enable row level security;
alter table public.hl_gifts    enable row level security;

revoke all on public.hl_players, public.hl_otp, public.hl_sessions, public.hl_gifts from anon, authenticated;
