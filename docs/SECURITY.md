# Sécurité d'Outly

> Pour toute l'équipe (CEO compris) et pour les développeurs. Mis à jour le 14 octobre 2026 (relecture sécurité indépendante + CSP).
> Une fuite de données personnelles en Australie peut devoir être **déclarée à l'OAIC et aux personnes touchées** (régime *Notifiable Data Breaches*), en plus du coût en réputation auprès des clubs. Ce document dit ce qu'on protège, contre qui, ce qui est en place, ce qui reste à faire avant la mise en ligne, et quoi faire si quelque chose tourne mal.

## 1. Ce qu'on protège

| Donnée | Où | Sensibilité |
|---|---|---|
| Email, prénom, date de naissance | `auth.users`, `profiles` | **Élevée** (identité, âge) |
| Présence à une soirée, heure d'entrée | `bookings`, `scan_events` | **Élevée** (localisation d'une personne un soir donné) |
| Pseudo, mode fantôme / classique | `profiles`, `bookings` | Moyenne |
| Signalements et blocages | `reports`, `blocks` | **Élevée** (harcèlement, sécurité des personnes) |
| Commissions et compte Stripe des clubs | `venues` | Commerciale |
| Comptes du personnel (vigiles, barmans, managers) | `venue_memberships` | Élevée : un compte volé ouvre le scan |
| **Clés** : clé « service » Supabase, secrets Google / Resend / Stripe | Secrets des fonctions serveur, tableau de bord Supabase | **Critique** : la clé service donne accès à toute la base |

## 2. Qui pourrait attaquer, et comment

| Menace | Exemple concret |
|---|---|
| **Utilisateur curieux** | Utilise l'API Supabase directement (la clé publique est dans le site, c'est normal) pour lire les données des autres |
| **Robot** | Crée 200 faux comptes et remplit la guest list en quelques minutes ; teste des mots de passe ou des codes |
| **Invité malveillant** | Repère quelqu'un dans la liste des participants pour le harceler |
| **Membre du personnel malveillant** ou **téléphone de vigile volé** | Fabrique de faux pass, consulte les invités |
| **Compte d'équipe piraté** (GitHub, Supabase, Vercel, email) | Accès au code, aux clés ou à toute la base |
| **Fuite de clé** | Clé service collée dans le code d'un site, dans un message ou dans Git |
| **Bibliothèque compromise ou vulnérable** | Faille dans une dépendance npm |

## 3. Ce qui est en place (vérifié)

