-- supabase/migrations/010_rls.sql
-- Final security sweep to ensure Row Level Security is strictly enforced everywhere.

alter table public.profiles force row level security;
alter table public.user_settings force row level security;
alter table public.habits force row level security;
alter table public.habit_schedules force row level security;
alter table public.habit_completions force row level security;
alter table public.goals force row level security;
alter table public.goal_habits force row level security;
alter table public.daily_reflections force row level security;
alter table public.habit_reminders force row level security;