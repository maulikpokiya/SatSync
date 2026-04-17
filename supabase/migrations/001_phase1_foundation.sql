-- SatSync Phase 1 Foundation Schema
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. TYPES
-- ============================================================

create type public.app_role as enum ('super_admin', 'event_admin', 'editor', 'viewer');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- User profiles (linked to auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null,
  avatar_url text,
  home_timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  last_login timestamptz
);
comment on table public.users is 'Public user profiles linked to Supabase Auth';

-- Events stub (used for role scoping; expanded in Phase 2)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  start_date date,
  end_date date,
  primary_timezone text not null default 'America/Chicago',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.events is 'Events / programs managed by the organization';

-- User role assignments (global or scoped to an event)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null,
  event_id uuid references public.events(id) on delete cascade, -- null = global role
  created_at timestamptz not null default now(),
  unique (user_id, role, event_id)
);
comment on table public.user_roles is 'RBAC role assignments. event_id null means global role.';

-- Audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is 'Immutable audit trail for all significant actions';

-- ============================================================
-- 3. UPDATED_AT TRIGGER (for events table)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 5. HELPER FUNCTION: GET CURRENT USER'S HIGHEST ROLE
-- ============================================================
-- Returns the most privileged role for the current user,
-- optionally scoped to a specific event.

create or replace function public.get_my_role(p_event_id uuid default null)
returns text language sql security definer stable as $$
  select role::text
  from public.user_roles
  where user_id = auth.uid()
    and (event_id = p_event_id or event_id is null)
  order by
    case role
      when 'super_admin'  then 1
      when 'event_admin'  then 2
      when 'editor'       then 3
      when 'viewer'       then 4
    end
  limit 1;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- users --
alter table public.users enable row level security;

-- Any authenticated user can read their own profile
create policy "users: read own"
  on public.users for select
  using (auth.uid() = id);

-- super_admin can read all profiles (via service role in admin actions;
-- direct reads via a helper function that bypasses RLS)
create policy "users: update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- user_roles --
alter table public.user_roles enable row level security;

-- Users can see their own roles
create policy "user_roles: read own"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- events --
alter table public.events enable row level security;

-- Published events are readable by anyone (incl. anonymous)
create policy "events: public can read published"
  on public.events for select
  using (status = 'published');

-- Authenticated users can read all non-archived events they have a role on
create policy "events: auth can read with role"
  on public.events for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and (ur.event_id = id or ur.event_id is null)
    )
  );

-- audit_log --
alter table public.audit_log enable row level security;
-- No direct client access; written via server-side service role only.
-- super_admin can read via a server action that uses service role.

-- ============================================================
-- 7. INDEXES
-- ============================================================

create index idx_user_roles_user_id on public.user_roles (user_id);
create index idx_user_roles_event_id on public.user_roles (event_id);
create index idx_audit_log_user_id on public.audit_log (user_id);
create index idx_audit_log_created_at on public.audit_log (created_at desc);
create index idx_events_slug on public.events (slug);
create index idx_events_status on public.events (status);