| Protection | Détail | Preuve |
|---|---|---|
| **Sécurité par ligne (RLS) sur toutes les tables** | Chaque requête est filtrée par la base selon l'utilisateur, quoi que fasse le site | 69 vérifications (`pnpm db:test`), CI ; sonde de l'API locale (anonyme + compte normal) : 37 tables/vues, 19 fonctions |
| **Fonctions internes hors de l'API** | 20 fonctions déplacées dans le schéma `private` : impossible de demander « A et B sont-ils amis / bloqués ? » | Migration 0003 (H1), sondes API |
| **Pseudos seulement** | La liste publique des profils ne montre que `id`, pseudo, avatar ; la liste des participants seulement les pseudos des personnes en mode classique | 0003 (H3), tests R3/H3 |
| **Mode fantôme par défaut, réciproque** | Invisible = ne voit personne | Tests R2/R3 |
| **Bloquer / signaler partout** | Un blocage cache dans les deux sens ; les signalements vont à l'équipe Outly | Tests R6, T6 |
| **18 ans minimum** | Contrôle dans le formulaire **et** déclencheur dans la base | Tests T1, profil |
| **Pass QR à usage unique** | Code aléatoire non devinable, renouvelé au scan ; une capture d'écran ne passe qu'une fois ; le vigile vérifie aussi le billet | Tests R8, T5 |
| **Personnel limité au strict nécessaire** | Vigiles et barmans ne lisent ni les réservations ni les codes des pass : ils passent par `scan_pass` / `redeem_offer` | 0003 (H4), test H4 |
| **Journal de tous les scans** | Chaque scan, réussi ou refusé, est enregistré (qui, quand, résultat) | `scan_events`, tests R8/R9 |
| **Colonnes protégées sur son propre profil** | Une personne ne peut pas lever sa propre suspension, se déclarer « identité vérifiée », changer son niveau, ses absences ou ses données de parrainage ; seul le support Outly (et le serveur) le peut. À la création du profil, impossible de se donner un parrain, de choisir son code de parrainage ou d'antidater son compte ; un « upsert » ne contourne pas la règle. Accepter une demande d'ami ne permet pas de changer qui l'a envoyée ; un message ne peut être ni déplacé dans un autre groupe ni antidaté | Migration 0004, tests P1–P3 ; trous reproduits via l'API locale **avant**, refusés **après** (HTTP 400 / 403) |
| **Une personne = un pass** | La guest list ne se rejoint que par `join_event_list` (1 place). `join_guest_list` (jusqu'à 30 places d'un coup : 7 comptes remplissaient les 200 places) et `request_table` (réservations de table, reportées par A1) sont fermées à l'API | Migration 0005, tests F2, T5 ; sondé : HTTP 200 et « 31 / 200 » **avant**, HTTP 403 **après** |
| **La suppression d'un compte ne peut pas être bloquée** | Toute référence facultative à une personne (parrain, vigile qui a scanné, manager qui a créé la soirée…) est effacée avec elle (`ON DELETE SET NULL`). Avant : n'importe qui pouvait se déclarer « parrainé » par quelqu'un et empêcher cette personne de supprimer son compte ; un compte de vigile ayant scanné ne pouvait plus être supprimé | Migration 0005, tests F1 ; sondé : suppression HTTP 500 **avant**, 200 **après** |
| **Suspension = plus aucun pouvoir** | Un compte suspendu ne voit plus la liste des participants et ne peut plus changer sa visibilité ; un **membre du personnel** suspendu ne peut plus scanner, valider une offre ni lire les chiffres du lieu | Migration 0006, tests X1–X2 (échouent sans 0006) |
| **Historique des scans conservé** | Supprimer un compte de vigile ne supprime plus ses scans (avant : tout son journal disparaissait). Un scan au lieu A d'un pass du lieu B n'enregistre plus la réservation de B (avant : le pseudo de l'invité de B apparaissait dans les « derniers scans » de A). `check_in`, remplacée par `scan_pass`, est fermée à l'API | Migration 0006, tests X3, X4, X6 |
| **Comptes du personnel impossibles à détourner** | `rouge:staff` crée des comptes **déjà confirmés** puis envoie « choisir son mot de passe » ; il refuse une adresse qui a déjà un compte sans rôle au lieu (sauf vérification en personne, `--allow-existing`). Avant : avec une invitation Supabase, quiconque s'inscrivait avec l'adresse d'un vigile avant qu'il clique obtenait une session sur son compte (vigile ou manager) | Prouvé en local : adresse occupée → refusée ; après création, inscription pirate → « User already registered », ancien mot de passe pirate → refusé |
| **Colonnes commerciales masquées** | Commission et compte Stripe illisibles par l'API ; seuls managers et équipe Outly les lisent via une fonction | 0003 (H5), tests H5 |
| **CAPTCHA anti-robots (prêt, à activer)** | Cloudflare Turnstile sur inscription, connexion, code email et mot de passe oublié ; jeton à usage unique, widget réinitialisé après chaque tentative ; **sans clé configurée, le site marche comme avant** | Testé en local avec les clés de test officielles : inscription OK avec un CAPTCHA valide, **compte refusé quand le serveur rejette le CAPTCHA**, **appel direct à l'API sans CAPTCHA refusé** |
| **Connexion durcie** | Mots de passe 8+ caractères avec lettres et chiffres ; codes email valables 10 min ; 1 email d'authentification par minute et par personne ; changement de mot de passe après reconnexion récente | `supabase/config.toml`, vérifié sur la base locale |
| **Suppression de compte** | Par la personne elle-même, depuis son profil ; fonction serveur qui n'accepte que les sites Outly (`ALLOWED_ORIGINS`) et une session valide | `supabase/functions/delete-account` ; sondé en local : sans session → 401, clé publique seule → 401, **session valide depuis un autre site → 403 et compte conservé** |
| **Aucun secret dans le code ni dans l'historique** | Fichiers `.env*` ignorés ; analyse gitleaks de tout l'historique à chaque PR | CI « secrets » |
| **Aucun secret dans les sites compilés** | Les deux sites sont compilés en CI puis analysés (clés secrètes Supabase / Stripe / Anthropic / Google / Resend, **clé secrète Turnstile**, secret OAuth Google, jetons « service_role », variables publiques au nom suspect) | CI « websites », `pnpm check:secrets` (testé avec de fausses clés : détectées ; la clé de site Turnstile, publique, passe) |
| **Politique de sécurité du navigateur (CSP)** | Les deux sites n'exécutent que leur propre code (pas de script injecté, pas d'`eval`), ne parlent qu'à Supabase (+ Turnstile pour le site client, + le fichier du lecteur QR pour le site équipe), ne peuvent pas être affichés dans le cadre d'un autre site | `pnpm security:csp` : 18 vérifications dans Chrome, **0 violation** (§ 9) ; `pnpm check:csp` en CI |
| **CI en lecture seule, outils figés** | Le jeton GitHub de la CI ne peut que lire le dépôt (`permissions: contents: read`) ; actions GitHub figées par empreinte de commit, image gitleaks par empreinte `sha256`, `pgserver` par version exacte | `.github/workflows/ci.yml` |
| **Failles des dépendances surveillées** | La CI échoue sur toute faille haute/critique non justifiée | CI « dependencies », § 6 |
| **HTTPS obligatoire pour le scan** | La caméra du navigateur ne marche qu'en HTTPS | Hébergement |

