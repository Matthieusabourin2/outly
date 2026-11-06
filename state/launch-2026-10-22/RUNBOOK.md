# Mise en ligne du 22 oct. — fiche pas à pas

Pour Gabriel. 👤 = toi (navigateur), 💻 = Claude lance la commande. Le détail complet est dans `docs/DEPLOY.md` ; cette fiche est le chemin court pour Rouge.

**Choix** : Cloudflare (domaine + sites + CAPTCHA), Supabase gratuit (Sydney), sites publiés depuis le Mac avec `wrangler`. Connexion email + mot de passe, Google masqué, confirmation d'email **désactivée** (c'est un test). Offre boissons éteinte.

## A. Domaine — 👤 (10 min)
1. https://dash.cloudflare.com → créer un compte (activer la **double authentification**).
2. *Domain Registration → Register Domains* → acheter le domaine (ex. `outlysydney.com`).
3. Me donner le nom du domaine.

## B. Base de données — 👤 (5 min)
1. https://supabase.com/dashboard → compte (double authentification), *New project*.
2. Nom `outly`, région **Sydney (ap-southeast-2)**, offre **Free**. Mot de passe de la base : généré, gardé dans ton gestionnaire de mots de passe (je n'en ai pas besoin).
3. Me donner l'**identifiant du projet** (*Project Settings → General → Project ID*, 20 lettres/chiffres). Ce n'est pas un secret.

## C. Connexions du terminal — 👤 (2 min)
Dans le terminal de VS Code :
```
supabase login
npx wrangler@4.42.0 login
```
Chaque commande ouvre le navigateur → « Autoriser ». Aucune clé à copier : je lis ensuite ce qu'il faut via ces connexions, sans jamais afficher la clé secrète.

## D. Infos de Rouge — 👤
Adresse exacte · heure de début / fin · titre + 1 phrase · line-up (noms + horaires) · personnel : **email + rôle** (porte / bar / manager) · email de contact « vie privée ».

## E. Base en production — 💻 (après B + C)
```
supabase link --project-ref <ref>
supabase db push --dry-run      # doit lister 0001 → 0006, rien d'autre
supabase db push                # JAMAIS --include-seed (pas de données de démo en prod)
supabase functions deploy delete-account
supabase secrets set ALLOWED_ORIGINS=https://<domaine>
node scripts/prod-env.mjs <ref> -- pnpm rouge:setup --target prod --content content/rouge.local.json --apply --confirm-prod
node scripts/prod-env.mjs <ref> -- pnpm rouge:staff --target prod --content content/rouge.local.json --csv content/rouge-staff.local.csv --print-passwords --apply --confirm-prod
```
Sans service d'envoi d'emails (Resend), les mots de passe du personnel s'affichent **une seule fois** : à remettre **en main propre**, jamais par message.

## F. Réglages Auth — 👤 (10 min, Supabase → *Authentication*)
| Où | Réglage |
|---|---|
| *Sign In / Providers → Email* | Email **activé** · *Confirm email* **désactivé** · *Secure password change* **activé** · mot de passe min. **8**, exigences **lettres et chiffres** · *Email OTP expiration* **600** s |
| *Sign In / Providers* | *Allow new users to sign up* **activé** · *Anonymous sign-ins* **désactivé** · Google **désactivé** |
| *URL Configuration* | *Site URL* = `https://<domaine>` · *Redirect URLs* = `https://<domaine>/**` et `https://staff.<domaine>/**` — **rien d'autre** (pas de `localhost`, pas de `exp://`) |
| *Rate Limits* | Inscriptions/connexions : **300** par 5 min · Vérifications de code : **300** par 5 min (au club, tout le monde partage la même IP) |
| *Attack Protection* (ou *Bot and Abuse Protection*) | **Captcha** : Turnstile + clé **secrète** (étape G) — **à activer seulement quand je te le dis**, après le test en production |
| *Database → Extensions* | `pg_graphql` : **désactiver** (inutilisé) |

## G. CAPTCHA Turnstile — 👤 (5 min)
Cloudflare → *Turnstile → Add widget* · nom `outly` · domaines : `<domaine>` et `staff.<domaine>` · mode *Managed*.
- La **clé de site** (`0x4AAA…`, publique) → me la donner.
- La **clé secrète** → la coller **toi-même** dans Supabase (étape F, ligne Captcha) **quand je te le dis**. Ne me l'envoie pas.

## H. Publier les sites — 💻
```
node scripts/publish-sites.mjs --ref <ref> --turnstile <clé de site> --privacy-email <email>
```
Compile avec les vraies valeurs, vérifie (aucun secret, aucune adresse locale, CSP), publie `outly-customer` et `outly-staff` sur Cloudflare Pages.

## I. Domaines des sites — 👤 (5 min)
Cloudflare → *Workers & Pages* → `outly-customer` → *Custom domains* → `<domaine>` ; `outly-staff` → `staff.<domaine>`. Cloudflare crée les DNS tout seul.

## J. Tests — 💻 puis 👤
1. 💻 Test en production avec un compte de test : inscription → profil → rejoindre la liste → pass → scan sur le site équipe → stats. Comptes de test supprimés après.
2. 👤 **Sur de vrais téléphones** : iPhone **et** Android. Inscription, pass, scan du pass d'un téléphone avec l'autre (site équipe, compte porte). Écran allumé, luminosité.
3. 👤 Activer le CAPTCHA (F), puis refaire une inscription : elle doit passer.

## K. Ouvrir — 👤
Envoyer le lien `https://<domaine>` aux invités ; lien `https://staff.<domaine>` + mot de passe en main propre au personnel.
