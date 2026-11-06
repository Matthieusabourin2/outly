# Mettre Outly en ligne

> Pour Gabriel et Matthieu. Rédigé le 14 octobre 2026 pour la soirée **Rouge** (sam. 24 oct.).
> Ce document dit **dans quel ordre** tout mettre en ligne, **où cliquer**, **quoi taper**, et **comment vérifier**.
> La sécurité (comptes, 2FA, CAPTCHA, incidents) est dans [`docs/SECURITY.md`](SECURITY.md) : ce guide y renvoie au lieu de la répéter.

**Légende**

- 👤 **HUMAIN** — une personne doit le faire (compte à créer, paiement, clic dans un tableau de bord, décision). Claude ne le fait pas.
- 💻 **TERMINAL** — une commande à lancer depuis le dossier du projet (Claude peut la lancer pour toi, sauf indication contraire).
- ✅ **VÉRIFIER** — le contrôle qui prouve que l'étape a marché.

**Règles qui ne bougent pas**

- Aujourd'hui, **seule l'admin (`apps/admin`) est sur Vercel**, déployée automatiquement par GitHub. **N'utilise jamais la CLI `vercel`** ni le MCP Vercel (`CLAUDE.md` § Déploiement).
- Jamais de clé secrète dans un message, un email, un fichier du dépôt ou une variable `EXPO_PUBLIC_*` (elles finissent dans le site, lisibles par tout le monde).
- Jamais de données de démo en production : ne lance **jamais** `pnpm db:reset`, `pnpm db:seed-users`, `supabase db reset --linked` ni `supabase db push --include-seed` sur le projet hébergé.

---

## 0. Vue d'ensemble

| Site | Code | Hébergement | Adresse proposée |
|---|---|---|---|
| Site client (invités) | `apps/customer` | Cloudflare Pages **ou** Vercel (pas encore décidé) | `https://<domaine>` |
| Site équipe (vigiles, barmans, managers) | `apps/partner` | Cloudflare Pages **ou** Vercel | `https://staff.<domaine>` |
| Admin | `apps/admin` | Vercel (déjà en place) | `https://admin.<domaine>` |
| Base, connexion, fonction serveur | `supabase/` | Supabase (projet hébergé, région Sydney) | `https://<ref>.supabase.co` |

`<domaine>` = le domaine acheté par les CEO (`outlysydney.com` ou `weareoutly.com`, voir `docs/PLAN.md`). `<ref>` = l'identifiant du projet Supabase (dans son URL).

**Ordre conseillé** (chaque étape dépend des précédentes) :

1. 👤 Comptes et achats (§ 1)
2. Supabase hébergé : projet, base, fonction, réglages Auth, emails, Google (§ 2)
3. Sites client et équipe sur Cloudflare Pages ou Vercel (§ 3)
4. Domaine et DNS, puis mise à jour des adresses partout (§ 4)
5. Contenu de Rouge et comptes du personnel (§ 5)
6. Test complet après mise en ligne, dont la caméra sur de vrais téléphones (§ 6)
7. Savoir revenir en arrière (§ 7)

---

## 1. Comptes et achats — 👤 HUMAIN

| Service | Pour quoi | Qui | Note |
|---|---|---|---|
| Registrar du domaine | Le domaine | CEO | Activer la 2FA et le verrouillage du domaine |
| Supabase **Pro** | Base + connexion + sauvegardes | CEO paie, Gabriel administre | Région **Sydney** |
| Cloudflare (gratuit) | Hébergement des 2 sites (si choisi), DNS, CAPTCHA Turnstile | Gabriel | |
| Resend | Envoi des emails (codes de connexion) | Gabriel | Domaine à vérifier (§ 2.5) |
| Google Cloud | Bouton « Continue with Google » | Gabriel | Écran de consentement OAuth |
| Vercel | Admin (déjà), et les 2 sites si ce choix est fait | Matthieu (propriétaire) | Jamais la CLI |

Avant d'aller plus loin : **2FA partout** et gestionnaire de mots de passe → `docs/SECURITY.md` § 5 « Comptes ».

---

## 2. Supabase hébergé

### 2.1 Créer le projet — 👤 HUMAIN

1. supabase.com → **New project**.
2. Organisation : celle d'Outly. Nom : `outly`. **Région : Asia-Pacific (Sydney) — `ap-southeast-2`**. Offre **Pro**.
3. Mot de passe de la base : en générer un long, le ranger **uniquement** dans le gestionnaire de mots de passe.
4. Noter le **Project ref** (la partie `<ref>` de `https://<ref>.supabase.co`) — ce n'est pas un secret.

### 2.2 Envoyer la base (migrations) — 💻 TERMINAL, lancé par Gabriel (👤 décision : touche la production)

Depuis la racine du projet, sur la branche qui doit partir en production (à jour avec `main`) :

