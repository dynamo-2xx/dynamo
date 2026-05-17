
do $$ begin
  create type public.subscription_tier as enum ('free','pro','education','civic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('active','past_due','canceled','incomplete','trialing','unpaid');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subs_self_read" on public.subscriptions;
create policy "subs_self_read" on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "subs_admin_write" on public.subscriptions;
create policy "subs_admin_write" on public.subscriptions
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  period_start date not null,
  sessions_created int not null default 0,
  notebooks_created int not null default 0,
  ai_calls int not null default 0,
  import_minutes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period_start)
);
create index if not exists idx_usage_counters_user_period on public.usage_counters(user_id, period_start desc);

alter table public.usage_counters enable row level security;

drop policy if exists "usage_self_read" on public.usage_counters;
create policy "usage_self_read" on public.usage_counters
  for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "usage_admin_write" on public.usage_counters;
create policy "usage_admin_write" on public.usage_counters
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  contact_email text not null,
  contact_name text,
  tier_requested public.subscription_tier not null,
  seat_count int,
  use_case text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists idx_sales_leads_status on public.sales_leads(status, created_at desc);

alter table public.sales_leads enable row level security;

drop policy if exists "leads_anyone_insert" on public.sales_leads;
create policy "leads_anyone_insert" on public.sales_leads
  for insert to anon, authenticated with check (true);

drop policy if exists "leads_admin_read" on public.sales_leads;
create policy "leads_admin_read" on public.sales_leads
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "leads_admin_update" on public.sales_leads;
create policy "leads_admin_update" on public.sales_leads
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.get_user_tier(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select tier::text from public.subscriptions where user_id = _user_id), 'free');
$$;

create or replace function public.get_or_create_usage_counter(_user_id uuid)
returns public.usage_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  _period date := date_trunc('month', now())::date;
  _row public.usage_counters;
begin
  insert into public.usage_counters(user_id, period_start)
  values (_user_id, _period)
  on conflict (user_id, period_start) do nothing;
  select * into _row from public.usage_counters where user_id = _user_id and period_start = _period;
  return _row;
end;
$$;

create or replace function public.increment_usage(_user_id uuid, _metric text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _period date := date_trunc('month', now())::date;
begin
  insert into public.usage_counters(user_id, period_start)
  values (_user_id, _period)
  on conflict (user_id, period_start) do nothing;

  if _metric = 'sessions_created' then
    update public.usage_counters set sessions_created = sessions_created + 1, updated_at = now()
      where user_id = _user_id and period_start = _period;
  elsif _metric = 'notebooks_created' then
    update public.usage_counters set notebooks_created = notebooks_created + 1, updated_at = now()
      where user_id = _user_id and period_start = _period;
  elsif _metric = 'ai_calls' then
    update public.usage_counters set ai_calls = ai_calls + 1, updated_at = now()
      where user_id = _user_id and period_start = _period;
  elsif _metric = 'import_minutes' then
    update public.usage_counters set import_minutes = import_minutes + 1, updated_at = now()
      where user_id = _user_id and period_start = _period;
  else
    raise exception 'unknown metric %', _metric;
  end if;
end;
$$;

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions(user_id, tier, status)
  values (new.user_id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_new_subscription on public.profiles;
create trigger trg_profiles_new_subscription
  after insert on public.profiles
  for each row execute function public.handle_new_user_subscription();

insert into public.subscriptions(user_id, tier, status)
select user_id, 'free', 'active' from public.profiles
on conflict (user_id) do nothing;