## 4. Risques restants et décisions à prendre

| Risque | Gravité | Ce qu'on propose | Qui décide |
|---|---|---|---|
| **Un robot remplit les 200 places de la guest list** | **Haute** pour Rouge | CAPTCHA **Cloudflare Turnstile** : **codé et testé** (inscription, connexion, code email, mot de passe oublié). Il ne manque que le compte Cloudflare (gratuit) pour obtenir les vraies clés — voir § 5 | CEO |
| **Limite d'inscriptions par adresse IP** : 30 / 5 min. Au club, des centaines d'invités partagent **une seule IP** (Wi-Fi du club, 4G) → les vrais invités seraient bloqués | **Haute** le soir même | Relever `sign_in_sign_ups` en production pour la soirée (ex. 300 / 5 min) **et** activer le CAPTCHA | Équipe tech |
| Téléphone de vigile perdu ou volé | Moyenne | Un compte par personne, mot de passe fort, comptes désactivés après la soirée ; le vigile ne peut que scanner | Équipe tech + managers |
| Harcèlement via la liste des participants | Moyenne | Mode fantôme par défaut, pseudos seulement, bloquer / signaler, suspension par l'équipe Outly ; quelqu'un de l'équipe doit **surveiller les signalements le soir même** | CEO |
| URL de preview Vercel de l'admin publique | Faible tant que l'admin n'affiche rien sans connexion | Activer la *Deployment Protection* de Vercel sur les previews ; l'admin doit vérifier `outly_staff` côté serveur | Matthieu |
| Failles connues dans des outils de développement (§ 6) | Faible | Acceptées et suivies ; à retirer dès qu'un correctif sort | Équipe tech |
| **Limite d'emails d'authentification** : le réglage local `email_sent = 2` (par heure, **pour tout le projet**) recopié en production bloquerait les codes et liens après 2 emails par heure | **Haute** le soir même | En production, avec Resend : *Auth → Rate Limits → emails* à **500 / heure** au moins pour la soirée ; ne PAS recopier ce réglage local | Équipe tech |
| **Adresses de retour (redirect URLs) trop larges en production** : la liste locale contient `exp://**` et `http://localhost…/**`. En production, un lien « mot de passe oublié » demandé avec une adresse de retour piégée (`exp://…` vers le serveur d'un attaquant) enverrait la session de la victime à l'attaquant | **Haute** si recopié | En production : *Site URL* = l'adresse du site client ; *Redirect URLs* = **uniquement** `https://<site client>/**` (et plus tard `outly://**` pour l'app native). **Jamais** `exp://**` ni `localhost` | Équipe tech |
| **Occuper l'adresse email de quelqu'un** (confirmation d'email désactivée, SPEC A6) : un attaquant qui connaît l'email d'un invité s'inscrit avant lui, avec son propre mot de passe. Quand la vraie personne arrive, le site lui dit « déjà inscrit » ; elle se connecte par code email… mais **l'attaquant garde l'accès** (son mot de passe et sa session marchent toujours) : il voit son prénom, sa date de naissance et son pass, peut passer le fast lane avant elle ou annuler sa place. Un « mot de passe oublié » de la victime coupe l'attaquant ; une connexion par code, non. Prouvé en local (audit du 14 oct.) | **Moyenne** (ciblé : il faut connaître l'email à l'avance) | **Activer la confirmation d'email** (*Confirm email*) : ferme ce trou et l'énumération des comptes. Coût : un email de plus à l'inscription. Sinon, accepter et le noter | **CEO / Gabriel** |
| Savoir si un email a un compte Outly : l'API d'inscription répond « déjà inscrit » et le site l'affiche | Faible | Même remède que la ligne précédente | CEO / Gabriel |
| Connexion forcée (*login CSRF*) : un lien piégé `…/#access_token=…` connecte la victime **au compte de l'attaquant** (les sites lisent la session dans l'adresse, pour les liens « mot de passe oublié » et la connexion Google) | Faible | Accepté pour V1 : passer au flux PKCE casserait les liens « mot de passe oublié » ouverts dans un autre navigateur que celui de la demande (fréquent sur téléphone : appli mail → navigateur) et ceux envoyés par `rouge:staff`. À revoir pour les apps natives | Équipe tech |
| Contourner une suspension : la personne supprime son compte puis se réinscrit avec la même adresse | Faible | Accepté pour V1 ; sinon garder une empreinte des emails suspendus | CEO |
| Au scan, un faux code qui reprend le numéro d'une vraie réservation du lieu (sans le bon code secret) affiche quand même le pseudo de l'invité au vigile | Très faible | Le vigile du lieu ne connaît pas les numéros de réservation ; à corriger avec la prochaine version de `scan_pass` (ne renvoyer le pseudo que pour « OK » / « déjà utilisé ») | Équipe tech |
| Tout compte connecté peut lister tous les pseudos (`public_profiles`, sans prénom). Le conseiller Supabase la signale en « ERROR » (*Security Definer View*) : c'est voulu (elle contourne la RLS de `profiles` pour ne montrer que `id`, pseudo, avatar ; connexion obligatoire ; suspendus et bloqués exclus ; test H3). Aucune page ne l'utilise en V1 | Faible | **Décision du 23 oct. : gardée jusqu'à Rouge**, puis supprimée (migration 0007 + test H3) ; la recherche d'amis passera par une fonction qui ne renvoie que les pseudos demandés | Gabriel |
| Surfaces Supabase inutilisées en production : GraphQL (`pg_graphql`, actif par défaut sur un projet hébergé), canaux Realtime publics, schéma OpenAPI lisible avec la clé publique | Faible | Désactiver `pg_graphql` et les canaux Realtime publics (*Realtime → Settings*) s'ils restent inutilisés ; la RLS protège de toute façon les données | Équipe tech |
| CSP : styles en ligne autorisés (`'unsafe-inline'` dans `style-src`, imposé par React Native Web) ; le lecteur QR de secours peut, en dernier recours, télécharger son WebAssembly depuis `fastly.jsdelivr.net` (CDN tiers, URL exacte figée) | Faible | Le CSS ne peut pas exécuter de script. Le WebAssembly est servi par le site équipe lui-même (`public/zxing/3.1.3/`) ; le CDN ne sert que si cette copie manque, et tout fichier (local ou CDN) est rejeté si sa taille ou son SHA-256 ne correspond pas | Équipe tech |
| Session du personnel : un jeton de rafraîchissement reste valable tant qu'il sert (pas de durée maximale de session) | Moyenne (téléphone volé) | Déconnexion + mot de passe changé + comptes désactivés le lendemain (§ 5) ; *Auth → Sessions → inactivity timeout* (offre Pro) si besoin | Équipe tech |
| Un signalement peut être créé directement avec un statut « traité » (`reports.status`, `handled_by`) : il n'apparaîtrait pas dans une file filtrée sur « ouvert ». Seul l'auteur se nuit à lui-même | Faible | Avec l'admin : forcer `status = 'open'` à la création (déclencheur ou droits par colonne) | Équipe tech |
| Le déclencheur de 0004 bloque **toute** modification des colonnes protégées par un utilisateur connecté, même via une fonction `SECURITY DEFINER` : une future fonction « utiliser un code de parrainage » devra passer par le serveur (clé service) ou adapter le déclencheur | Info | À prévoir avec la fonctionnalité de parrainage | Équipe tech |
| Supprimer (masquer) un de ses messages de groupe échoue aujourd'hui (la base refuse la ligne devenue invisible) — bug sans effet en V1, les groupes sont masqués | Faible | À corriger avec le chantier des groupes (une fonction `delete_message`) | Équipe tech |

