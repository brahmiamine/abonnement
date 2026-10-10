# Notifications push (application fermée)

Sans serveur, une PWA ne peut notifier que lorsqu'elle est ouverte. Les rappels « application fermée »
passent par une **Edge Function Supabase** (`supabase/functions/send-reminders`) appelée toutes les heures
par `pg_cron`. Tant que ces étapes ne sont pas faites, Subly retombe sur les notifications locales
(application ouverte) : rien ne casse.

```
pg_cron (toutes les heures) ──► send-reminders ──► service push du navigateur ──► service worker (public/sw.js)
                                   │
                                   └─ lit subscriptions, subscription_settings, push_subscriptions
```

Fonctionnement : chaque appareil abonné reçoit, **à partir de 9 h heure locale** (fuseau enregistré avec
l'abonnement), les rappels dont le délai (J-30 … jour J) tombe aujourd'hui. `push_reminder_log` évite les
doublons. Les renouvellements automatiques sont recalculés côté serveur : un abonnement jamais rouvert reste
correctement rappelé. Les appareils désabonnés (HTTP 404/410) sont supprimés automatiquement.

## Mise en route

1. **Migrations** : appliquer `supabase/migrations/*.sql` (tables `push_subscriptions` et `push_reminder_log`).
2. **Clés VAPID** (une seule fois) :
   ```bash
   npx web-push generate-vapid-keys
   ```
3. **Clé publique côté application** : définir `VITE_VAPID_PUBLIC_KEY` (fichier `.env.local` en dev, et
   _Settings → Secrets and variables → Actions → Variables_ nommée `VITE_VAPID_PUBLIC_KEY` pour GitHub Pages).
4. **Secrets de la fonction** (la clé privée ne doit JAMAIS aller dans le code ni dans `VITE_*`) :
   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY="<clé publique>" \
     VAPID_PRIVATE_KEY="<clé privée>" \
     VAPID_SUBJECT="mailto:vous@exemple.fr" \
     CRON_SECRET="$(openssl rand -hex 32)"
   ```
5. **Déployer la fonction** (authentifiée par le secret `x-cron-secret`, pas par JWT) :
   ```bash
   supabase functions deploy send-reminders --no-verify-jwt
   ```
6. **Planifier l'appel horaire** (SQL Editor). Stocker d'abord le secret dans le Vault :
   ```sql
   select vault.create_secret('<le même CRON_SECRET>', 'cron_secret');
   select vault.create_secret('https://<ref-projet>.supabase.co', 'project_url');

   select cron.schedule(
     'subly-send-reminders',
     '0 * * * *',
     $$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
              || '/functions/v1/send-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```
   (extensions `pg_cron` et `pg_net` à activer dans _Database → Extensions_).
7. **Tester** :
   ```bash
   curl -X POST "https://<ref-projet>.supabase.co/functions/v1/send-reminders" \
     -H "x-cron-secret: <CRON_SECRET>"
   # → {"devices":1,"sent":0,"removed":0}
   ```
   Dans Subly : Réglages → Rappels → _Activer_ (accepter la permission), puis ajouter un abonnement dont le
   renouvellement tombe dans un des délais choisis.

## Notes

- **iOS** : le push n'existe que pour la PWA **installée sur l'écran d'accueil** (iOS 16.4 minimum).
- **Fuseau horaire** : relevé à l'activation ; à refaire (désactiver puis réactiver) après un déménagement.
- **Confidentialité** : le contenu poussé (nom de l'abonnement, montant) transite chiffré (RFC 8291) par le
  service push du navigateur.
- **Non testé de bout en bout** : la logique (`reminders.ts`), le service worker et le client sont couverts par
  les tests, mais l'Edge Function n'a pas pu être exécutée dans l'environnement de développement (pas de
  Deno ni de projet Supabase). Faites le test de l'étape 7 avant de compter dessus.
