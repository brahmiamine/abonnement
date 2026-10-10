-- Notifications push : appareils abonnés + journal des rappels déjà envoyés.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  -- Fuseau horaire de l'appareil (ex. Europe/Paris) : les rappels partent à 9 h, heure locale.
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own_push_subscriptions" on public.push_subscriptions;
create policy "own_push_subscriptions" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Journal réservé à la fonction send-reminders (clé service) : RLS activée, aucune politique.
create table if not exists public.push_reminder_log (
  push_subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  renewal_date date not null,
  days_before integer not null,
  sent_at timestamptz not null default now(),
  primary key (push_subscription_id, subscription_id, renewal_date, days_before)
);

alter table public.push_reminder_log enable row level security;