## 5. Liste de contrôle avant la mise en ligne

**Comptes (le plus important — la plupart des piratages passent par là)**
- [ ] **Double authentification (2FA)** activée sur : GitHub (Gabriel, Matthieu, Tondal775), Vercel, Supabase, Cloudflare, Google Cloud, Resend, registrar du domaine, et les emails de l'équipe.
- [ ] Un **gestionnaire de mots de passe** pour l'équipe. Jamais de mot de passe ni de clé par message ou par email.
- [ ] Le moins d'administrateurs possible sur chaque service ; retirer les accès inutiles.

**Supabase (production)**
- [ ] Région **Sydney**, offre **Pro** (sauvegardes quotidiennes ; envisager la restauration à la minute près).
- [ ] Réglages Auth identiques à `supabase/config.toml` (**sauf** limites de débit et adresses de retour, voir plus bas) : inscriptions anonymes **désactivées**, mots de passe `letters_digits`, codes 10 min, 1 email / minute, changement de mot de passe sécurisé, modèles d'email « code à 6 chiffres ».
- [ ] **CAPTCHA Turnstile** activé : créer un widget Turnstile dans Cloudflare (domaines = ceux du site client), mettre la **clé secrète** dans Supabase (*Auth → Bot and Abuse Protection → Turnstile*) et la **clé de site** (publique) dans la variable `EXPO_PUBLIC_TURNSTILE_SITE_KEY` du site client, puis redéployer. Test : une inscription normale passe ; un appel direct à l'API sans CAPTCHA est refusé.
- [ ] Limites de débit adaptées au soir de Rouge (§ 4) : inscriptions / connexions par IP, vérifications de code par IP, et **emails par heure (≥ 500)**.
- [ ] *Redirect URLs* : uniquement `https://<site client>/**` (pas `exp://**`, pas `localhost`) ; *Site URL* = le site client.
- [ ] `pg_graphql` désactivé et canaux Realtime publics désactivés s'ils ne servent pas.
- [ ] Migrations `0004` (colonnes protégées) et `0005` (un pass par personne, suppression de compte jamais bloquée) appliquées.
- [ ] *Leaked password protection* activée si disponible.
- [ ] SMTP Resend sur le domaine, avec **SPF, DKIM et DMARC** (sinon les codes finissent en spam, et le domaine peut être usurpé).
- [ ] Secrets des fonctions : `ALLOWED_ORIGINS` = les adresses exactes des sites. La clé service n'existe **nulle part ailleurs** que dans Supabase.
- [ ] Ne **jamais** lancer `seed_demo.sql` ni `pnpm db:seed-users` en production.