```
pnpm exec supabase login                          # 👤 ouvre le navigateur pour se connecter à Supabase
pnpm exec supabase link --project-ref <ref>       # 👤 demande le mot de passe de la base (gestionnaire)
pnpm exec supabase db push --dry-run              # montre les migrations qui seront appliquées
pnpm exec supabase db push                        # applique les migrations pas encore envoyées (et rien d'autre)
```

- ⚠️ **Toujours avec le mot de passe de la base** (`read -s SUPABASE_DB_PASSWORD && export SUPABASE_DB_PASSWORD`, puis `db push`, puis `unset SUPABASE_DB_PASSWORD`). Sans mot de passe, la CLI se connecte avec un rôle temporaire (`cli_login_postgres`) qui ne voit pas le schéma `extensions` : la migration 0001 échoue sur `gen_random_bytes` (constaté le 22 oct. ; rien n'est appliqué dans ce cas, chaque migration est atomique).
- `db push` n'applique **que** les migrations de `supabase/migrations/`. Il ne lance pas les données de démo (`seed_demo.sql`), sauf avec `--include-seed` : **ne jamais ajouter ce drapeau**.
- ✅ VÉRIFIER : `pnpm exec supabase migration list` montre `0001`, `0002`, `0003` en local **et** en distant. Dans le tableau de bord → *Table Editor*, la table `venues` est **vide**.

### 2.3 Fonction serveur de suppression de compte — 💻 TERMINAL, lancé par Gabriel (👤 décision : touche la production)

```
pnpm exec supabase functions deploy delete-account
pnpm exec supabase secrets set ALLOWED_ORIGINS=https://<domaine>
```

- `ALLOWED_ORIGINS` = la ou les adresses **exactes** du site client, séparées par des virgules, sans `/` final (ex. `https://outlysydney.com,https://www.outlysydney.com` si `www` sert aussi le site). Seul le site client appelle cette fonction. Sans cette variable, la fonction refuse tout site qui n'est pas `localhost`.
- La fonction reçoit d'office `SUPABASE_URL` et la clé service : rien d'autre à mettre.
- Le **secret Turnstile** (CAPTCHA) n'est **pas** un secret de fonction : il se colle dans les réglages Auth (§ 2.4).
- ✅ VÉRIFIER : § 6, ligne « Supprimer le compte ».

### 2.4 Réglages de connexion (Auth) — 👤 HUMAIN, tableau de bord

Le fichier `supabase/config.toml` décrit les réglages **locaux** ; le projet hébergé ne le lit pas. Il faut recopier ces valeurs à la main dans le tableau de bord (*Authentication*). Les noms des menus Supabase changent parfois : la colonne « clé » donne le réglage exact de `config.toml` pour le retrouver.

| Réglage (tableau de bord) | Valeur | Clé dans `config.toml` |
|---|---|---|
| *URL Configuration* → Site URL | `https://<domaine>` (le site client) | `site_url` |
| *URL Configuration* → Redirect URLs | `https://<domaine>/**`, `https://staff.<domaine>/**`, `https://admin.<domaine>/**` | `additional_redirect_urls` |
| *Sign In / Providers* → Allow new users to sign up | **Activé** | `enable_signup` |
| Allow anonymous sign-ins | **Désactivé** (SPEC A6) | `enable_anonymous_sign_ins = false` |
| Allow manual linking | Désactivé | `enable_manual_linking = false` |
| *Email* → Confirm email | **Désactivé** : la confirmation ne bloque pas l'accès au pass (SPEC A6) | `[auth.email] enable_confirmations = false` |
| *Email* → Secure email change | Activé | `double_confirm_changes = true` |
| *Email* → Secure password change | **Activé** | `secure_password_change = true` |
| *Email* → Email OTP length | **6** | `otp_length = 6` |
| *Email* → Email OTP expiration | **600** secondes (10 min) | `otp_expiry = 600` |
| Minimum interval between emails (par personne) | **60** secondes | `max_frequency = "60s"` |
| *Passwords* → Minimum length | **8** | `minimum_password_length = 8` |
| *Passwords* → Required characters | **Letters and digits** | `password_requirements = "letters_digits"` |
| *Passwords* → Leaked password protection | Activé si l'offre le permet | — (voir SECURITY.md § 5) |
| *Sessions* → Access token (JWT) expiry | 3600 s | `jwt_expiry = 3600` |
| *Sessions* → Detect and revoke compromised refresh tokens | Activé, intervalle 10 s | `enable_refresh_token_rotation`, `refresh_token_reuse_interval = 10` |
| *Rate Limits* | Voir § 2.7 (soir de Rouge) | `[auth.rate_limit]` |

**Modèles d'email** (*Authentication → Emails → Templates*) : copier-coller le contenu des fichiers du dépôt.

| Modèle Supabase | Objet (subject) | Corps |
|---|---|---|
| **Magic Link** (code de connexion) | `Your Outly code` | contenu de `supabase/templates/magic_link.html` |
| **Confirm signup** | `Welcome to Outly` | contenu de `supabase/templates/confirmation.html` |
| **Reset Password** (mot de passe oublié, **et** premier mot de passe du personnel, § 5.3) | ex. `Choose your Outly password` | non fourni dans le dépôt : le modèle par défaut (un lien) marche ; à personnaliser si on veut |

Les deux modèles du dépôt affichent un **code à 6 chiffres** (`{{ .Token }}`) valable 10 minutes, pas un lien.

✅ VÉRIFIER : § 6, lignes « Inscription » et « Code par email ».

### 2.5 Emails : SMTP Resend + SPF / DKIM / DMARC — 👤 HUMAIN

Sans SMTP personnalisé, Supabase n'envoie que quelques emails par heure, depuis une adresse Supabase : inutilisable le soir de Rouge.

1. resend.com → *Domains* → **Add domain** → `<domaine>` (ou un sous-domaine d'envoi comme `mail.<domaine>`), région la plus proche.
2. Resend affiche des enregistrements DNS (**SPF** et **DKIM**, parfois MX) : les créer **tels quels** chez le gestionnaire DNS (§ 4). Attendre « Verified ».
3. Ajouter un enregistrement **DMARC** : type `TXT`, nom `_dmarc`, valeur `v=DMARC1; p=quarantine;` (on peut ajouter `rua=mailto:<adresse>` pour recevoir les rapports).
4. Resend → *API Keys* → créer une clé « Sending access » limitée au domaine. **Ne pas la copier ailleurs que dans Supabase.**
5. Supabase → *Authentication → Emails → SMTP Settings* → **Enable custom SMTP** :
   - Sender email : `no-reply@<domaine>` — Sender name : `Outly`
   - Host : `smtp.resend.com` — Port : `465` — Username : `resend` — Password : la clé API Resend
6. ✅ VÉRIFIER : recevoir un code (§ 6) sur une adresse Gmail **et** une adresse iCloud/Outlook ; il ne doit pas arriver dans les spams. Dans Gmail, « Afficher l'original » doit indiquer `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

Détails de sécurité (pourquoi SPF/DKIM/DMARC) : `docs/SECURITY.md` § 5.

### 2.6 Connexion Google — 👤 HUMAIN

1. Google Cloud Console → projet « Outly » → *APIs & Services → OAuth consent screen* : type **External**, nom « Outly », email de support, logo facultatif, domaine `<domaine>`, liens vers `https://<domaine>/privacy` et `https://<domaine>/terms`. Publier l'application (sinon seuls les testeurs peuvent se connecter).
2. *Credentials* → **Create credentials → OAuth client ID** → type **Web application** :
   - Authorized JavaScript origins : `https://<domaine>`
   - Authorized redirect URIs : `https://<ref>.supabase.co/auth/v1/callback`
3. Supabase → *Authentication → Sign In / Providers → Google* : activer, coller le **Client ID** et le **Client secret** (le secret reste dans Supabase, nulle part ailleurs).
4. Sur l'hébergeur du site client, mettre `EXPO_PUBLIC_GOOGLE_SIGN_IN=on` puis **redéployer** (§ 3.1). Tant que la variable n'est pas `on`, le bouton Google est caché.
5. ✅ VÉRIFIER : § 6, ligne « Google ».

### 2.7 CAPTCHA et limites du soir de Rouge — lire `docs/SECURITY.md`

- **CAPTCHA Cloudflare Turnstile** : la procédure complète est dans `docs/SECURITY.md` § 5 (« CAPTCHA Turnstile activé ») : clé **secrète** dans Supabase (*Authentication → Bot and Abuse Protection*), clé **de site** (publique) dans `EXPO_PUBLIC_TURNSTILE_SITE_KEY` **du site client ET du site équipe** (le widget Cloudflare doit autoriser les deux domaines), puis redéploiement des deux. ✅ CHECK juste après : un vigile de test se connecte au site équipe.
  - ⚠️ **À tester avant le soir** : une fois le CAPTCHA activé dans Supabase, Supabase l'exige aussi pour la **connexion par mot de passe**. Le site **équipe** (et l'admin) n'ont pas de CAPTCHA aujourd'hui : il faut vérifier, juste après l'activation, qu'un compte vigile arrive encore à se connecter sur `https://staff.<domaine>`. Si ce n'est pas le cas, désactiver le CAPTCHA et prévenir Gabriel (voir « Questions » dans le rapport de la nuit du 13 oct.).
- **Limites de débit le soir même** (`docs/SECURITY.md` § 4) : au club, des centaines d'invités partagent **une seule adresse IP** (Wi-Fi du club, 4G de l'opérateur). Avec la limite locale (`sign_in_sign_ups = 30` par 5 minutes et par IP), les vrais invités seraient bloqués à l'entrée. Dans *Authentication → Rate Limits*, pour la soirée :
  - inscriptions + connexions par IP : relever (ex. **300 / 5 min**) ;
  - vérifications de code par IP : relever de la même façon ;
  - emails envoyés par heure (avec Resend) : prévoir large (ex. **300 / h**) — chaque « Email me a code » envoie un email ;
  - **et** activer le CAPTCHA pour compenser. Remettre des valeurs normales après la soirée.

