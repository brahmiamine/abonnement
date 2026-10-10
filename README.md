# Subly — gestionnaire d'abonnements

PWA React + Vite pour suivre ses abonnements, ses renouvellements et ses dépenses récurrentes.

## Fonctionnalités

- Tableau de bord : dépenses mensuelles, projection annuelle et prochaines échéances.
- Ajout, modification et suppression d'abonnements.
- Catalogue de fournisseurs stocké dans Supabase, modifiable depuis l'application.
- Logos de fournisseurs personnalisables.
- Cycles hebdomadaire, mensuel, trimestriel et annuel.
- Dates de renouvellement et de fin calculées automatiquement.
- Renouvellement automatique.
- Rappels configurables à J-30, J-14, J-7, J-3, J-1 ou le jour J.
- Analyse des dépenses par catégorie, coût moyen et abonnement le plus cher.
- Vue calendrier : toutes les dates de paiement du mois (passé et futur), total à payer, détail du jour.
- Authentification par e-mail + mot de passe (10 caractères, lettre et chiffre), **lien magique** sans mot de passe, et récupération de mot de passe via Supabase Auth.
- Pièces jointes (facture, contrat) par abonnement : PDF/images de 5 Mo maximum dans un stockage privé.
- Notifications push réelles (application fermée) via une Edge Function planifiée — voir [`docs/PUSH.md`](docs/PUSH.md).
- Fonctionne hors ligne : copie locale des données, modifications mises en file puis envoyées au retour du réseau.
- Thème sombre / clair.
- Données métier stockées dans Supabase avec Row Level Security.
- Export et import JSON.
- PWA installable et fonctionnement hors ligne pour l'interface après une première visite.
- Déploiement automatique avec GitHub Actions sur GitHub Pages.

## Architecture

Le code est séparé par responsabilité :

- `src/domain` : calculs purs et testables (dont `calendar`, `password`, `attachments`).
- `src/hooks` : orchestration Auth, données Supabase, PWA et notifications.
- `src/lib` : accès Supabase, copie locale et file d'écritures hors ligne (`offline`, `syncQueue`), push.
- `supabase/` : migrations SQL, configuration Auth et Edge Function `send-reminders`.
- `src/components` : composants UI réutilisables.
- `src/views` : écrans de l'application.
- `src/App.tsx` : composition et navigation uniquement.

## Développement

```bash
npm install
npm run dev
```

## Configuration Supabase

1. Créez un projet Supabase et appliquez le schéma : `supabase/migrations/*.sql` (tables, contraintes et politiques RLS ; script idempotent).
2. Par défaut l'application cible le projet de production. Pour en utiliser un autre, copiez `.env.example` vers `.env.local` et renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. La clé publiable est publique par conception : la sécurité repose entièrement sur la Row Level Security, ne la désactivez jamais.
4. Peuplez `subscription_categories` et `subscription_provider_templates` avec vos catégories et fournisseurs de départ.

> Le schéma SQL a été reconstitué à partir du code client : comparez-le à votre base avant de l'appliquer.

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

Le projet utilise la base Vite `/abonnement/` (définie dans `vite.config.ts` ; le code et le service worker en déduisent leurs chemins) et le workflow `.github/workflows/deploy-pages.yml`.

URL :

`https://brahmiamine.github.io/abonnement/`

## Notifications

Les notifications Web nécessitent l'autorisation du navigateur et sont vérifiées lorsque l'application est ouverte ou redevient active. GitHub Pages étant un hébergement statique, des notifications push garanties quand l'application est complètement fermée nécessiteraient un service push/backend supplémentaire.

## Qualité

```bash
npm run check   # lint (ESLint + a11y) + typage + format (Prettier) + tests unitaires
npm run test:e2e
```

La CI (`.github/workflows/ci.yml`) exécute la même chose plus les tests E2E (dont un audit d'accessibilité
axe sur chaque écran, thèmes clair et sombre) **avant tout déploiement**.

## Documentation

- [`docs/PUSH.md`](docs/PUSH.md) — mise en route des notifications push (VAPID, Edge Function, pg_cron).
- [`docs/SECURITY.md`](docs/SECURITY.md) — réglages de sécurité Supabase à vérifier, RLS, limites connues.

## Tests

- `npm test` : tests unitaires et d’intégration (Vitest + Testing Library)
- `npm run test:coverage` : idem avec couverture
- `npm run test:e2e` : tests Playwright de bout en bout sur desktop, tablette et mobiles (Supabase est simulé, aucun compte requis). La première fois : `npx playwright install chromium`.
- Les captures de chaque écran sont écrites dans `e2e/screenshots/` (ignoré par git).

## Navigation

L’écran courant est dans l’URL (`#/subscriptions`, `#/providers`…) : un rafraîchissement reste sur la même page. Le thème choisi est mémorisé sur l’appareil.
