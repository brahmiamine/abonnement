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
- Authentification email/mot de passe et récupération de mot de passe via Supabase Auth.
- Thème sombre / clair.
- Données métier stockées dans Supabase avec Row Level Security.
- Export et import JSON.
- PWA installable et fonctionnement hors ligne pour l'interface après une première visite.
- Déploiement automatique avec GitHub Actions sur GitHub Pages.

## Architecture

Le code est séparé par responsabilité :

- `src/domain` : calculs purs et testables.
- `src/hooks` : orchestration Auth, données Supabase, PWA et notifications.
- `src/lib` : accès Supabase.
- `src/components` : composants UI réutilisables.
- `src/views` : écrans de l'application.
- `src/App.tsx` : composition et navigation uniquement.

## Développement

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

Le projet utilise la base Vite `/abonnement/` et le workflow `.github/workflows/deploy-pages.yml`.

URL :

`https://brahmiamine.github.io/abonnement/`

## Notifications

Les notifications Web nécessitent l'autorisation du navigateur et sont vérifiées lorsque l'application est ouverte ou redevient active. GitHub Pages étant un hébergement statique, des notifications push garanties quand l'application est complètement fermée nécessiteraient un service push/backend supplémentaire.

## Tests

- `npm test` : tests unitaires et d’intégration (Vitest + Testing Library)
- `npm run test:coverage` : idem avec couverture
- `npm run test:e2e` : tests Playwright de bout en bout sur desktop, tablette et mobiles (Supabase est simulé, aucun compte requis). La première fois : `npx playwright install chromium`.
- Les captures de chaque écran sont écrites dans `e2e/screenshots/` (ignoré par git).

## Navigation

L’écran courant est dans l’URL (`#/subscriptions`, `#/providers`…) : un rafraîchissement reste sur la même page. Le thème choisi est mémorisé sur l’appareil.
