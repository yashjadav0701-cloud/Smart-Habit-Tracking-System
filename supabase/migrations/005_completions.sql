-- supabase/migrations/005_completions.sql

-- 1. Create the habit_completions table
create table public.habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- The specific calendar day this completion belongs to
  completion_date date not null,
  
  -- True if fully completed, false if missed/failed
  completed boolean default false,
  
  -- The actual logged amount (used for numeric/duration habits)
  value numeric,
  
  -- Exact time it was checked off
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- VERY IMPORTANT: Prevent duplicate completion records for the same habit on the same day
  unique(habit_id, completion_date)
);

-- 2. Enable Row Level Security (RLS)
alter table public.habit_completions enable row level security;

-- 3. Create security policies
create policy "Users can view own completions"
  on habit_completions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own completions"
  on habit_completions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own completions"
  on habit_completions for update
  using ( auth.uid() = user_id );

create policy "Users can delete own completions"
  on habit_completions for delete
  using ( auth.uid() = user_id );