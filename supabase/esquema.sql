-- Gestión Pro Total — esquema para Supabase.
-- Ejecútalo UNA vez en tu proyecto: Supabase → SQL Editor → pegar → Run.

create table if not exists public.registros (
  entidad text not null,
  id text not null,
  data jsonb not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  primary key (entidad, id)
);
create index if not exists registros_entidad_idx on public.registros (entidad);

alter table public.registros enable row level security;
drop policy if exists "usuarios entran" on public.registros;
create policy "usuarios entran" on public.registros
  for all to authenticated using (true) with check (true);

-- Archivos (fotos, firmas, planos): cubo público «archivos».
insert into storage.buckets (id, name, public) values ('archivos', 'archivos', true)
  on conflict (id) do nothing;
drop policy if exists "archivos suben" on storage.objects;
create policy "archivos suben" on storage.objects
  for insert to authenticated with check (bucket_id = 'archivos');
drop policy if exists "archivos ven" on storage.objects;
create policy "archivos ven" on storage.objects
  for select using (bucket_id = 'archivos');
drop policy if exists "archivos cambian" on storage.objects;
create policy "archivos cambian" on storage.objects
  for update to authenticated using (bucket_id = 'archivos');

-- Recomendado: en Authentication → Providers → Email, desactiva «Allow new users to sign up»
-- cuando ya hayas creado las cuentas de tu equipo.