---

## 3. Héberger les sites client et équipe

L'hébergement n'est **pas encore décidé** (Cloudflare Pages dans `docs/PLAN.md`, Vercel possible). Les deux sont prêts dans le dépôt :

| Fichier | Rôle |
|---|---|
| `apps/<site>/public/index.html` | Modèle HTML du site (Expo SDK 57 le lit à la place du sien pour `web.output: "single"`) : `viewport-fit=cover`, manifest, icône Apple, fond sombre dès le chargement |
| `apps/<site>/public/manifest.webmanifest` + `public/icons/` | Site installable sur l'écran d'accueil (« Outly » / « Outly Staff ») |
| `apps/<site>/public/_headers` | En-têtes de sécurité pour **Cloudflare Pages** |
| `apps/<site>/public/_redirects` | **Volontairement sans règle** (voir « Retour SPA » ci-dessous) |
| `apps/<site>/vercel.json` | Pour **Vercel** : commande de build, dossier de sortie, retour SPA et les mêmes en-têtes |

Tout le contenu de `public/` est recopié tel quel dans `dist/` par `expo export` (vérifié).

### 3.1 Ce qui est commun aux deux hébergeurs

**Compiler en local** (pour vérifier avant de déployer) — 💻 TERMINAL :

```
pnpm build:customer-web        # → apps/customer/dist
pnpm build:staff-web           # → apps/partner/dist
pnpm check:secrets apps/customer/dist apps/partner/dist   # aucun secret dans les sites compilés
```

