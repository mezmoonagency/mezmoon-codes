-- Mirror: real sayt + müştəri paneli. Bütün cədvəllər mirror_ prefiksi ilə, MezMoon cədvəllərindən ayrıdır.
-- Köçürmə: pg_dump -t 'public.mirror_*' ilə çıxarılır.
-- RLS aktivdir, heç bir siyasət yoxdur: məlumata yalnız mirror-api funksiyası (service role) çatır.

-- pgcrypto extensions sxemində artıq var

create table if not exists public.mirror_boards(
  id int primary key,
  name text not null,
  district text,
  type text not null check (type in ('bilbord','meqa','led','prizma','lightbox','roller')),
  size text,
  lat double precision,
  lon double precision,
  daily_traffic int,
  is_sample boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now());

create table if not exists public.mirror_clients(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  token text not null unique default encode(extensions.gen_random_bytes(18),'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now());

create table if not exists public.mirror_campaigns(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.mirror_clients(id) on delete cascade,
  board_id int not null references public.mirror_boards(id),
  creative text,                       -- loqdakı reklam faylının adı (hissəsi). Boşdursa paneldəki bütün göstərilmələr sayılır
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date));
create index if not exists mirror_campaigns_client on public.mirror_campaigns(client_id);

create table if not exists public.mirror_uploads(
  id uuid primary key default gen_random_uuid(),
  filename text,
  kind text not null check (kind in ('led','template')),
  rows int not null default 0,
  plays int not null default 0,
  day_from date,
  day_to date,
  uploaded_by uuid,
  created_at timestamptz not null default now());

-- gündəlik cəmlər: loq brauzerdə oxunub gün + panel + reklam üzrə toplanır, eyni gün təkrar yüklənsə üstündən yazılır
create table if not exists public.mirror_plays_daily(
  board_id int not null references public.mirror_boards(id),
  creative text not null default '',
  day date not null,
  plays int not null check (plays >= 0),
  hours int[],                          -- 24 elementli saatlıq bölgü (LED logunda saat varsa)
  upload_id uuid references public.mirror_uploads(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (board_id, creative, day));
create index if not exists mirror_plays_day on public.mirror_plays_daily(day);

create table if not exists public.mirror_discount_codes(
  code text primary key,
  sid text not null,
  ip_hash text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  lead_id uuid);
create index if not exists mirror_codes_sid on public.mirror_discount_codes(sid);

create table if not exists public.mirror_leads(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  company text,
  email text,
  package jsonb,
  est_price numeric,
  discount_code text,
  discount_pct int not null default 0,
  final_price numeric,
  status text not null default 'yeni' check (status in ('yeni','əlaqə saxlanıldı','razılaşdı','imtina')),
  ip_hash text);

alter table public.mirror_boards enable row level security;
alter table public.mirror_clients enable row level security;
alter table public.mirror_campaigns enable row level security;
alter table public.mirror_uploads enable row level security;
alter table public.mirror_plays_daily enable row level security;
alter table public.mirror_discount_codes enable row level security;
alter table public.mirror_leads enable row level security;

-- saytdakı 24 nümunə panel (is_sample=true). Real siyahı Mirror-dan gələndə admin səhifəsindən dəyişdirilir
insert into public.mirror_boards(id,name,district,type,size,lat,lon) values
(1,'Heydər Əliyev pr.','Nərimanov','led','4 × 8 m',40.4085,49.892),
(2,'Neftçilər pr., Bulvar','Səbail','meqa','5 × 15 m',40.369,49.842),
(3,'28 May','Nəsimi','lightbox','1.2 × 1.8 m',40.38,49.849),
(4,'Nizami küç.','Nəsimi','roller','1.2 × 1.8 m',40.3752,49.8478),
(5,'Azadlıq pr.','Binəqədi','bilbord','3 × 6 m',40.426,49.8429),
(6,'Tbilisi pr.','Yasamal','bilbord','3 × 6 m',40.396,49.8167),
(7,'Babək pr.','Xətai','prizma','3 × 6 m',40.3884,49.8643),
(8,'Ziya Bünyadov pr.','Nərimanov','meqa','5 × 15 m',40.4145,49.8528),
(9,'H. Cavid pr.','Yasamal','prizma','3 × 6 m',40.3765,49.81),
(10,'Koroğlu m.','Nərimanov','led','4 × 8 m',40.4199,49.9185),
(11,'Gənclik m.','Nərimanov','lightbox','1.2 × 1.8 m',40.4005,49.8509),
(12,'Elmlər Akademiyası','Yasamal','roller','1.2 × 1.8 m',40.3752,49.8155),
(13,'Xətai m.','Xətai','bilbord','3 × 6 m',40.3833,49.8721),
(14,'Qara Qarayev pr.','Nizami','meqa','5 × 15 m',40.4035,49.9483),
(15,'İnşaatçılar m.','Yasamal','bilbord','3 × 6 m',40.3891,49.8024),
(16,'Badamdar şossesi','Səbail','bilbord','3 × 6 m',40.342,49.8103),
(17,'Ağ şəhər','Xətai','led','4 × 8 m',40.384,49.8881),
(18,'Mərdəkan yolu','Xəzər','meqa','5 × 15 m',40.4862,50.1312),
(19,'20 Yanvar','Binəqədi','prizma','3 × 6 m',40.4041,49.8077),
(20,'Sahil m.','Səbail','lightbox','1.2 × 1.8 m',40.3718,49.8446),
(21,'Nəriman Nərimanov m.','Nərimanov','roller','1.2 × 1.8 m',40.4028,49.8706),
(22,'Hava limanı yolu','Xəzər','meqa','5 × 15 m',40.445,49.995),
(23,'Ağ Şəhər bulvarı','Xətai','lightbox','1.2 × 1.8 m',40.3768,49.8673),
(24,'Moskva pr.','Nəsimi','bilbord','3 × 6 m',40.4127,49.8028)
on conflict (id) do nothing;
