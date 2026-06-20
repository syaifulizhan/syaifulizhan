-- Skema moderasi Dewan Izhan (Supabase/Postgres).
-- Korpus hadis/perawi ada di Turso; Supabase hanya pegang cadangan pembetulan + auth.
-- Pengguna CADANG → admin LULUS (bukan edit terus).
-- Jadual di skema `public` supaya terdedah pada Supabase REST (PostgREST/HTTP) —
-- penting utk akses dari Cloudflare (tiada TCP pg di edge).

drop schema if exists app cascade;

create table if not exists public.correction_suggestions (
  id             bigint generated always as identity primary key,
  entity_type    text not null check (entity_type in ('hadith','narrator','translation')),
  entity_id      bigint not null,                 -- id dalam korpus Turso (tiada FK silang-DB)
  lang           text,                            -- 'ms' | 'en' | 'ar' atau null
  field          text,                            -- 'translation' | 'matn' | 'rutbah' | 'bio' …
  current_text   text,
  suggested_text text not null,
  reason         text,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitter      text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewer       text
);
create index if not exists idx_cs_status on public.correction_suggestions(status, created_at desc);
create index if not exists idx_cs_entity on public.correction_suggestions(entity_type, entity_id);

alter table public.correction_suggestions enable row level security;

-- Sesiapa (anon/authenticated) boleh HANTAR cadangan baharu (status mesti 'pending').
drop policy if exists cs_insert_anyone on public.correction_suggestions;
create policy cs_insert_anyone on public.correction_suggestions
  for insert to anon, authenticated
  with check (status = 'pending');

-- Tiada policy SELECT/UPDATE utk anon → hanya service_role (admin di server) baca & lulus/tolak.
