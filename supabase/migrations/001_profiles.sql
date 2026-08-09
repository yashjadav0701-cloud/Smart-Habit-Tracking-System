-- supabase/migrations/001_profiles.sql

-- 1. Create the profiles table linked to Supabase's built-in auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (MANDATORY for security)
alter table public.profiles enable row level security;

-- 3. Create security policies (Users can only see and update their OWN data)
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 4. Create a function to automatically copy Google data to our profiles table on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Attach the function to an automatic trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();