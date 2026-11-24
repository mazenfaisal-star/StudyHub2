-- StudyHub initial schema. Run in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text,
  color text default '#8b7cf6',
  created_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid references public.platforms(id) on delete set null,
  title text not null,
  subject text,
  duration_minutes integer default 0,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  lesson_date date,
  url text,
  created_at timestamptz not null default now()
);
create table if not exists public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null default 'lesson',
  event_date date not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.platforms enable row level security;
alter table public.lessons enable row level security;
alter table public.study_events enable row level security;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "platforms own rows" on public.platforms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lessons own rows" on public.lessons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events own rows" on public.study_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);