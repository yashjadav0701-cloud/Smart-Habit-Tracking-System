-- supabase/migrations/008_reflections.sql

-- 1. Create the daily_reflections table
create table public.daily_reflections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- The specific calendar day this reflection belongs to
  reflection_date date not null,
  
  -- Mood tracking (e.g., 'great', 'good', 'neutral', 'bad', 'awful')
  mood text,
  
  -- Optional journal entry
  note text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent multiple journal entries for the exact same day
  unique(user_id, reflection_date)
);

-- 2. Enable Row Level Security (RLS)
alter table public.daily_reflections enable row level security;

-- 3. Create security policies
create policy "Users can view own reflections"
  on daily_reflections for select
  using ( auth.uid() = user_id );

create policy "Users can insert own reflections"
  on daily_reflections for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own reflections"
  on daily_reflections for update
  using ( auth.uid() = user_id );

create policy "Users can delete own reflections"
  on daily_reflections for delete
  using ( auth.uid() = user_id );