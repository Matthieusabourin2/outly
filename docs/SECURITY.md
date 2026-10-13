# Sécurité d'Outly

> Pour toute l'équipe (CEO compris) et pour les développeurs. Mis à jour le 13 octobre 2026.
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
| **Sécurité par ligne (RLS) sur toutes les tables** | Chaque requête est filtrée par la base selon l'utilisateur, quoi que fasse le site | 47 tests (`pnpm db:test`), CI |
| **Fonctions internes hors de l'API** | 20 fonctions déplacées dans le schéma `private` : impossible de demander « A et B sont-ils amis / bloqués ? » | Migration 0003 (H1), sondes API |
| **Pseudos seulement** | La liste publique des profils ne montre que `id`, pseudo, avatar ; la liste des participants seulement les pseudos des personnes en mode classique | 0003 (H3), tests R3/H3 |
| **Mode fantôme par défaut, réciproque** | Invisible = ne voit personne | Tests R2/R3 |
| **Bloquer / signaler partout** | Un blocage cache dans les deux sens ; les signalements vont à l'équipe Outly | Tests R6, T6 |
| **18 ans minimum** | Contrôle dans le formulaire **et** déclencheur dans la base | Tests T1, profil |
| **Pass QR à usage unique** | Code aléatoire non devinable, renouvelé au scan ; une capture d'écran ne passe qu'une fois ; le vigile vérifie aussi le billet | Tests R8, T5 |
| **Personnel limité au strict nécessaire** | Vigiles et barmans ne lisent ni les réservations ni les codes des pass : ils passent par `scan_pass` / `redeem_offer` | 0003 (H4), test H4 |
| **Journal de tous les scans** | Chaque scan, réussi ou refusé, est enregistré (qui, quand, résultat) | `scan_events`, tests R8/R9 |
| **Colonnes commerciales masquées** | Commission et compte Stripe illisibles par l'API ; seuls managers et équipe Outly les lisent via une fonction | 0003 (H5), tests H5 |
| **Connexion durcie** | Mots de passe 8+ caractères avec lettres et chiffres ; codes email valables 10 min ; 1 email d'authentification par minute et par personne ; changement de mot de passe après reconnexion récente | `supabase/config.toml`, vérifié sur la base locale |
| **Suppression de compte** | Par la personne elle-même, depuis son profil ; fonction serveur qui n'accepte que les sites Outly (`ALLOWED_ORIGINS`) et une session valide | `supabase/functions/delete-account` |
| **Aucun secret dans le code ni dans l'historique** | Fichiers `.env*` ignorés ; analyse gitleaks de tout l'historique à chaque PR | CI « secrets » |
| **Aucun secret dans les sites compilés** | Les deux sites sont compilés en CI puis analysés (clés secrètes, jetons « service_role », variables publiques au nom suspect) | CI « websites », `pnpm check:secrets` |
| **Failles des dépendances surveillées** | La CI échoue sur toute faille haute/critique non justifiée | CI « dependencies », § 6 |
| **HTTPS obligatoire pour le scan** | La caméra du navigateur ne marche qu'en HTTPS | Hébergement |

## 4. Risques restants et décisions à prendre

| Risque | Gravité | Ce qu'on propose | Qui décide |
|---|---|---|---|
| **Un robot remplit les 200 places de la guest list** | **Haute** pour Rouge | CAPTCHA invisible **Cloudflare Turnstile** à l'inscription (gratuit, géré par Supabase). Le réglage est prêt dans `config.toml` ; il faut un compte Cloudflare | CEO |
| **Limite d'inscriptions par adresse IP** : 30 / 5 min. Au club, des centaines d'invités partagent **une seule IP** (Wi-Fi du club, 4G) → les vrais invités seraient bloqués | **Haute** le soir même | Relever `sign_in_sign_ups` en production pour la soirée (ex. 300 / 5 min) **et** activer le CAPTCHA | Équipe tech |
| Téléphone de vigile perdu ou volé | Moyenne | Un compte par personne, mot de passe fort, comptes désactivés après la soirée ; le vigile ne peut que scanner | Équipe tech + managers |
| Harcèlement via la liste des participants | Moyenne | Mode fantôme par défaut, pseudos seulement, bloquer / signaler, suspension par l'équipe Outly ; quelqu'un de l'équipe doit **surveiller les signalements le soir même** | CEO |
| URL de preview Vercel de l'admin publique | Faible tant que l'admin n'affiche rien sans connexion | Activer la *Deployment Protection* de Vercel sur les previews ; l'admin doit vérifier `outly_staff` côté serveur | Matthieu |
| Failles connues dans des outils de développement (§ 6) | Faible | Acceptées et suivies ; à retirer dès qu'un correctif sort | Équipe tech |
| Pas encore de politique de sécurité du navigateur (CSP) | Faible à moyenne | En préparation (testée avec le scanner pour ne pas le casser) | Équipe tech |

## 5. Liste de contrôle avant la mise en ligne

**Comptes (le plus important — la plupart des piratages passent par là)**
- [ ] **Double authentification (2FA)** activée sur : GitHub (Gabriel, Matthieu, Tondal775), Vercel, Supabase, Cloudflare, Google Cloud, Resend, registrar du domaine, et les emails de l'équipe.
- [ ] Un **gestionnaire de mots de passe** pour l'équipe. Jamais de mot de passe ni de clé par message ou par email.
- [ ] Le moins d'administrateurs possible sur chaque service ; retirer les accès inutiles.

**Supabase (production)**
- [ ] Région **Sydney**, offre **Pro** (sauvegardes quotidiennes ; envisager la restauration à la minute près).
- [ ] Réglages Auth identiques à `supabase/config.toml` : inscriptions anonymes **désactivées**, mots de passe `letters_digits`, codes 10 min, 1 email / minute, changement de mot de passe sécurisé, modèles d'email « code à 6 chiffres ».
- [ ] **CAPTCHA Turnstile** activé (clé secrète dans Supabase, clé de site dans le site client).
- [ ] Limites de débit adaptées au soir de Rouge (§ 4).
- [ ] *Leaked password protection* activée si disponible.
- [ ] SMTP Resend sur le domaine, avec **SPF, DKIM et DMARC** (sinon les codes finissent en spam, et le domaine peut être usurpé).
- [ ] Secrets des fonctions : `ALLOWED_ORIGINS` = les adresses exactes des sites. La clé service n'existe **nulle part ailleurs** que dans Supabase.
- [ ] Ne **jamais** lancer `seed_demo.sql` ni `pnpm db:seed-users` en production.

**Hébergement et code**
- [ ] HTTPS partout ; domaine définitif ; en-têtes de sécurité des sites actifs.
- [ ] GitHub : **alertes Dependabot** activées (Matthieu, propriétaire du dépôt) ; garder la CI verte avant toute fusion.
- [ ] Vercel : *Deployment Protection* sur les previews.

**Le soir de Rouge**
- [ ] Comptes du personnel : un par personne, créés par le script, mot de passe fort transmis en main propre ; **désactivés le lendemain**.
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
