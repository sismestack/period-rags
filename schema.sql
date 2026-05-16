-- Period Rags — Supabase Schema
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştır

-- PROFILES (kullanıcılar)
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- EVENTS (etkinlikler)
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text,
  cover text,
  date date,
  time text,
  location text default 'Hawick, Los Santos',
  description text,
  content text,
  image_url text,
  featured boolean default false,
  created_at timestamptz default now()
);

-- GALLERY (galeri)
create table if not exists gallery (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  caption text default '',
  large boolean default false,
  is_static boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- RLS politikaları (herkese okuma, herkes yazabilir — admin kontrolü frontend'de)
alter table profiles enable row level security;
alter table events   enable row level security;
alter table gallery  enable row level security;

create policy "Public read profiles"  on profiles for select using (true);
create policy "Public insert profiles" on profiles for insert with check (true);

create policy "Public read events"   on events for select using (true);
create policy "Public all events"    on events for all using (true);

create policy "Public read gallery"  on gallery for select using (true);
create policy "Public all gallery"   on gallery for all using (true);

-- Admin hesabını ekle (şifre: 123456 → SHA-256 hash)
insert into profiles (username, password_hash, is_admin)
values ('simse', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', true)
on conflict (username) do nothing;

-- Varsayılan galeri görselleri
insert into gallery (image_url, caption, large, is_static, sort_order) values
('./iç mekan.png',  'İç Mekan',  true,  true, 1),
('./dış mekan.png', 'Dış Mekan', false, true, 2),
('./tabela.png',    'Tabela',    false, true, 3),
('./dış mekan.png', '',          true,  true, 4),
('./iç mekan.png',  '',          false, true, 5)
on conflict do nothing;
