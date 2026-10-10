-- Schéma de Subly, reconstitué à partir des requêtes de src/lib/*.ts.
-- Idempotent : peut être rejoué sans effet sur un projet déjà configuré.
-- À comparer avec la base de production avant toute application.

-- Catégories et modèles de fournisseurs : lecture seule pour les utilisateurs connectés.
create table if not exists public.subscription_categories (
  id text primary key,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.subscription_provider_templates (
  id text primary key,
  name text not null,
  category text not null references public.subscription_categories (id),
  logo text not null default '',
  website text,
  color text,
  sort_order integer not null default 0
);

-- Fournisseurs propres à chaque utilisateur.
create table if not exists public.subscription_providers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  category text not null,
  logo text not null default '',
  website text,
  color text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider_id text,
  name text not null,
  logo text not null default '',
  website text,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  cycle text not null check (cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date not null,
  renewal_date date not null,
  expiration_date date,
  status text not null check (status in ('active', 'trial', 'paused')),
  auto_renew boolean not null default true,
  remind_days integer[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_renewal_idx
  on public.subscriptions (user_id, renewal_date);

create table if not exists public.subscription_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  reminders_enabled boolean not null default false
);

-- Row Level Security : chacun ne voit et ne modifie que ses propres lignes.
alter table public.subscription_categories enable row level security;
alter table public.subscription_provider_templates enable row level security;
alter table public.subscription_providers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['subscription_categories', 'subscription_provider_templates'] loop
    execute format('drop policy if exists "read_%1$s" on public.%1$I', t);
    execute format(
      'create policy "read_%1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;

  foreach t in array array['subscription_providers', 'subscriptions', 'subscription_settings'] loop
    execute format('drop policy if exists "own_%1$s" on public.%1$I', t);
    execute format(
      'create policy "own_%1$s" on public.%1$I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