**Hébergement et code**
- [ ] HTTPS partout ; domaine définitif ; en-têtes de sécurité des sites actifs, **CSP comprise** (§ 9, `pnpm check:csp` vert) ; vérifier dans la console du navigateur, sur le vrai domaine, qu'aucune ligne « Content Security Policy » n'apparaît (inscription, CAPTCHA, scanner sur un iPhone).
- [ ] GitHub : **alertes Dependabot** activées (Matthieu, propriétaire du dépôt) ; garder la CI verte avant toute fusion.
- [ ] Vercel : *Deployment Protection* sur les previews.
- [ ] Lancer `node scripts/check-bundle-secrets.mjs <dossier>` sur la **vraie** compilation de chaque site (celle de l'hébergeur, avec les vraies variables) : la CI ne vérifie qu'une compilation faite avec des valeurs fictives.

**Le soir de Rouge**
- [ ] Comptes du personnel : un par personne, créés par `pnpm rouge:staff` (en production : compte confirmé + email **« choisir son mot de passe »** — `docs/DEPLOY.md` § 5.3 ; **jamais** d'invitation Supabase depuis le tableau de bord, qui laisse le compte détournable tant que le lien n'est pas cliqué) ; jamais de mot de passe envoyé par message ; **bannis le lendemain** (pas supprimés).
- [ ] CAPTCHA : la clé de site Turnstile est sur **les deux sites** (client et équipe) — sinon, une fois activé dans Supabase, les vigiles ne peuvent plus se connecter.
- [ ] Une personne de l'équipe Outly surveille les signalements et peut suspendre un compte.
- [ ] Plan B à la porte : si le site ne répond pas, la file normale avec le billet.

## 6. Dépendances : failles connues et acceptées

| Paquet | Gravité | Où | Pourquoi c'est accepté | Suivi |
|---|---|---|---|---|
| `node-forge` (GHSA-86w9-cpqp-85rv) | Haute | `@expo/cli` (signature de code) | Outil de compilation, jamais envoyé aux navigateurs ; pas de correctif | Ignoré dans `pnpm-workspace.yaml` |
| `braces` (GHSA-vfj7-8cjw-p6xm) | Haute | CLI `shadcn` (admin) | Outil de développement, jamais envoyé aux navigateurs ; pas de correctif | Ignoré dans `pnpm-workspace.yaml` |
| `decode-uri-component` (GHSA-vcc3-ghjq-m6fr) | Moyenne | `expo-router` → `query-string` (**dans les sites**) | Un lien piégé peut figer l'onglet de la personne qui l'ouvre, sans accès à des données. Le correctif (0.5.0) n'est utilisable que par des modules ESM : le forcer casserait la navigation | Surveiller les mises à jour d'Expo Router |
| `uuid` (GHSA-w5hq-g745-h8pq) | Moyenne | `@expo/config` (compilation) | Outil de compilation ; correctif à prendre avec une mise à jour d'Expo | Signalé par `pnpm audit` |

La CI (`dependencies`) échoue sur toute **nouvelle** faille haute ou critique.

## 7. En cas d'incident

Exemples : clé service exposée, compte d'équipe piraté, données visibles par les mauvaises personnes, comportement anormal dans les journaux.

1. **Contenir, tout de suite.** Changer la clé exposée (Supabase → *API keys* : régénérer), déconnecter le compte piraté et changer son mot de passe, suspendre les comptes malveillants (`profiles.suspended_at`), au besoin **désactiver les inscriptions** dans Supabase.
2. **Comprendre.** Qu'est-ce qui a fuité, depuis quand, combien de personnes ? Journaux Supabase (Auth, API), `scan_events`, historique Git. Noter tout, avec les heures.
3. **Décider s'il faut déclarer.** Si des personnes risquent un préjudice grave, la loi australienne impose d'**évaluer sous 30 jours** et, si c'est confirmé, de **prévenir l'OAIC et les personnes touchées** (oaic.gov.au). Prévenir les CEO immédiatement.
4. **Corriger et prouver.** Correctif + test qui prouve que la faille est fermée, PR relue, mise à jour de ce document.

## 8. Règles pour les développeurs

- Toute nouvelle table : RLS + politiques + test dans `supabase/tests/`. Toute fonction interne : schéma `private`, jamais `public` (l'API expose tout ce qui est dans `public`).
- Fonctions appelées par les sites : vérifier `auth.uid()` et le rôle **dans** la fonction ; révoquer `anon` si une connexion est nécessaire.
- Sur `venues`, toujours lister les colonnes (les colonnes commerciales ne sont pas accordées).
- Jamais de secret dans une variable `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` : elles finissent dans le site. `pnpm check:secrets <dossier compilé>` le vérifie.
- Ne jamais ouvrir, afficher ni commiter un fichier `.env*` (hors `.env.example`).
- Messages d'erreur : jamais d'erreur brute de la base (codes `OUTLY_*` traduits dans `packages/core`).
- Une politique RLS « ALL / UPDATE » sur ses propres lignes laisse modifier **toutes** les colonnes : restreindre les colonnes (droits par colonne ou déclencheur, comme `0004`) dès qu'une colonne est réservée à l'équipe ou au serveur.
- Pas de script en ligne ni d'`eval` dans les sites ; toute nouvelle origine externe (script, iframe, API) s'ajoute dans `security/csp.mjs` **et** passe `pnpm security:csp`.

## 9. Politique de sécurité du navigateur (CSP)

La CSP dit au navigateur d'où le site a le droit de charger du code, des styles, des images, et à qui il peut parler. Si quelqu'un réussit un jour à glisser du HTML dans une page (XSS), le navigateur refuse d'exécuter son script et d'envoyer des données ailleurs que vers Supabase. **Source unique** : `security/csp.mjs` (chaque règle y est expliquée). `node security/csp.mjs` affiche les deux politiques.

**Site client** (inscription, Night, Pass, Profil) :
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; media-src 'none'
```

**Site équipe** (porte, bar, Tonight) :
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; media-src 'self' blob: mediastream:
```

| Règle | Pourquoi |
|---|---|
| `default-src 'self'` | Tout ce qui n'est pas listé : le site lui-même seulement |
| `script-src 'self'` | Seul le code du site s'exécute : **aucun script en ligne, aucun `eval`**. Les deux sites : + `challenges.cloudflare.com` (Turnstile). Équipe : + `'wasm-unsafe-eval'` (compiler le WebAssembly du lecteur QR, sans autoriser `eval`) |
| `style-src 'self' 'unsafe-inline'` | React Native Web écrit les styles à l'exécution (et `index.html` a un `<style>` en ligne) : sans `'unsafe-inline'` → violations en série (testé). Le CSS n'exécute pas de script |
| `img-src 'self' data: blob:` | Images et icônes du site ; `data:`/`blob:` gardés par prudence (pas nécessaires dans les parcours testés, sans risque d'exécution) |
| `font-src 'self'` | Plus Jakarta Sans et Ionicons sont livrées avec le site (aucune requête Google Fonts, vérifié) |
| `connect-src 'self' https://*.supabase.co wss://*.supabase.co` | API Supabase (REST, Auth, fonctions). `wss:` pour Realtime (pas utilisé aujourd'hui). Équipe : + **l'URL exacte** du fichier `zxing_reader.wasm` |
| `frame-src` | Client : `challenges.cloudflare.com` (l'iframe Turnstile). Équipe : `'none'` |
| `media-src` | Client : `'none'`. Équipe : `'self' blob: mediastream:` (aperçu caméra ; Chrome n'en a pas besoin, gardé pour Safari, non testé) |
| `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | Pas de plugins ; une balise `<base>` injectée ne peut pas détourner les scripts ; pas d'envoi de formulaire ailleurs |
| `frame-ancestors 'none'` | Personne ne peut afficher le site dans un cadre (anti-clickjacking). **Fonctionne seulement en en-tête HTTP**, pas en `<meta>` |

**Mettre en place** (l'orchestrateur colle les chaînes ci-dessus, **sans** le préfixe `Content-Security-Policy: ` dans `value`) — site client dans `apps/customer/…`, site équipe dans `apps/partner/…` :
- Cloudflare Pages — `apps/<site>/public/_headers` (copié dans le site compilé) : une ligne dans le bloc `/*` existant (remplacer la ligne de commentaire `# >>> Content-Security-Policy goes here …` du chantier A) :
  ```
  /*
    Content-Security-Policy: <politique du site>
  ```
  Une seule ligne CSP par fichier (un deuxième bloc avec une autre CSP fait échouer `pnpm check:csp`).
- Vercel — `apps/<site>/vercel.json` : ajouter `{ "key": "Content-Security-Policy", "value": "<politique du site>" }` dans le tableau `headers` de l'entrée `"source": "/(.*)"` existante. Garder l'ordre `key` puis `value` (sinon `pnpm check:csp` ne trouve pas l'en-tête et échoue).
- Puis `pnpm check:csp` (doit dire « 4 hosting file(s) ») et **relancer `pnpm security:csp`** : le gabarit `public/index.html` du chantier A change la page servie.
- `pnpm check:csp` (aussi en CI) vérifie que ces fichiers portent **exactement** la politique testée, que la politique garde ses propriétés de sécurité, et que l'URL du WebAssembly correspond à la version de `zxing-wasm` installée.
- Une fois le projet Supabase de production créé, on peut remplacer `*.supabase.co` par l'adresse exacte du projet : `buildCsp('customer', { supabaseUrl: 'https://<ref>.supabase.co' })` (accepté par `pnpm check:csp`). C'est plus strict : un script injecté ne pourrait plus envoyer de données vers un autre projet Supabase.

**Preuve** — `pnpm security:csp` (Supabase local démarré, Google Chrome, `playwright-core` installé ou `PLAYWRIGHT_CORE_PATH`) : compile les deux sites, les sert avec la CSP (Supabase local à la place de `*.supabase.co`), puis dans Chrome avec une **fausse caméra qui filme un QR code** :
- client : page d'inscription, **widget Turnstile** (clé de test publique de Cloudflare), inscription, profil, inscription à la guest list, **QR du pass**, onglets, déconnexion, reconnexion ;
- équipe : connexion, Tonight, scanner de porte avec le **BarcodeDetector natif** puis avec le **lecteur WebAssembly de secours** (BarcodeDetector supprimé, comme sur iPhone) : le QR est lu, `scan_pass` répond « Invalid pass », le WebAssembly est chargé **depuis le site équipe lui-même** (HTTP 200, pas le CDN).
- Résultat le 14 oct. 2026 : **18 vérifications, 0 violation**. Contre-épreuves (le test doit échouer) : sans `'wasm-unsafe-eval'` → le lecteur de secours est bloqué ; sans `challenges.cloudflare.com` → le CAPTCHA ne charge pas ; sans `'unsafe-inline'` pour les styles → violations en série. Variable `CSP_TEST_DROP` pour refaire ces contre-épreuves.

**Limites connues**
- Pas testé dans Safari / iPhone (le scanner de porte y passe par le lecteur WebAssembly) : à vérifier sur un vrai iPhone sur le domaine final avant le 24 oct.
- `zxing_reader.wasm` est servi par le site équipe (`apps/partner/public/zxing/3.1.3/`, voir `apps/partner/src/lib/qrReader.web.ts`), avec contrôle de taille et de SHA-256. L'URL exacte du CDN reste dans `connect-src` comme secours si la copie locale manque ; pour la retirer, enlever `CDN_URL` du lecteur et `ZXING_WASM_URL` de `security/csp.mjs`. Toute mise à jour de `zxing-wasm` doit mettre à jour le fichier, son empreinte et `ZXING_WASM_URL` (`pnpm check:csp` le signale).
- *Trusted Types* (`require-trusted-types-for 'script'`) a été essayé : il bloque le chargement du script Turnstile (`script.src`) ; il faudrait une politique Trusted Types dans `Captcha.web.tsx`.

