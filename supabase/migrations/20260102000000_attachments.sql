-- Pièces jointes (facture, contrat…) d'un abonnement.
-- Les fichiers vivent dans le bucket privé « subscription-files » sous <user_id>/<subscription_id>/…

create table if not exists public.subscription_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  path text not null unique,
  size bigint not null check (size > 0 and size <= 5242880),
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ),
  created_at timestamptz not null default now()
);
create index if not exists subscription_attachments_subscription_idx
  on public.subscription_attachments (subscription_id);

alter table public.subscription_attachments enable row level security;

drop policy if exists "own_subscription_attachments" on public.subscription_attachments;
create policy "own_subscription_attachments" on public.subscription_attachments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.user_id = (select auth.uid())
    )
  );

-- Bucket privé : 5 Mo maximum, PDF et images uniquement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-files',
  'subscription-files',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Chacun n'accède qu'à son propre dossier (premier segment du chemin = son identifiant).
do $$
declare
  action text;
begin
  foreach action in array array['select', 'insert', 'delete'] loop
    execute format('drop policy if exists "subscription_files_%s" on storage.objects', action);
  end loop;
end $$;

create policy "subscription_files_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'subscription-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "subscription_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'subscription-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "subscription_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'subscription-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
