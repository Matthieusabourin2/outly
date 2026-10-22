# Plan en cours — lancement Rouge (24 oct) et applis (8 nov)

> Document de travail de l'équipe tech. Mis à jour à chaque décision. Les décisions officielles sont dans `docs/SPEC.md` → section **Amendments** (A1 à A9) ; en cas de doute, la spec fait foi.
> Dernière mise à jour : 9 octobre 2026.

## Les dates

| Date | Livrable |
|---|---|
| **Sam. 24 oct 2026** | Soirée **Rouge** (rooftop, Sydney, ~200 personnes, complet) — **3 sites web**, gratuits |
| Sam. 31 oct 2026 | Grand événement (~20 000 personnes) — **pas confirmé**, décidé après Rouge |
| **Dim. 8 nov 2026 (soir)** | Applis **App Store + Play Store** avec **abonnement payant** |

## Ce qu'on construit pour Rouge (branche `slice/1-rouge`)

**Le principe :** Outly donne l'accès à la **file rapide**. L'invité rejoint la guest list Outly → reçoit un QR → le vigile scanne le QR **et vérifie le billet**.

### 1. Base de données — migration `0002_rouge_launch.sql`
- `bookings.attendee_visibility` : `ghost` (défaut) | `classic`
- Table `event_sets` : line-up (artiste, début, fin)
- Table `offer_redemptions` : réduction boissons (fonction **éteinte** par défaut)
- RPC : `join_guest_list` (mode + refus des comptes suspendus), `guest_list_stats`, `event_attendees` (pseudos, seulement pour les « classic », sans bloqués/suspendus), `scan_pass` (vigile → vert / déjà utilisé / invalide + pseudo), `redeem_offer` (barman), `venue_live_stats` (managers + admin)
- Suppression de la connexion anonyme de la slice 0
- Tests RLS pour tout ce qui est nouveau

### 2. Site client — `apps/customer` (Expo web)
Onglets **Night · Pass · Profile**. Inscription email/mot de passe (ou code) + Google, profil (pseudo, prénom, date de naissance 18+), page de la soirée (Rouge, avantage, compteur « 87/200 », line-up, bouton Rejoindre, liste des participants), choix 👻/👋, pass QR, profil (mode, déconnexion, **suppression du compte**), pages `/privacy` et `/terms`.

### 3. Site équipe — `apps/partner` (Expo web)
Comptes créés par script. Rôles :
- **Vigile** (`venue_door`) : Scan plein écran (✅ « File rapide OK — vérifie le billet » / 🔴 déjà utilisé / invalide) + compteur
- **Barman** (`venue_staff`) : Scan bar (si réduction activée) + compteur
- **Manager** (`venue_owner` / `venue_manager`) : stats en direct + scan
- Bandeau « Pas de réseau — utilise la file normale » si hors ligne

### 4. Admin — `apps/admin` (Next.js)
Tableau de bord **en lecture** : inscrits, venus, % classic, scans ratés, en direct. Signalements + suspension de compte. Accès réservé à `outly_staff`.

### 5. Mise en ligne
Supabase Pro (région Sydney) · Cloudflare Pages (`domaine`, `staff.domaine`, `admin.domaine`) · Resend (emails) · Google Cloud (bouton Google) · fonction serveur de suppression de compte.

## Avancement (branche `slice/1-rouge`, PR #4)

