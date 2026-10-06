# Subly — gestionnaire d'abonnements

PWA React + Vite pour suivre ses abonnements, les renouvellements et son budget.

## Fonctionnalités

- Dashboard : dépenses mensuelles, projection annuelle et prochaines échéances.
- Ajout, modification et suppression d'abonnements.
- Recherche de fournisseurs connus (Netflix, Spotify, ChatGPT, Claude, Disney+, etc.) avec logos.
- Fournisseurs personnalisés avec récupération de favicon depuis leur site.
- Cycles hebdomadaire, mensuel, trimestriel et annuel.
- Date de début, prochain renouvellement, expiration optionnelle et statut d'essai.
- Rappels configurables à J-30, J-14, J-7, J-3, J-1 ou le jour J.
- Budget mensuel, répartition par catégorie et repères de dépenses.
- Thème sombre / clair.
- Données enregistrées localement dans le navigateur.
- Export et import JSON.
- PWA installable et fonctionnement hors ligne après une première visite.
- Déploiement automatique avec GitHub Actions sur GitHub Pages.

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

Le projet utilise la base Vite `/abonnement/` et le workflow `.github/workflows/deploy-pages.yml`.

Dans **Settings → Pages** du dépôt, sélectionner **GitHub Actions** comme source si ce n'est pas déjà le cas.

L'URL cible est :

`https://brahmiamine.github.io/abonnement/`

## Notifications

Les notifications Web nécessitent l'autorisation du navigateur et sont vérifiées lorsque l'application est ouverte ou redevient active. GitHub Pages étant un hébergement statique, des notifications push garanties quand l'application est complètement fermée nécessiteraient un service push/backend supplémentaire.
