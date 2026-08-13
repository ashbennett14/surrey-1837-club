create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  page_title text not null,
  device_type text not null,
  referrer_type text not null,
  session_key text not null,
  viewed_at timestamptz default now()
);

alter table public.site_page_views enable row level security;

drop policy if exists "Anyone can submit anonymous site page views"
on public.site_page_views;

create policy "Anyone can submit anonymous site page views"
on public.site_page_views
for insert
to anon
with check (
  char_length(page_path) between 1 and 120
  and char_length(page_title) between 1 and 160
  and device_type in ('desktop', 'tablet', 'mobile')
  and referrer_type in ('direct', 'internal', 'search', 'social', 'external')
  and char_length(session_key) between 12 and 80
);

drop policy if exists "Anyone can read anonymous site page views"
on public.site_page_views;

create policy "Anyone can read anonymous site page views"
on public.site_page_views
for select
to anon
using (true);

create index if not exists site_page_views_viewed_at_idx
on public.site_page_views (viewed_at desc);

create index if not exists site_page_views_page_path_idx
on public.site_page_views (page_path);
