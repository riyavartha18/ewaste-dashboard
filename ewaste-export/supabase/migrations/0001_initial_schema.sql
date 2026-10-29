-- E-Waste Submission Portal — Supabase schema, RLS policies and storage setup
-- Run this script once in the Supabase SQL Editor (or via `supabase db push`).
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text not null,
  submission_date date not null,
  status          text not null default 'draft' check (status in ('completed','draft')),
  description     text,
  external_links  jsonb not null default '[]'::jsonb,
  published       boolean not null default false,
  owner_email     text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists submissions_submission_date_idx on public.submissions (submission_date desc);
create index if not exists submissions_status_idx on public.submissions (status);
create index if not exists submissions_published_idx on public.submissions (published);
create index if not exists submissions_owner_email_idx on public.submissions (owner_email);

create table if not exists public.submission_files (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_name     text not null,
  file_path     text not null,   -- path inside the "submissions" storage bucket
  file_type     text not null,
  file_size     bigint not null,
  created_at    timestamptz not null default now()
);

create index if not exists submission_files_submission_id_idx on public.submission_files (submission_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;

-- Public read access for published submissions only.
drop policy if exists "Public can read published submissions" on public.submissions;
create policy "Public can read published submissions" on public.submissions
  for select
  using (published = true);

drop policy if exists "Public can read files of published submissions" on public.submission_files;
create policy "Public can read files of published submissions" on public.submission_files
  for select
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.published = true
    )
  );

-- The owner (matched by JWT email) has full access to their own rows.
drop policy if exists "Owner full access to submissions" on public.submissions;
create policy "Owner full access to submissions" on public.submissions
  for all
  using (auth.jwt() ->> 'email' = owner_email)
  with check (auth.jwt() ->> 'email' = owner_email);

drop policy if exists "Owner full access to submission_files" on public.submission_files;
create policy "Owner full access to submission_files" on public.submission_files
  for all
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and s.owner_email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and s.owner_email = (auth.jwt() ->> 'email')
    )
  );

-- ============================================================================
-- 3. STORAGE BUCKET & POLICIES
-- ============================================================================

-- Create a PRIVATE storage bucket. Files are served to the public only via
-- server-side signed URLs from the service-role client.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do update set public = false;

-- Owner can upload / read / delete files inside submissions/<owner_email>/...
drop policy if exists "Owner can upload submission files" on storage.objects;
create policy "Owner can upload submission files" on storage.objects
  for insert
  with check (
    bucket_id = 'submissions'
    and (auth.jwt() ->> 'email') = split_part(name, '/', 1)
  );

drop policy if exists "Owner can read submission files" on storage.objects;
create policy "Owner can read submission files" on storage.objects
  for select
  using (
    bucket_id = 'submissions'
    and (auth.jwt() ->> 'email') = split_part(name, '/', 1)
  );

drop policy if exists "Owner can delete submission files" on storage.objects;
create policy "Owner can delete submission files" on storage.objects
  for delete
  using (
    bucket_id = 'submissions'
    and (auth.jwt() ->> 'email') = split_part(name, '/', 1)
  );

drop policy if exists "Owner can update submission files" on storage.objects;
create policy "Owner can update submission files" on storage.objects
  for update
  using (
    bucket_id = 'submissions'
    and (auth.jwt() ->> 'email') = split_part(name, '/', 1)
  );

-- ============================================================================
-- 4. AUTHENTICATION CONFIG (MANUAL STEPS IN SUPABASE DASHBOARD)
-- ============================================================================
--
-- 1. In Supabase Dashboard → Authentication → Sign In / Providers:
--    - Enable Email.
--    - Disable "Allow new users to sign up" (so only the owner can register).
--    - Recommended: enable Magic Link delivery so the owner can sign in
--      via a one-time link, in addition to (or instead of) a password.
--
-- 2. Authentication → Users: invite the owner by email so they can set a
--    password, or sign in once with a magic link.
--
-- 3. Confirm that the invited user's email matches the OWNER_EMAIL value
--    you put in your environment. The RLS policies above enforce that
--    ONLY this email can mutate submission records or upload files.
--
-- 4. Make the "submissions" bucket PRIVATE (done above). Public access
--    is granted exclusively through the server-side signed URL endpoint.
--
-- ============================================================================
