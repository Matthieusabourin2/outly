# Mise en ligne — état (22 oct. 2026)

| | |
|---|---|
| Version en ligne | branche `launch/2026-10-22`, commit `7691e6b` (publiée depuis le Mac avec `scripts/publish-sites.mjs`) |
| Site client | https://outly-sydney.com (Cloudflare Pages `outly-customer`) |
| Site équipe | https://staff.outly-sydney.com (Cloudflare Pages `outly-staff`, non indexé) |
| Base | Supabase `jxcjcmlvbgytsilbfayp` (Sydney, Free), migrations 0001 → 0006 |
| Fonction | `delete-account`, `ALLOWED_ORIGINS=https://outly-sydney.com` |

## Vérifié en production
- Base : 34 tables, toutes en RLS ; schéma `private` non exposé ; GraphQL désactivé ; Realtime sans table ; un visiteur non connecté ne lit rien ; `check_in` fermé ; conseillers Supabase : rien d'actionnable (détail dans le journal).
- Auth : confirmation d'email désactivée (test), inscriptions ouvertes, Google et anonyme désactivés, mot de passe 8+ lettres et chiffres (refus vérifiés).
- Test complet `e2e/prod-smoke.mjs` sur un lieu temporaire (supprimé ensuite) : inscription → profil → liste → pass QR → connexion vigile → scan caméra **Fast lane OK**. Deux fois (avant / après le masquage des liens email).
- Vrais domaines en taille iPhone : chargés en ≈ 0,6 s, CAPTCHA affiché, en-têtes de sécurité et CSP servis, lecteur QR WebAssembly servi par le site.
- `delete-account` : autre site → 403, sans session → 401, depuis outly-sydney.com → 200 et compte supprimé.
- Base laissée vide (0 lieu, 0 compte).

- Aperçu de lien (WhatsApp / iMessage / Instagram) : titre, description, image `og-image.png`.
- Cloudflare Web Analytics désactivé : 0 violation CSP sur nos pages (les seules restantes sont dans le cadre du CAPTCHA, page de Cloudflare).
- CAPTCHA Turnstile : clé secrète changée (rotate), activé dans Supabase. Inscription sans jeton → refusée ; faux jeton → refusé ; connexion sans jeton → refusée.
- ⚠️ Depuis le CAPTCHA, `e2e/prod-smoke.mjs` (clé de test) ne peut plus passer : pour le relancer, désactiver le Captcha dans Supabase le temps du test, puis le réactiver.

## Reste à faire
- 👤 Infos de Rouge → 💻 `rouge:setup`, `rouge:staff --print-passwords`, test sur la vraie soirée.
- 👤 Test sur vrais téléphones (iPhone + Android).
- 👤 (Option) Resend : emails de code, mot de passe oublié, emails du personnel → republier avec `--emails on`.
- 💻 Après Rouge : supprimer la vue `public_profiles` (inutilisée ; signalée par le conseiller Supabase) — migration 0007 + test H3.
- 👤 Après Rouge : changer le mot de passe de la base (passé dans la conversation), bannir les comptes du personnel.
