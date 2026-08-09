-- supabase/migrations/004_habit_schedules.sql

-- 1. Create the habit_schedules table
create table public.habit_schedules (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate schedules for the same habit on the same day
  unique(habit_id, day_of_week)
);

-- 2. Enable Row Level Security (RLS)
alter table public.habit_schedules enable row level security;

-- 3. Create security policies
create policy "Users can view own habit schedules"
  on habit_schedules for select
  using ( auth.uid() = user_id );

create policy "Users can insert own habit schedules"
  on habit_schedules for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own habit schedules"
  on habit_schedules for update
  using ( auth.uid() = user_id );

create policy "Users can delete own habit schedules"
  on habit_schedules for delete
  using ( auth.uid() = user_id );