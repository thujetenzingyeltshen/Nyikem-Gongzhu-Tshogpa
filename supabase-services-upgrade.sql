create table if not exists public.service_batches (
  id text primary key,
  slug text not null unique,
  sort_order integer not null default 0,
  eyebrow text not null default '',
  title text not null,
  summary text not null default '',
  location text not null default '',
  batch_label text not null default '',
  is_current boolean not null default false,
  is_placeholder boolean not null default false,
  placeholder_status text not null default '',
  placeholder_note text not null default '',
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.service_batches
  add column if not exists sort_order integer not null default 0,
  add column if not exists eyebrow text not null default '',
  add column if not exists summary text not null default '',
  add column if not exists location text not null default '',
  add column if not exists batch_label text not null default '',
  add column if not exists is_current boolean not null default false,
  add column if not exists is_placeholder boolean not null default false,
  add column if not exists placeholder_status text not null default '',
  add column if not exists placeholder_note text not null default '',
  add column if not exists entries jsonb not null default '[]'::jsonb;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_batches_set_updated_at on public.service_batches;
create trigger service_batches_set_updated_at
before update on public.service_batches
for each row
execute function public.set_updated_at();

create index if not exists service_batches_slug_idx on public.service_batches (slug);
create index if not exists service_batches_sort_order_idx on public.service_batches (sort_order);

alter table public.service_batches enable row level security;

drop policy if exists "Public can read service batches" on public.service_batches;
create policy "Public can read service batches"
on public.service_batches
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert service batches" on public.service_batches;
create policy "Admins can insert service batches"
on public.service_batches
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update service batches" on public.service_batches;
create policy "Admins can update service batches"
on public.service_batches
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete service batches" on public.service_batches;
create policy "Admins can delete service batches"
on public.service_batches
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

insert into public.service_batches (
  id,
  slug,
  sort_order,
  eyebrow,
  title,
  summary,
  location,
  batch_label,
  is_current,
  is_placeholder,
  placeholder_status,
  placeholder_note,
  entries
)
values
  (
    'service-gmc-third',
    'gmc-third',
    1,
    'List One',
    'NGT on GMC Duty - Third GMC Attendees',
    'Third GMC attendance list.',
    'Thimphu',
    '3rd GMC',
    false,
    false,
    '',
    '',
    $$[
      {"name":"Dasho Dr. Gado Tshering, NGT","post":"NGT","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Kunzang Wangdi","post":"Member, RRAC","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Phuntsho Nobhu","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Chagay, former Chairman","post":"Former Chairman","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho OKO Tshering","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Pem L. Dorji","post":"--","residence":"Thimphu","remarks":"--"}
    ]$$::jsonb
  ),
  (
    'service-gmc-fourth',
    'gmc-fourth',
    2,
    'List Two',
    'NGT on GMC Duty - Fourth GMC Attendees',
    'Fourth GMC attendance list.',
    'Thimphu',
    '4th GMC',
    false,
    false,
    '',
    '',
    $$[
      {"name":"Dasho Khandu Wangchuk","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Y.T. Wangchuk","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Pema Thinlay","post":"--","residence":"Thimphu","remarks":"--"}
    ]$$::jsonb
  ),
  (
    'service-gmc-fifth',
    'gmc-fifth',
    3,
    'List Three',
    'NGT on GMC Duty - Fifth GMC Attendees',
    'Fifth GMC attendance list.',
    'Thimphu',
    '5th GMC',
    true,
    false,
    '',
    '',
    $$[
      {"name":"Lyonpo Om Pradhan","post":"Permanent Representative to the U.N., New York; Tengye Lyonpo","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Kunzang Wangdi, secretary","post":"Member, RRAC","residence":"Thimphu","remarks":"Spouse: Pem Tandi / Sunshine School of Dasho Kunzang Wangdi"},
      {"name":"Dasho Ugen Chewang","post":"Chairman, DHI","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Yeshey Wangdi, ex treasurer","post":"Secretary","residence":"Thimphu","remarks":"--"}
    ]$$::jsonb
  ),
  (
    'service-desuup-list',
    'desuup-list',
    4,
    'List Four',
    'List of NGT De-Suup',
    '',
    '',
    'De-Suup',
    false,
    true,
    'List to be updated',
    'Add official names or deployment details here when available.',
    '[]'::jsonb
  )
on conflict (id) do nothing;
