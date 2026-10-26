# Subly — gestionnaire d'abonnements

PWA React + Vite pour suivre ses abonnements, ses renouvellements et ses dépenses récurrentes.

## Fonctionnalités

- Tableau de bord : dépenses mensuelles, projection annuelle et prochaines échéances.
- Ajout, modification et suppression d'abonnements.
- Catalogue de fournisseurs stocké dans MariaDB, modifiable depuis l'application.
- Logos de fournisseurs personnalisables.
- Cycles hebdomadaire, mensuel, trimestriel et annuel.
- Dates de renouvellement et de fin calculées automatiquement.
- Renouvellement automatique.
- Rappels configurables à J-30, J-14, J-7, J-3, J-1 ou le jour J.
- Analyse des dépenses par catégorie, coût moyen et abonnement le plus cher.
- Authentification e-mail/mot de passe ; récupération du mot de passe par e-mail lorsque le SMTP est configuré sur l'API.
- Thème sombre / clair.
- Données métier stockées dans MariaDB via une API Node.js (`server/`) : chaque requête est limitée aux données du compte connecté.
- Export et import JSON.
- PWA installable et fonctionnement hors ligne pour l'interface après une première visite.
- Déploiement automatique avec GitHub Actions sur GitHub Pages.

## Architecture

Le code est séparé par responsabilité :

- `src/domain` : calculs purs et testables.
- `src/hooks` : orchestration Auth, données, PWA et notifications.
- `src/lib` : client de l'API (`api.ts`) et accès aux données.
- `server/` : API Node.js + MariaDB (comptes, sessions, données).
- `src/components` : composants UI réutilisables.
- `src/views` : écrans de l'application.
- `src/App.tsx` : composition et navigation uniquement.

## Développement

```bash
npm install
npm run dev
```

## API et base MariaDB

Le navigateur ne parle jamais directement à la base : il appelle l'API de `server/` (Node.js 24, sans framework), qui stocke tout dans MariaDB.

- Schéma : `server/schema.sql`, appliqué automatiquement au démarrage de l'API (idempotent).
- Catalogue de départ : `server/seed.sql` (catégories et modèles de fournisseurs), à appliquer une fois : `mariadb abonnement < server/seed.sql`.
- Configuration : copier `server/.env.example` vers `server/.env` (connexion MariaDB, origines CORS autorisées, SMTP optionnel).
- Déploiement sur le VPS : `cd server && docker compose up -d --build`. L'API est servie par Caddy sur `https://abonnement-api.clubika.com`.
- Sessions : jeton opaque aléatoire (60 jours), stocké haché (SHA-256) en base ; mots de passe hachés avec bcrypt.
- « Mot de passe oublié » n'apparaît que si `SMTP_HOST` est renseigné ; le lien envoyé est valable 1 heure et à usage unique.

Le front cible `https://abonnement-api.clubika.com` par défaut ; pour une autre API, copiez `.env.example` vers `.env.local` et renseignez `VITE_API_URL`.

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

## Tests

- `npm test` : tests unitaires et d’intégration (Vitest + Testing Library)
- `npm run test:coverage` : idem avec couverture
- `npm run test:e2e` : tests Playwright de bout en bout sur desktop, tablette et mobiles (l'API est simulée, aucun compte requis).
- `cd server && npm test` : tests d'intégration de l'API contre une vraie base MariaDB de test (variables `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_HOST` ou `TEST_DB_SOCKET`). La première fois : `npx playwright install chromium`.
- Les captures de chaque écran sont écrites dans `e2e/screenshots/` (ignoré par git).

## Navigation

L’écran courant est dans l’URL (`#/subscriptions`, `#/providers`…) : un rafraîchissement reste sur la même page. Le thème choisi est mémorisé sur l’appareil.