**Variables d'environnement** (noms exacts ; valeurs dans le tableau de bord de l'hébergeur, **jamais dans un fichier du dépôt**) :

| Variable | Site client | Site équipe | Valeur |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | oui | oui | `https://<ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | oui | oui | Supabase → *Project Settings → API Keys* → clé **publishable** (`sb_publishable_…`). **Jamais** la clé `secret` / `service_role` |
| `EXPO_PUBLIC_GOOGLE_SIGN_IN` | oui | — | `on` quand Google est prêt (§ 2.6), sinon `off` |
| `EXPO_PUBLIC_PRIVACY_EMAIL` | oui | — | l'adresse de contact « vie privée » affichée sur `/privacy` |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | oui | **oui** | clé **de site** Turnstile (publique) ; vide = pas de CAPTCHA. **À mettre sur les deux sites** : une fois le CAPTCHA activé dans Supabase, il est aussi exigé à la connexion du personnel, sinon les vigiles ne peuvent plus se connecter |
| `NODE_VERSION` (Cloudflare seulement) | `24` | `24` | version de Node pour la compilation |

> **Important — les valeurs sont figées à la compilation.** Les variables `EXPO_PUBLIC_*` sont recopiées dans le JavaScript du site au moment du build. Changer une valeur dans le tableau de bord **ne change rien** tant qu'on n'a pas **relancé un déploiement**. En local, `expo export` garde un cache des fichiers transformés : sans `--clear`, un nouveau build peut garder l'**ancienne** valeur (constaté : un 2ᵉ build gardait l'ancienne URL Supabase). C'est pourquoi `build:web` lance toujours `expo export … --clear` (quelques secondes de plus).

**En-têtes de sécurité** (identiques sur les deux hébergeurs) :

| En-tête | Valeur |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Permissions-Policy` | site client : `camera=(), microphone=(), geolocation=()` — site équipe : `camera=(self), microphone=(), geolocation=()` (la caméra sert au scan) |
| `Content-Security-Policy` | préparée par le chantier sécurité : emplacement marqué dans `_headers` ; dans `vercel.json`, une ligne de plus dans la liste `headers` de `"/(.*)"`. ⚠️ Site équipe : sur les navigateurs sans lecteur de QR intégré (iPhone/Safari), le scanner télécharge son module WebAssembly depuis `https://fastly.jsdelivr.net/npm/zxing-wasm@…` au premier scan : la CSP doit l'autoriser (`connect-src`, et `'wasm-unsafe-eval'` dans `script-src`), et le téléphone du vigile doit avoir du réseau |

Les fichiers compilés dont le nom contient une empreinte (`/_expo/static/…`, `/assets/…`) sont mis en cache un an ; la page HTML est revérifiée à chaque visite, donc un nouveau déploiement est visible tout de suite.

**Retour SPA** (une adresse comme `/pass` ou `/sign-in` ouverte directement ou rechargée doit afficher le site, pas une erreur 404) :

