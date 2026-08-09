-- supabase/migrations/009_reminders.sql

-- 1. Create the habit_reminders table
create table public.habit_reminders (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- The exact time of day for the reminder (e.g., '08:30:00')
  reminder_time time not null,
  
  -- Toggle to easily turn the reminder on/off without deleting it
  is_active boolean default true,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.habit_reminders enable row level security;

-- 3. Create security policies
create policy "Users can view own reminders"
  on habit_reminders for select
  using ( auth.uid() = user_id );

create policy "Users can insert own reminders"
  on habit_reminders for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own reminders"
  on habit_reminders for update
  using ( auth.uid() = user_id );

create policy "Users can delete own reminders"
  on habit_reminders for delete
  using ( auth.uid() = user_id );