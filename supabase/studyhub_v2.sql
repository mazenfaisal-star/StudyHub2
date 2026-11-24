-- StudyHub v2: shared platform catalog, per-user lessons, and secure admin roles.
-- Safe additive migration: keeps the existing profiles/platforms/lessons tables untouched.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','student')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subject text not null,
  color text not null default '#6c63d9',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid references public.platform_catalog(id) on delete set null,
  title text not null,
  subject text,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  lesson_date date,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists user_lessons_user_date_idx on public.user_lessons(user_id, lesson_date);
create index if not exists user_lessons_platform_idx on public.user_lessons(platform_id);

alter table public.user_roles enable row level security;
alter table public.platform_catalog enable row level security;
alter table public.user_lessons enable row level security;

create or replace function public.is_studyhub_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role" on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "authenticated read active platforms" on public.platform_catalog;
create policy "authenticated read active platforms" on public.platform_catalog
for select to authenticated using (active = true or public.is_studyhub_admin());

drop policy if exists "admins insert platforms" on public.platform_catalog;
create policy "admins insert platforms" on public.platform_catalog
for insert to authenticated with check (public.is_studyhub_admin());

drop policy if exists "admins update platforms" on public.platform_catalog;
create policy "admins update platforms" on public.platform_catalog
for update to authenticated using (public.is_studyhub_admin()) with check (public.is_studyhub_admin());

drop policy if exists "admins delete platforms" on public.platform_catalog;
create policy "admins delete platforms" on public.platform_catalog
for delete to authenticated using (public.is_studyhub_admin());

drop policy if exists "students manage own lessons" on public.user_lessons;
create policy "students manage own lessons" on public.user_lessons
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.platform_catalog (name, subject, color)
values
  ('بسطتهالك', 'اللغة العربية', '#8b7cf6'),
  ('محمد صلاح', 'اللغة الإنجليزية', '#43b9a5'),
  ('الجوهري', 'الأحياء', '#e5a34b'),
  ('Dr. Clicks', 'الكيمياء', '#5799e8')
on conflict (name) do nothing;

-- After creating your account, promote your own account to admin by replacing the email below:
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'YOUR_LOGIN_EMAIL'
-- on conflict (user_id) do update set role = excluded.role;
