-- supabase/migrations/007_goal_habits.sql

-- 1. Create the goal_habits junction table
create table public.goal_habits (
  goal_id uuid references public.goals(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent the exact same habit from being linked to the same goal twice
  primary key (goal_id, habit_id)
);

-- 2. Enable Row Level Security (RLS)
alter table public.goal_habits enable row level security;

-- 3. Create security policies
create policy "Users can view own goal habits"
  on goal_habits for select
  using ( auth.uid() = user_id );

create policy "Users can insert own goal habits"
  on goal_habits for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own goal habits"
  on goal_habits for delete
  using ( auth.uid() = user_id );