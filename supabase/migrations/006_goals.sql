-- supabase/migrations/006_goals.sql

-- 1. Create the goals table
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  target_value numeric default 100,
  current_value numeric default 0,
  unit text,
  deadline date,
  status text default 'active', -- 'active', 'completed', 'abandoned'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.goals enable row level security;

-- 3. Create security policies
create policy "Users can view own goals"
  on goals for select
  using ( auth.uid() = user_id );

create policy "Users can insert own goals"
  on goals for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own goals"
  on goals for update
  using ( auth.uid() = user_id );

create policy "Users can delete own goals"
  on goals for delete
  using ( auth.uid() = user_id );