create table public.user_data (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.habit_data (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.user_data to authenticated;
grant all on public.user_data to service_role;
grant select, insert, update, delete on public.habit_data to authenticated;
grant all on public.habit_data to service_role;

alter table public.user_data enable row level security;
alter table public.habit_data enable row level security;

create policy "user_data_select_own" on public.user_data for select to authenticated using (user_id = auth.uid());
create policy "user_data_insert_own" on public.user_data for insert to authenticated with check (user_id = auth.uid());
create policy "user_data_update_own" on public.user_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "habit_data_select_own" on public.habit_data for select to authenticated using (user_id = auth.uid());
create policy "habit_data_insert_own" on public.habit_data for insert to authenticated with check (user_id = auth.uid());
create policy "habit_data_update_own" on public.habit_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lesson_files_select_own" on storage.objects for select to authenticated
using (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lesson_files_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lesson_files_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);