| Chantier | État |
|---|---|
| Base de données (migration 0002) | ✅ fait |
| Audit sécurité de la base (migration 0003 : fonctions internes cachées, prénoms masqués, codes des pass invisibles pour les vigiles, commissions masquées) — 47 tests | ✅ fait (13 oct.) |
| Comptes de démo locaux (`pnpm db:seed-users`) | ✅ fait |
| Site client : inscription, code par email, profil 18+, soirée, guest list, fantôme/classique, signaler/bloquer, pass QR, suppression de compte, pages légales | ✅ fait, testé dans Chrome |
| Site équipe : connexion, onglets par rôle, scan porte, scan bar, compteurs | ✅ fait, testé dans Chrome avec une fausse caméra |
| Nuit du 13 → 14 oct. (branche `slice/1-rouge-night`, PR #5) : sécurité transverse (CSP prouvée dans Chrome, CAPTCHA Turnstile sur les deux sites, migrations 0004/0005 : 6 failles fermées, contrôle des secrets dans les builds, gitleaks + audit des dépendances en CI), sites durcis (scanner réécrit, hors ligne, erreurs, accessibilité, lecteur QR auto-hébergé), config d'hébergement + `docs/DEPLOY.md` + scripts Rouge, tests de bout en bout `pnpm e2e` (8 scénarios) | ✅ fait, tout vert — à relire (voir `state/night-2026-10-13/MORNING.md`) |
| Tableau de bord admin | ⏳ Tondal775 (fonctions prêtes : `venue_live_stats`, `venue_activity`, `recent_scans`) |
| Mise en ligne (domaine, Supabase Pro, Cloudflare, Resend, Google) | ⛔ en attente des achats des CEO |
| Test du scan sur de vrais téléphones | ⛔ demande la mise en ligne (la caméra exige HTTPS) |
| Contenu de Rouge (line-up, comptes des vigiles) | ⛔ en attente des infos |

## Planning

| Dates | Travail |
|---|---|
| 9 – 11 oct | Migration + tests · version web · **test du scan navigateur sur vrais téléphones** |
| 12 – 14 | Site client : inscription, profil, soirée, rejoindre, pass |
| 13 – 15 | Site équipe : connexion, scan, compteurs · **mise en ligne** |
| 16 – 18 | Participants, fantôme/classique, signaler/bloquer, pages légales, suppression de compte |
| 19 – 20 | Line-up, réduction boissons (éteinte), finitions · **ouverture des inscriptions** |
| 21 – 23 | Répétition chez Rouge avec les vigiles |

## L'équipe tech

**Gabriel** (`gabrielsabourin1-netizen`, Sydney, Mac) et **Tondal775** (France, Windows) sont **co-responsables techniques, à égalité** : même niveau de responsabilité sur le code, les choix techniques et la qualité. Chacun relit et peut refuser les PR de l'autre. Les décisions techniques importantes se prennent à deux ; les décisions produit et budget reviennent aux CEO.

**Répartition des chantiers pour Rouge** (une répartition du travail, pas une hiérarchie) :

| Chantier | Porté par |
|---|---|
| Base de données, connexion, QR, scan (testé sur place à Sydney), mise en ligne, contenu de la soirée, tests sur téléphones | Gabriel (sur place) |
| Tableau de bord admin (`apps/admin`) ; renfort sur le site client à partir du 19 oct | Tondal775 |
| Relecture des PR | Les deux, chacun celles de l'autre |

**Accès aux données de production :** décision de Gabriel du 23 oct. : **Théo (Tondal775) a accès à tout** (GitHub, Supabase, Cloudflare, Vercel), **avec ses propres comptes** et la double authentification, sur invitation (jamais les identifiants de quelqu'un d'autre). Les changements en production sont annoncés à l'autre avant d'être faits.

**Décalage horaire :** Sydney a ~9 h d'avance sur la France. On travaille par PR, en asynchrone.

## En attente des CEO

1. Société / ABN / D-U-N-S ? (bloque Apple, Google, Stripe)
2. Achat du domaine (`outlysydney.com` ou `weareoutly.com`) + Supabase Pro — avant le 15 oct
3. Essai gratuit : « 1 heure » ou « première soirée offerte, carte demandée » ?
4. Qui paie les avantages des abonnés, et quels plafonds ?
5. Réduction boissons chez Rouge : l'offre exacte + accord du club
6. Les formules d'abonnement (nombre, prix, avantages)

## Indicateurs de succès (Rouge, sur 200 personnes)

| Indicateur | Échec | Succès |
|---|---|---|
| Inscrits guest list Outly | < 40 | > 100 |
| Taux de venue (scannés / inscrits) | < 50 % | > 75 % |
| Mode classic choisi | < 20 % | > 40 % |
| Scans ratés à la porte | le vigile abandonne | < 2 % |
| **Retour dans l'appli à J+7** (le plus important) | < 10 % | > 25 % |
