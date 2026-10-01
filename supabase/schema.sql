-- ============================================================================
--  Votación de Moción — Schema de Supabase
--  Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run
--  Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================== CONFIG ======================================
create table if not exists public.assembly_config (
  id          smallint primary key default 1 check (id = 1),
  roster_size int        not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.assembly_config (id, roster_size)
values (1, 0)
on conflict (id) do nothing;

-- ============================== ADMINS ======================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ============================== MEMBERS =====================================
create table if not exists public.members (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  photo_url  text,
  created_at timestamptz not null default now()
);

-- Evita nombres repetidos (ignora mayúsculas/minúsculas y espacios extremos).
create unique index if not exists members_name_unique
  on public.members (lower(btrim(name)));

-- ============================== MOTIONS =====================================
do $$ begin
  create type public.motion_status as enum ('idle', 'voting', 'concluded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.motion_result as enum ('approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.motions (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null default 'Moción',
  status             public.motion_status not null default 'idle',
  time_limit_seconds int  not null default 60,
  ends_at            timestamptz,
  result             public.motion_result,
  created_at         timestamptz not null default now()
);

-- ============================== VOTES =======================================
do $$ begin
  create type public.vote_choice as enum ('aye', 'nay');
exception when duplicate_object then null; end $$;

create table if not exists public.votes (
  motion_id  uuid not null references public.motions on delete cascade,
  member_id  uuid not null references public.members on delete cascade,
  choice     public.vote_choice not null,
  updated_at timestamptz not null default now(),
  primary key (motion_id, member_id)
);

-- ============================== RLS =========================================
alter table public.assembly_config enable row level security;
alter table public.members        enable row level security;
alter table public.motions        enable row level security;
alter table public.votes          enable row level security;
alter table public.admins         enable row level security;

-- config: lectura pública, escritura sólo admin
drop policy if exists config_read on public.assembly_config;
create policy config_read on public.assembly_config for select using (true);

drop policy if exists config_write on public.assembly_config;
create policy config_write on public.assembly_config for all
  using (public.is_admin()) with check (public.is_admin());

-- members: lectura pública, cada quien sólo su fila
drop policy if exists members_read on public.members;
create policy members_read on public.members for select using (true);

drop policy if exists members_insert_self on public.members;
create policy members_insert_self on public.members for insert
  with check (auth.uid() = id);

drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- motions: lectura pública, escritura sólo admin
drop policy if exists motions_read on public.motions;
create policy motions_read on public.motions for select using (true);

drop policy if exists motions_write on public.motions;
create policy motions_write on public.motions for all
  using (public.is_admin()) with check (public.is_admin());

-- votes: lectura pública, cada quien sólo su voto (insert/update = upsert)
drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select using (true);

drop policy if exists votes_insert_self on public.votes;
create policy votes_insert_self on public.votes for insert
  with check (auth.uid() = member_id);

drop policy if exists votes_update_self on public.votes;
create policy votes_update_self on public.votes for update
  using (auth.uid() = member_id) with check (auth.uid() = member_id);

-- admins: sólo admin
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin());

-- ============================== REALTIME ====================================
do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.motions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.votes;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.assembly_config;
exception when duplicate_object then null; end $$;

-- ============================== GRANTS ======================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update on public.members to authenticated;
grant insert, update on public.votes to authenticated;
grant insert, update, delete on public.motions to authenticated;
grant insert, update on public.assembly_config to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Quita privilegios peligrosos que Supabase concede por defecto.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- ============================== STORAGE =====================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists photos_auth_insert on storage.objects;
create policy photos_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');
