create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('announcement-images', 'announcement-images', true)
on conflict (id) do nothing;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  serial_id text not null unique,
  full_name text not null,
  service_year text default '',
  nyikem_year text default '',
  resignation_year text default '',
  joined_year text default '',
  cid_no text default '',
  date_of_birth text default '',
  address text default '',
  phone text default '',
  email text default '',
  last_post text default '',
  spouse_or_kin text default '',
  knowledge text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.members
  add column if not exists service_status text default '',
  add column if not exists life_status text default '';

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  category text not null default '',
  image_url text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.announcements
  add column if not exists category text not null default '';

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

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

drop trigger if exists service_batches_set_updated_at on public.service_batches;
create trigger service_batches_set_updated_at
before update on public.service_batches
for each row
execute function public.set_updated_at();

create index if not exists members_serial_id_idx on public.members (serial_id);
create index if not exists members_full_name_idx on public.members (full_name);
create index if not exists service_batches_slug_idx on public.service_batches (slug);
create index if not exists service_batches_sort_order_idx on public.service_batches (sort_order);

alter table public.members enable row level security;
alter table public.admin_users enable row level security;
alter table public.announcements enable row level security;
alter table public.service_batches enable row level security;

drop policy if exists "Public can read members" on public.members;
create policy "Public can read members"
on public.members
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert members" on public.members;
create policy "Admins can insert members"
on public.members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update members" on public.members;
create policy "Admins can update members"
on public.members
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

drop policy if exists "Admins can delete members" on public.members;
create policy "Admins can delete members"
on public.members
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read own admin row" on public.admin_users;
create policy "Admins can read own admin row"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Public can read announcements" on public.announcements;
create policy "Public can read announcements"
on public.announcements
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert announcements" on public.announcements;
create policy "Admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
on public.announcements
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

drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
on public.announcements
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

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
      {"name":"Dasho Rinzin Getshen","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Dago Tshering","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Karma Lethro","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Dawa Tshering","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Wangdi Norbhu","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Dr. Sonam Tenzin","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Sonam Tshering","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Chagyel","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Sangay Ngedup Dorji","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Yanki T. Wangchuk","post":"--","residence":"Thimphu","remarks":"--"},
      {"name":"Dasho Khandu Wangchuk","post":"--","residence":"Thimphu","remarks":"--"}
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

drop policy if exists "Admins can upload announcement images" on storage.objects;
create policy "Admins can upload announcement images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'announcement-images'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);
