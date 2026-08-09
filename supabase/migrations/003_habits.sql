-- supabase/migrations/003_habits.sql

-- 1. Create the habits table
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text,
  icon text default 'fa-bullseye',
  priority text default 'Medium', -- 'Low', 'Medium', 'High'
  type text default 'boolean', -- 'boolean', 'numeric', 'duration'
  frequency text default 'daily', -- 'daily', 'specific_days', 'times_per_week'
  target numeric default 1,
  unit text,
  start_date date default CURRENT_DATE,
  end_date date,
  status text default 'active', -- 'active', 'archived'
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.habits enable row level security;

-- 3. Create security policies ensuring strict ownership
create policy "Users can view own habits"
  on habits for select
  using ( auth.uid() = user_id );

create policy "Users can insert own habits"
  on habits for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own habits"
  on habits for update
  using ( auth.uid() = user_id );

create policy "Users can delete own habits"
  on habits for delete
  using ( auth.uid() = user_id );