- **Cloudflare Pages** le fait tout seul : quand le site n'a pas de `404.html` à la racine, Pages renvoie `index.html` pour toute adresse inconnue. **Ne jamais ajouter de `404.html`** dans `public/`. Pas de règle dans `_redirects`, exprès : testé avec `wrangler pages dev` sur les sites compilés, `/* /index.html 200` est **rejetée** par Pages (« Infinite loop detected… ignored ») et `/* / 200` est **dangereuse** (elle passe avant les vrais fichiers : le JavaScript et les icônes reçoivent la page HTML, le site ne charge plus).
- **Vercel** : `vercel.json` contient la réécriture `/(.*)` → `/index.html` ; Vercel sert d'abord les fichiers qui existent, puis applique la réécriture.

### 3.2 Option A — Cloudflare Pages — 👤 HUMAIN, tableau de bord

À faire **deux fois** : une pour le site client, une pour le site équipe.

1. Cloudflare → *Workers & Pages* → **Create** → *Pages* → **Connect to Git** → GitHub → dépôt `Matthieusabourin2/outly` (Matthieu, propriétaire du dépôt, doit autoriser l'application Cloudflare sur ce dépôt).
2. Nom du projet : `outly-customer` (puis `outly-staff`). Branche de production : `main`.
3. Réglages de build :

| Champ | Site client | Site équipe |
|---|---|---|
| Framework preset | `None` | `None` |
| Root directory | *(vide = racine du dépôt)* | *(vide)* |
| Build command | `npx --yes pnpm@12.9.1 install --frozen-lockfile && npx --yes pnpm@12.9.1 build:customer-web` | `npx --yes pnpm@12.9.1 install --frozen-lockfile && npx --yes pnpm@12.9.1 build:staff-web` |
| Build output directory | `apps/customer/dist` | `apps/partner/dist` |
| Variables | celles du § 3.1 + `NODE_VERSION=24` + `SKIP_DEPENDENCY_INSTALL=1` | idem (seulement URL + clé publishable) |

   `SKIP_DEPENDENCY_INSTALL=1` empêche Cloudflare d'installer les dépendances avec sa propre version de pnpm : la commande de build installe avec la version du projet (12.9.1).
4. **Save and Deploy**. ✅ VÉRIFIER : le journal de build se termine par `Exported: dist` puis le déploiement ; il doit afficher « Parsed 4 valid header rules » et **aucune** règle de redirection invalide.
5. *Custom domains* → `<domaine>` pour le client, `staff.<domaine>` pour l'équipe (§ 4).
6. *Settings → Builds* : désactiver les **previews** des branches si on ne veut pas d'adresses publiques pour chaque branche (sinon elles pointent sur la **même base de production**).

> Non testé sur un vrai compte Cloudflare (aucun compte cette nuit) ; testé avec l'émulateur officiel `wrangler pages dev` sur les sites compilés : en-têtes présents, retour SPA, manifest et icônes OK. Si la compilation échoue sur Cloudflare, lancer `pnpm build:customer-web` en local pour voir l'erreur.

### 3.3 Option B — Vercel — 👤 HUMAIN, tableau de bord (jamais la CLI)

À faire **deux fois** (client, équipe). Ce sont **deux nouveaux projets**, distincts de celui de l'admin.

1. vercel.com → **Add New… → Project** → importer `Matthieusabourin2/outly`.
2. **Root Directory** : `apps/customer` (puis `apps/partner`). Vercel lit alors `apps/<site>/vercel.json` : commande de build `pnpm run build:web`, dossier de sortie `dist`, réécriture SPA, en-têtes. Ne pas remplacer ces valeurs dans l'interface.
3. Framework Preset : **Other**. Node.js Version (*Settings → Build and Deployment*) : **24.x**.
4. Variables (*Settings → Environment Variables*) : celles du § 3.1, pour l'environnement **Production** (et Preview si on garde les previews) + `ENABLE_EXPERIMENTAL_COREPACK=1` (Vercel utilise alors pnpm 12.9.1, la version déclarée dans `package.json`).
5. **Deploy**. ✅ VÉRIFIER : le journal se termine par `Exported: dist`.
6. *Settings → Domains* → `<domaine>` ou `staff.<domaine>` (§ 4).
7. *Settings → Deployment Protection* : protéger les previews (`docs/SECURITY.md` § 4).

> Non testé sur Vercel (règle : pas de CLI, pas de compte cette nuit). Les réglages viennent de `vercel.json`, vérifié comme JSON valide.

---

## 4. Domaine et DNS — 👤 HUMAIN

1. Si l'hébergement est Cloudflare : ajouter le domaine à Cloudflare (*Add a site*, offre gratuite) et remplacer les **serveurs de noms** chez le registrar par ceux que Cloudflare indique (quelques minutes à 24 h).
2. Enregistrements :

| Nom | Vers | Créé par |
|---|---|---|
| `<domaine>` (racine) | site client | Cloudflare Pages (*Custom domains*) ou Vercel (enregistrement `A` donné par Vercel) |
| `www` | redirection vers `<domaine>` | règle de redirection Cloudflare, ou domaine `www` ajouté au projet Vercel |
| `staff` | site équipe | Cloudflare Pages ou Vercel (`CNAME` donné par l'hébergeur) |
| `admin` | admin | Vercel, projet existant (`CNAME cname.vercel-dns.com` ou la valeur affichée par Vercel) |
| SPF / DKIM / `_dmarc` | Resend | § 2.5 |

3. Attendre le certificat HTTPS (automatique). **La caméra du site équipe ne marche qu'en HTTPS.**
4. ⚠️ `Strict-Transport-Security … includeSubDomains` : une fois le site client servi sur la racine du domaine, les navigateurs exigeront HTTPS sur **tous** les sous-domaines pendant un an. C'est voulu (tout est en HTTPS) ; ne jamais créer de sous-domaine en HTTP simple.
5. **Une fois les adresses définitives connues, les reporter partout :**
   - Supabase → Site URL et Redirect URLs (§ 2.4) ;
   - secret `ALLOWED_ORIGINS` (§ 2.3), puis, par prudence, redéployer la fonction (`pnpm exec supabase functions deploy delete-account`) ;
   - Google → Authorized JavaScript origins (§ 2.6) ;
   - Turnstile → domaines autorisés du widget (`docs/SECURITY.md` § 5) ;
   - Resend → domaine vérifié (§ 2.5).

---

## 5. Contenu de Rouge et comptes du personnel

Deux scripts (SPEC A9 : le contenu de la soirée et les comptes des vigiles sont créés par script, pas par formulaire). **Les deux sont en simulation par défaut** : ils affichent ce qu'ils feraient et ne changent rien tant qu'on n'ajoute pas `--apply`.

| Sécurité | Comportement |
|---|---|
| `--target local\|prod` | **Obligatoire.** Sans cible, le script refuse |
| Cible `local` | Lit l'adresse et la clé dans `supabase status` (comme `pnpm db:seed-users`) et **refuse** toute base qui n'est pas sur cet ordinateur |
| Cible `prod` | Exige **`--apply` ET `--confirm-prod`**, lit `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` **uniquement** dans le terminal (jamais dans un fichier), refuse une adresse non `https://` ou locale, refuse un contenu qui contient encore `PLACEHOLDER` et des comptes en `@example.com` (modèle CSV) |
| Relance | Les deux scripts peuvent être relancés : ce qui est déjà en place est marqué `=` (« unchanged ») |

### 5.1 Préparer les fichiers — 👤 HUMAIN

1. Copier `content/rouge.example.json` en **`content/rouge.local.json`** et remplacer chaque `PLACEHOLDER`. Les fichiers `content/*.local.json` et `content/*.local.csv` ne partent **jamais** sur GitHub (ignorés par git).

| Champ | Exemple | Note |
|---|---|---|
| `venue.name` | `Rouge` | Le lieu est retrouvé par son nom (ou ajouter `"id": "<uuid>"` pour le désigner exactement) |
| `venue.address`, `venue.description`, `venue.categories` | | Affichés sur la page de la soirée |
| `event.title`, `event.description`, `event.tags` | | |
| `event.night` | `2026-10-24` | La date **du soir** |
| `event.start` / `event.end` | `21:00` / `03:00` | Heure de **Sydney**. De `00:00` à `11:59` = le **lendemain matin** (03:00 → dim. 25 oct.) |
| `guestList.capacity` | `200` | Places sur la liste Outly |
| `guestList.closesAt` | `null` | `null` = ouverte jusqu'à la fin de la soirée (SPEC A4) |
| `guestList.perk` | `Fast lane` | L'avantage Outly (enregistré comme note de la guest list) |
| `lineup` | `[]` | Liste vide, ou des sets : `{ "artist": "DJ …", "stage": "Roof", "start": "22:00", "end": "00:00" }` (`stage`, `start`, `end` facultatifs). La line-up est **remplacée en entier** à chaque lancement |

2. Pour le personnel : copier `content/rouge-staff.example.csv` en **`content/rouge-staff.local.csv`**, une personne par ligne : `email,role,date_of_birth`.

| `role` | Ce que la personne voit sur le site équipe |
|---|---|
| `venue_door` | Vigile : scan « file rapide » + compteur |
| `venue_staff` | Barman : scan bar (si la réduction boissons est activée) + compteur |
| `venue_manager` | Manager : statistiques en direct + scan |

   `date_of_birth` (format `1990-05-17`) est **facultative** : la base exige une date de naissance (18 ans minimum) ; sans elle, le script enregistre la date fictive **`1990-01-01`** et l'affiche dans son plan. Le pseudo public du compte ne contient jamais de nom réel (ex. `rouge_door_3fa9c1`).

### 5.2 Répéter en local — 💻 TERMINAL

La base locale doit tourner (`pnpm db:start`).

```
pnpm rouge:setup --target local --content content/rouge.local.json             # plan, rien n'est écrit
pnpm rouge:setup --target local --content content/rouge.local.json --apply     # écrit en local
pnpm rouge:staff --target local --content content/rouge.local.json --csv content/rouge-staff.local.csv
pnpm rouge:staff --target local --content content/rouge.local.json --csv content/rouge-staff.local.csv --apply
```

- En local, chaque **nouveau** compte reçoit un mot de passe aléatoire de 20 caractères (lettres et chiffres), **affiché une seule fois** à la fin, et stocké nulle part.
- ✅ VÉRIFIER : ouvrir le site client local (`pnpm dev:customer`) → la soirée apparaît avec l'adresse, l'heure et la line-up ; se connecter sur le site équipe local avec un compte créé → l'onglet correspondant au rôle apparaît.

### 5.3 En production — 💻 TERMINAL, lancé par Gabriel (👤 décision)

Seulement quand le projet Supabase hébergé est prêt (§ 2) et que le plan local est bon.

```
export SUPABASE_URL=https://<ref>.supabase.co
read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY   # coller la clé service, rien ne s'affiche
pnpm rouge:setup --target prod --content content/rouge.local.json --apply --confirm-prod
pnpm rouge:staff --target prod --content content/rouge.local.json --csv content/rouge-staff.local.csv \
  --invite-redirect https://<domaine>/reset-password --apply --confirm-prod
unset SUPABASE_SERVICE_ROLE_KEY                                          # fermer aussi le terminal
```

- La clé service se trouve dans Supabase → *Project Settings → API Keys* (clé **secret**). Elle ne doit **jamais** être collée dans un fichier, un message ou une variable `EXPO_PUBLIC_*`.
- En production, le script crée chaque compte **déjà confirmé**, avec un mot de passe aléatoire jeté aussitôt, puis envoie un email **« choisir son mot de passe »** (modèle « Reset Password », § 2.4). Le lien ouvre `https://<domaine>/reset-password` (le site client) où la personne choisit son mot de passe ; ensuite elle se connecte sur `https://staff.<domaine>`. L'adresse `https://<domaine>/**` doit être dans les Redirect URLs (§ 2.4).
- **Pourquoi pas une « invitation » Supabase** : un compte invité reste non confirmé jusqu'au clic, et comme la confirmation d'email est désactivée (SPEC A6), n'importe qui s'inscrivant avec l'adresse du vigile pendant ce temps recevait une session **sur le compte du vigile** (audit sécurité du 14 oct., prouvé en local). Un compte confirmé répond « déjà inscrit ».
- **Adresse qui a déjà un compte Outly** sans rôle au lieu : le script **refuse** (quelqu'un a pu créer ce compte exprès pour récupérer le rôle). Vérifier **en personne** avec le vigile que c'est bien son compte, puis relancer avec `--allow-existing <email>` : son mot de passe est remplacé et il reçoit l'email pour en choisir un nouveau. Les comptes qui ont **déjà** un rôle à ce lieu (relance du script) ne changent que de rôle.
- Si l'email « choisir son mot de passe » n'arrive pas : Supabase → *Authentication → Users* → le compte → **Send password recovery**.
- Les personnes qui ont un rôle au lieu mais ne sont **pas** dans le CSV sont listées, jamais supprimées.
- **Après la soirée** : désactiver les comptes du personnel (`docs/SECURITY.md` § 5 « Le soir de Rouge ») — Supabase → *Authentication → Users* → le compte → **Ban user**. **Ne pas supprimer** les comptes : le bannissement suffit et garde l'historique propre (depuis 0006, supprimer un compte ne supprime plus ses scans, mais rien ne sert de le faire).

---

## 6. Test après mise en ligne (smoke test)

À faire après chaque mise en production importante, et **obligatoirement** avant d'ouvrir les inscriptions (19–20 oct.) et pendant la répétition chez Rouge (21–23 oct.). Utiliser des **comptes de test** (pas ceux des invités), à supprimer ensuite.

| # | Test | Résultat attendu |
|---|---|---|
| 1 | 💻 `curl -sI https://<domaine>/pass` et `curl -sI https://staff.<domaine>/` | `200`, et les en-têtes du § 3.1 (dont `permissions-policy: camera=()` côté client, `camera=(self)` côté équipe) |
| 2 | Ouvrir directement `https://<domaine>/sign-in`, puis recharger la page | La page s'affiche (pas de 404) |
| 3 | Chrome (ordinateur) → outils de développement → *Application → Manifest* | « Outly » / « Outly Staff », icônes affichées, aucune erreur |
| 4 | **Inscription** email + mot de passe sur le site client (avec le CAPTCHA s'il est activé) | Compte créé ; un mot de passe sans chiffre est refusé |
| 5 | **Code par email** (« Email me a code ») | Email « Your Outly code » reçu en moins d'une minute, **pas dans les spams**, code à 6 chiffres accepté ; un 2ᵉ code dans la minute est refusé |
| 6 | **Google** (si activé) | Retour sur le site, connecté |
| 7 | Profil : date de naissance de moins de 18 ans | Refusé |
| 8 | Page de la soirée | Rouge, date, heure (heure de Sydney), avantage, compteur « x / 200 », line-up |
| 9 | Rejoindre la liste (choix fantôme / classique) → onglet Pass | QR affiché, le compteur augmente |
| 10 | Site équipe : connexion avec un compte **vigile** | Onglet Scan |
| 11 | 📱 **Vrai téléphone, en HTTPS** : sur l'iPhone (Safari) **et** un Android (Chrome) du personnel, ouvrir `https://staff.<domaine>`, se connecter, **autoriser la caméra**, scanner le pass affiché sur un **autre** téléphone | Caméra qui s'ouvre, « Fast lane OK — Now check their ticket. » (sur iPhone, aucune erreur `jsdelivr` / CSP dans la console : voir § 3.1, ligne CSP) |
| 12 | Rescanner le même pass | « Pass already used » (rouge) |
| 13 | Ajouter le site équipe à l'écran d'accueil (Safari → Partager → « Sur l'écran d'accueil ») puis rouvrir et scanner | Icône « Outly Staff », la caméra marche aussi depuis l'icône |
| 14 | Compte **manager** | Statistiques en direct qui bougent après le scan |
| 15 | Mode avion sur le téléphone du vigile, puis scanner | « No connection — Use the normal line » |
| 16 | Admin (`https://admin.<domaine>`) avec un compte `outly_staff` | Tableau de bord en lecture |
| 17 | **Supprimer le compte** de test depuis Profil (site client) | Compte supprimé (il n'apparaît plus dans *Authentication → Users*) |
| 18 | Réglages du soir (§ 2.7) | Limites relevées, CAPTCHA actif, **connexion vigile toujours possible** |

---

## 7. Revenir en arrière (rollback)

| Problème | Que faire |
|---|---|
| Un nouveau déploiement d'un site casse quelque chose | **Cloudflare Pages** : projet → *Deployments* → le dernier déploiement qui marchait → **Rollback to this deployment**. **Vercel** : projet → *Deployments* → le précédent → **Promote to Production** (Instant Rollback). Effet immédiat, sans recompiler |
| Une mauvaise valeur `EXPO_PUBLIC_*` | Corriger la variable, puis **relancer un déploiement** (la valeur est figée dans le site, § 3.1) — ou revenir au déploiement précédent |
| La fonction `delete-account` casse | 💻 `git checkout <commit qui marchait> -- supabase/functions/delete-account` puis `pnpm exec supabase functions deploy delete-account`, puis remettre le dossier à jour (`git checkout HEAD -- supabase/functions/delete-account`) |
| Une migration pose problème | Pas de retour automatique. Corriger par une **nouvelle** migration (`0004_…`), relue et testée (`pnpm db:test`). En cas de perte de données : sauvegardes Supabase (*Database → Backups*, offre Pro), restauration à décider par Gabriel |
| Un réglage Auth trop strict le soir même | Le remettre à la valeur du tableau § 2.4 / § 2.7 (noter la valeur avant tout changement) |
| Mauvais contenu de soirée | Corriger `content/rouge.local.json` et relancer `pnpm rouge:setup` (simulation, puis `--apply --confirm-prod`) |
| Le site ne répond plus pendant la soirée | **Plan B à la porte** : file normale avec le billet (SPEC A4). Puis rollback ci-dessus |
| Clé exposée, compte piraté | `docs/SECURITY.md` § 7 « En cas d'incident » |

---

## 8. Commandes de référence

| Commande | Rôle |
|---|---|
| `pnpm build:customer-web` | Compile le site client dans `apps/customer/dist` (vide le cache : `--clear`) |
| `pnpm build:staff-web` | Compile le site équipe dans `apps/partner/dist` |
| `pnpm check:secrets <dossiers dist>` | Vérifie qu'aucun secret n'est dans les sites compilés |
| `pnpm rouge:setup --target local\|prod --content <json> [--apply] [--confirm-prod]` | Lieu, soirée, guest list, line-up (§ 5) |
| `pnpm rouge:staff --target local\|prod --content <json> --csv <csv> [--apply] [--confirm-prod] [--invite-redirect <url>] [--allow-existing <emails>]` | Comptes du personnel (§ 5). En local, `--invite` teste l'email « choisir son mot de passe » (il arrive dans Mailpit, http://127.0.0.1:54324) |
| `pnpm exec supabase db push` | Applique les migrations au projet lié (§ 2.2) |
| `pnpm exec supabase functions deploy delete-account` | Déploie la fonction serveur (§ 2.3) |
| `pnpm exec supabase secrets set ALLOWED_ORIGINS=…` | Secret de la fonction (§ 2.3) |
