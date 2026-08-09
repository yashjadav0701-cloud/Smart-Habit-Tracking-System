-- supabase/migrations/002_settings.sql

-- 1. Create the user_settings table
create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  theme text default 'dark',
  first_day_of_week smallint default 1, -- 0 for Sunday, 1 for Monday
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;

-- 3. Create security policies
create policy "Users can view own settings"
  on user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can insert own settings"
  on user_settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own settings"
  on user_settings for update
  using ( auth.uid() = user_id );

-- 4. Create a function to automatically generate settings for new users
create function public.handle_new_user_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- 5. Attach the function to an automatic trigger watching the profiles table
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_settings();