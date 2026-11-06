# Rapport du matin — nuit du 13 → 14 octobre 2026

Pour Gabriel. Tout est sur la branche **`slice/1-rouge-night`** (PR **#5**, brouillon, vers `slice/1-rouge`). **Rien n'a été fusionné, rien n'a été mis en ligne, `main` n'a pas été touché.**

## En 30 secondes

- Les 5 chantiers sont faits, relus par un agent adversarial, intégrés : **sécurité**, **sites client + équipe durcis**, **mise en ligne préparée**, **tests de bout en bout**, plus un **audit sécurité final** sur tout le diff de la nuit.
- **Tout est vert en local** (détail plus bas), y compris 8 scénarios complets dans Chrome et un test de la CSP dans Chrome (0 violation).
- **6 failles de sécurité réelles fermées** dans la base (migrations 0004 et 0005), en plus de celles de 0003 d'hier.
- L'audit final a trouvé **1 faille bloquante** : on pouvait détourner un compte de vigile ou de manager pendant sa création. Elle est **corrigée et prouvée** en local, avec 3 autres points (migration **0006**).
- **1 décision à prendre vite** : activer la confirmation d'email (question 8).
- Ce qu'il te reste à faire : relire la PR #5, répondre aux questions plus bas, puis lancer les achats / comptes (bloqué côté CEO).

## Ce qui a été fait

| Chantier | Résultat |
|---|---|
| **E — Sécurité transverse** | CSP des deux sites (`security/csp.mjs`), **prouvée dans Chrome** ; CAPTCHA Turnstile sur l'inscription **et** la connexion des deux sites (codé, testé avec les clés de test Cloudflare, s'active dès qu'on met la clé) ; migrations **0004** et **0005** ; contrôle des secrets dans les builds ; gitleaks + audit des dépendances en CI ; `docs/SECURITY.md` complet (menaces, risques, liste de contrôle avant mise en ligne, incidents) |
| **C — Sites durcis** | Scanner de porte réécrit (plus de scan quand l'onglet est caché, bon lieu après changement de lieu, délai max 8 s, « Scan next » relit le même pass après une coupure) ; lecteur QR WebAssembly **hébergé par le site équipe** avec contrôle de taille + SHA-256 (CDN seulement en secours) ; QR du pass en majuscules (plus petit, plus lisible) ; bandeau hors ligne, erreurs annoncées, accessibilité ; écran allumé pendant le pass et le scan ; « This night is over » ; invité suspendu = pas de pass |
| **A — Mise en ligne prête** | Config d'hébergement des deux sites (Cloudflare Pages **ou** Vercel, en-têtes de sécurité + CSP), icônes Outly, `docs/DEPLOY.md` (guide pas à pas en français, 👤 humain / 💻 terminal), scripts `rouge:setup-night` et `rouge:staff` (simulation par défaut, production seulement avec confirmation explicite) |
| **B — Tests de bout en bout** | `pnpm e2e` : 8 scénarios dans Chrome avec une fausse caméra (inscription + code email, liste des participants + blocage, scan porte OK / déjà utilisé / invalide, rôles + offre bar, soirée terminée, scan hors ligne) |
| **Audit sécurité final** | 1 bloquant + 3 à corriger, **tous corrigés** (voir « Audit final ») |

### Les 6 failles fermées cette nuit (0004 + 0005)

1. **Un invité suspendu pouvait lever sa propre suspension** (et modifier `tier`, `id_verified_at`, `no_show_count`…) → colonnes protégées par un déclencheur.
2. **Amitiés forcées** : en acceptant une demande, on pouvait réécrire `requester_id` et devenir ami avec **n'importe qui sans son accord** ; un message pouvait aussi être re-daté ou déplacé dans un autre groupe → seules les colonnes légitimes sont modifiables.
3. **`referred_by` / `referral_code` / `created_at` forgeables à la création du profil** : mettre n'importe qui comme parrain **bloquait la suppression de compte** de cette personne → forcés côté serveur.
4. **Un seul compte pouvait prendre 30 places de la guest list** (via `join_guest_list`, qui accepte des +1) → la règle « un pass par personne » (A4) contournée. Fonction fermée aux utilisateurs ; on rejoint seulement via `join_event_list`.
5. Même chose pour `request_table` (réservation de table, hors V1) → fermée.
6. **La suppression de compte pouvait échouer** (11 clés étrangères vers `profiles` sans `ON DELETE`) → droit à l'effacement garanti (`ON DELETE SET NULL`).

Toutes ont un test dans `supabase/tests/` (`pnpm db:test` : 69 vérifications avec 0006). Consigné dans la SPEC (amendements **A11** et **A12**).

## Comment c'est vérifié

Sur `slice/1-rouge-night`, après intégration (et relancé après les correctifs de l'audit) :

| Vérification | Résultat |
|---|---|
| `pnpm typecheck`, `pnpm lint` | ✅ |
| `pnpm test` (tests unitaires) | ✅ 23 |
| `pnpm db:test` (RLS + sécurité, Postgres jetable) | ✅ **69** vérifications (les 6 nouvelles échouent sans 0006 : contre-épreuve faite) |
| `pnpm db:reset` + seed + **`pnpm e2e`** | ✅ **8/8**, 0 sauté (relancé après 0006) |
| `pnpm security:csp` (les deux sites dans Chrome, avec la vraie CSP) | ✅ 18 vérifications, **0 violation** ; le WebAssembly du scanner vient bien du site équipe |
| `pnpm check:csp` (les fichiers d'hébergement portent exactement la CSP testée) | ✅ |
| Builds web client + équipe, puis `check:secrets` sur les builds | ✅ aucun secret |
| gitleaks (tout l'historique) | ✅ aucune fuite |
| `pnpm audit` | ✅ 2 failles hautes **acceptées** (outils de dev seulement, `SECURITY.md` § 6) |

## ⚠️ Réglages locaux à NE PAS recopier en production

Détail dans `docs/SECURITY.md` § 4 et § 5 (liste à cocher).

- **Emails d'auth `email_sent = 2` par heure** (local) → en prod avec Resend, **≥ 500 / heure** le soir de Rouge, sinon plus aucun code n'arrive après 2 emails.
- **Redirect URLs `exp://**` et `http://localhost…`** (local) → en prod **uniquement** `https://<site client>/**`. Sinon un lien « mot de passe oublié » piégé peut voler une session.
- **Limites par IP** : au club, des centaines d'invités partagent **une seule IP** → relever `sign_in_sign_ups` (ex. 300 / 5 min) **et** activer le CAPTCHA.
- **GraphQL (`pg_graphql`) et Realtime public** : actifs par défaut sur un projet hébergé, inutilisés → à désactiver.
- **Sessions du personnel** sans durée maximale → comptes désactivés + mots de passe changés le lendemain de Rouge.
- **CAPTCHA** : une fois activé dans Supabase, il est exigé **aussi à la connexion** → la clé de site doit être sur **les deux sites**, sinon les vigiles sont bloqués à la porte.

## Questions pour toi (et les CEO)

1. **Date de naissance du personnel** : un profil exige une date (règle 18+). Sans date dans le CSV, `rouge:staff` met une date fictive. OK, ou on demande la vraie date ?
2. **Comptes du personnel en production** : invitation par email (la personne choisit son mot de passe — proposé dans `DEPLOY.md` § 5.3) ou mot de passe remis en main propre ?
3. **Hébergeur des sites client + équipe** : Cloudflare Pages (gratuit, recommandé dans `DEPLOY.md`) ou Vercel ? L'admin reste sur Vercel.
4. **Délais du scanner** : écran vert 3,5 s puis retour auto ; même QR ignoré 6 s ; « pas de réponse » après 8 s. À valider avec les vigiles pendant la répétition (21–23 oct).
5. **Écran toujours allumé** (pass client + scanner) : marche sur Chrome Android et Safari iOS 16.4+ ; à confirmer sur de vrais téléphones.
6. **Invité suspendu** : il ne voit plus son QR (message de suspension à la place). C'est le comportement voulu ?
7. **Tests e2e en CI** : aujourd'hui seulement en local (il faut Docker + Chrome). On les ajoute à la CI GitHub (≈ 5 min de plus par PR) ?
8. **⚠️ Activer la confirmation d'email ? (SPEC A6 — à décider avant d'ouvrir les inscriptions le 19–20 oct.)** Aujourd'hui, quelqu'un qui connaît l'email d'un invité peut s'inscrire **avant lui** avec son propre mot de passe. Quand l'invité se connecte ensuite par code email, **l'attaquant garde l'accès** : il voit son prénom, sa date de naissance et son pass, et peut passer le fast lane avant lui ou annuler sa place. C'est prouvé en local par l'audit. L'attaque est ciblée (il faut connaître l'email), mais tout se règle avec une case dans Supabase (*Confirm email*). Le coût : un email de plus à l'inscription. Ça ferme aussi « savoir si un email a un compte ». **Je recommande de l'activer** ; je n'ai rien changé, c'est une décision produit.
9. **Messages signalés** : l'auteur peut encore modifier le texte d'un message après un signalement (colonne `body` modifiable). Sans effet en V1 (groupes masqués), mais à trancher avant d'ouvrir les groupes : on fige le texte une fois signalé ?

## Audit final

Un agent a relu **tout le diff de la nuit** (139 fichiers) en attaquant. Il a prouvé chaque point sur une base jetable ou sur le Supabase local, sans rien modifier.

**🔴 Bloquant — corrigé : détournement d'un compte du personnel.**
- En production, `rouge:staff` créait les vigiles et managers par **invitation Supabase**.
- Un compte invité reste « non confirmé » jusqu'au clic. Comme la confirmation d'email est désactivée (A6), quiconque s'inscrivait avec l'adresse du vigile avant ce clic recevait **une session sur le compte du vigile, avec son rôle**. Avec un rôle manager, il pouvait lire les codes de tous les pass.
- Variante : s'inscrire avec l'adresse du vigile **avant** que le script tourne ; le script gardait ce compte et lui donnait le rôle.
- **Correctif** : comptes créés **déjà confirmés**, puis email « choisir son mot de passe ». Une adresse qui a déjà un compte est **refusée**, sauf vérification en personne (`--allow-existing`).
- **Prouvé en local** : adresse occupée → refusée ; après création, inscription pirate → « User already registered » ; ancien mot de passe pirate → refusé ; le lien de l'email ouvre bien « choisir son mot de passe ».
- `DEPLOY.md` § 5.3 est à jour.

**🟠 À corriger — corrigés (migration 0006, tests X1–X6) :**
1. **Supprimer un compte de vigile effaçait tout son journal de scans**, et donc les chiffres de la soirée. Le journal est maintenant conservé. `DEPLOY.md` dit désormais de **bannir** les comptes le lendemain, pas de les supprimer.
2. **La suspension ne retirait pas tous les pouvoirs.**
   - Un invité suspendu voyait encore la liste des participants.
   - Un **vigile suspendu pouvait encore scanner**.
   - Maintenant, suspendu = plus rien.
3. **Occupation d'email côté invités** : c'est la question 8 ci-dessus (décision produit, non changée).

**Petits points corrigés** :
- Un scan d'un pass d'un autre lieu n'enregistre plus la réservation de ce lieu (avant, le pseudo de son invité apparaissait).
- L'ancienne fonction `check_in` est fermée à l'API.
- Les messages ne peuvent plus être antidatés.
- La CI est figée par empreintes (actions GitHub, image gitleaks, pgserver).
- `check:csp` échoue si un fichier d'hébergement manque.
- La CSP du site équipe est à jour dans `SECURITY.md`.

**Acceptés pour V1** (consignés dans `SECURITY.md` § 4) :
- **Connexion forcée par lien piégé** (*login CSRF*, risque faible). Le remède, le flux PKCE, casserait les liens « mot de passe oublié » ouverts dans un autre navigateur, ce qui est fréquent sur téléphone.
- **Contourner une suspension** en supprimant son compte puis en se réinscrivant.
- **Pseudo affiché sur un faux code** qui reprend un vrai numéro de réservation (risque très faible).

**Ajouté à la liste de contrôle** : lancer `check-bundle-secrets` sur la **vraie** compilation de chaque site, car la CI ne vérifie qu'une compilation faite avec des valeurs fictives.

## À savoir

- **La base locale a été remise à zéro** (plusieurs fois) pendant les tests : les 40 invités fictifs et l'offre cocktails allumée pour la démo **ont disparu**. Les comptes de démo sont recréés (`pnpm db:seed-users`). Pour refaire la démo remplie, dis-le-moi.
- Correctif de la nuit dans `pnpm security:csp` : il ne trouvait pas `playwright-core` (installé dans `e2e/`) et attendait le WebAssembly depuis le CDN au lieu du site équipe.
- Les worktrees de la nuit (`~/Documents/GitHub/outly-wt/…`) et les branches locales `night/*` sont supprimés ; tout leur contenu est dans `slice/1-rouge-night`.
- Journal détaillé : `state/night-2026-10-13/STATUS.md`. Plan de la nuit : `PLAN.md` (même dossier).

## Prochaines étapes proposées

1. Relire la PR #5 (gros diff : commencer par `supabase/migrations/0004`, `0005`, puis `docs/SECURITY.md`).
2. Fusionner #5 dans `slice/1-rouge` quand c'est bon pour toi (je ne fusionne jamais moi-même).
3. Dès que les CEO ont acheté le domaine + Supabase Pro : suivre `docs/DEPLOY.md` dans l'ordre, puis **tester le scan sur de vrais téléphones** (iPhone surtout : il passe par le lecteur WebAssembly).
