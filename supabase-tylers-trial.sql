create table if not exists public.tylers_trial_scores (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  lodge_name text null,
  lodge_number text null,
  score integer not null,
  trials_survived integer not null,
  enemies_defeated integer not null,
  highest_structure integer not null,
  created_at timestamptz default now()
);

alter table public.tylers_trial_scores enable row level security;

create policy "Anyone can read Tyler's Trial scores"
on public.tylers_trial_scores
for select
to anon
using (true);

create policy "Anyone can submit Tyler's Trial scores"
on public.tylers_trial_scores
for insert
to anon
with check (
  char_length(first_name) between 1 and 24
  and (lodge_name is null or char_length(lodge_name) <= 60)
  and (lodge_number is null or char_length(lodge_number) <= 10)
  and score >= 0
);
