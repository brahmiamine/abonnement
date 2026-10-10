# Sécurité

Subly est une application 100 % statique : **toute la sécurité repose sur Supabase** (Auth + Row Level
Security). La clé publiable présente dans le bundle est publique par conception.

## Checklist à vérifier dans le tableau de bord Supabase

Les valeurs attendues sont décrites dans `supabase/config.toml` (appliquables avec `supabase config push`).

| Réglage                                                  | Valeur attendue                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Authentication → Sign In / Providers → _Confirm email_   | activé (évite les comptes avec l'e-mail de quelqu'un d'autre)                                             |
| Authentication → Password → _Minimum length_             | 10                                                                                                        |
| Authentication → Password → _Required characters_        | lettres + chiffres                                                                                        |
| Authentication → Password → _Leaked password protection_ | activé (offre Pro)                                                                                        |
| Authentication → URL Configuration                       | _Site URL_ et _Redirect URLs_ limitées à `https://brahmiamine.github.io/abonnement/` (+ localhost en dev) |
| Authentication → Rate Limits                             | valeurs de `config.toml` ; les liens magiques ne sont renvoyables qu'une fois par minute                  |
| Authentication → Attack Protection → _CAPTCHA_           | recommandé (hCaptcha ou Turnstile) si l'inscription est ouverte au public                                 |
| Database → Advisors → Security                           | aucun avertissement (table sans RLS, fonction sans `search_path`…)                                        |

La politique de mot de passe est aussi vérifiée côté interface (`src/domain/password.ts`), mais seule celle de
Supabase fait foi : un appel direct à l'API ne passe pas par l'interface.

## Vérifier la RLS

Dans le _SQL Editor_ — toute table `public` doit avoir `rowsecurity = true` et au moins une politique :

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
select schemaname, tablename, policyname, cmd, roles from pg_policies
 where schemaname in ('public', 'storage') order by 1, 2;
```

Test d'isolation à faire avec **deux comptes** : créer un abonnement avec le compte A, vérifier que le compte B
ne le voit pas (`select * from subscriptions`) et ne peut ni le modifier ni lire ses pièces jointes.

## Ce que le code met en place

- **RLS** sur toutes les tables, politiques `to authenticated` et `auth.uid() = user_id`
  (`supabase/migrations`).
- **Pièces jointes** : bucket privé, 5 Mo, PDF/PNG/JPEG/WebP uniquement (vérifié côté client **et** par le
  bucket), dossier par utilisateur imposé par la RLS du stockage, liens signés d'une minute.
- **CSP** injectée au build (`vite.config.ts`) : scripts uniquement de l'origine (+ l'empreinte du script de
  thème), connexions limitées à `*.supabase.co`, pas d'objets ni de formulaires externes.
- **Push** : la clé VAPID privée n'existe que dans les secrets de l'Edge Function ; l'appel de la fonction est
  protégé par un secret partagé comparé en temps constant.

## Limites connues

- GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP : `frame-ancestors`, HSTS et `X-Content-Type-Options`
  ne peuvent pas être posés (la CSP en `<meta>` ne couvre pas `frame-ancestors`). Un hébergement avec en-têtes
  personnalisés (Cloudflare Pages, Netlify) corrigerait cela.
- Si un abonnement est supprimé **hors ligne**, ses pièces jointes restent dans le stockage (la ligne qui les
  référençait a disparu, l'application ne peut plus les retrouver). Un nettoyage périodique des fichiers
  orphelins est à prévoir si le volume devient significatif.
- `npm audit --omit=dev` (dépendances embarquées dans l'application) : 0 vulnérabilité au moment de l'écriture.
  Relancez-le régulièrement.
