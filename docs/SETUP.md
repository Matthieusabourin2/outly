# Installer Outly sur son ordinateur

Guide pour tout développeur qui rejoint le projet, sur **Windows** ou **macOS**.
Le code est le même sur les deux systèmes : tout tourne sur Node.js.

## 1. Les outils à installer (une seule fois)

| Outil | Windows | macOS | Pourquoi |
|---|---|---|---|
| **Git** | [git-scm.com](https://git-scm.com/download/win) (options par défaut) | déjà présent, ou `brew install git` | Récupérer et envoyer le code |
| **Node.js 24 LTS** | [nodejs.org](https://nodejs.org) → version **LTS** | `brew install node@24` | Fait tourner tout le projet |
| **pnpm** | dans un terminal : `npm install -g pnpm@12.9.1` | `brew install pnpm` | Installe les dépendances du projet |
| **Docker** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (accepter WSL 2, redémarrer) | [OrbStack](https://orbstack.dev) ou Docker Desktop | Fait tourner la base Supabase en local |
| **Python 3** | [python.org](https://www.python.org/downloads/) → cocher **« Add python.exe to PATH »** | déjà présent | Lance les tests de sécurité de la base |
| **pgserver** | `pip install pgserver` | `python3 -m pip install --user pgserver` | Idem |
| **GitHub CLI** (`gh`) | `winget install --id GitHub.cli -e` puis `gh auth login` | `brew install gh` puis `gh auth login` | Permet à Claude d'ouvrir, relire et fusionner les PR |
| **VS Code** + Claude Code | [code.visualstudio.com](https://code.visualstudio.com) | idem | L'éditeur |

Pas besoin d'installer la CLI Supabase : elle est fournie par le projet (`pnpm install` s'en occupe).

> **Windows :** utilise le terminal intégré de VS Code (PowerShell). Si `pnpm` n'est pas reconnu après installation, ferme et rouvre VS Code.
> Installe aussi `pip install tzdata` : le Postgres de `pgserver` sous Windows est livré sans les fuseaux horaires (`Australia/Sydney`), et `pnpm db:test` les ajoute à partir de ce paquet.

## 2. Récupérer le projet

Il faut d'abord avoir été ajouté au dépôt GitHub `Matthieusabourin2/outly` (demande à Gabriel).

```
git clone https://github.com/Matthieusabourin2/outly.git
cd outly
pnpm install
```

## 3. Lancer la base de données locale

Docker doit être ouvert. La première fois, le téléchargement prend plusieurs minutes.

```
pnpm db:start        # démarre Supabase en local
pnpm db:reset        # applique les migrations + les données de démo
pnpm env:local       # crée les fichiers .env.local des 3 applis
pnpm db:seed-users   # crée les comptes de démo (à relancer après chaque db:reset)
```

**Comptes de démo** (local uniquement, mot de passe `OutlyDemo2026!`) :

| Email | Rôle | Pour tester |
|---|---|---|
| `admin@demo.outly` | équipe Outly (`outly_admin`) | le site admin |
| `manager@demo.outly` | manager du Velvet Tram | les stats « Ce soir » du site équipe |
| `door@demo.outly` | vigile du Velvet Tram | le scan |
| `bar@demo.outly` | barman du Velvet Tram | le scan bar (réduction boissons) |
| `guest@demo.outly` | client | rejoindre la guest list, le pass |

La soirée de démo « Outly Launch Night » (Velvet Tram, ce soir, 200 places) reproduit le parcours de Rouge.

La base locale ne contient **que des données de démo** (bars et deals fictifs). Aucune donnée réelle d'utilisateur.

> **Windows :** avec Docker Desktop, les conteneurs analytics, Studio et pg_meta ne passent jamais « healthy » et font échouer `supabase start`. Sous Windows, `pnpm db:start` les saute donc automatiquement : ce sont des outils d'inspection, les applis n'en ont pas besoin. Conséquence : pas de Studio (http://localhost:54323) sous Windows.

## 4. Lancer les applis

```
pnpm dev:admin       # site admin → http://localhost:3000
pnpm dev:customer    # appli client (Expo) → touche w pour l'ouvrir dans le navigateur
pnpm dev:partner     # appli équipe (Expo) → touche w
```

## 5. Avant chaque PR

```
pnpm typecheck && pnpm lint && pnpm test && pnpm db:test
```

La CI GitHub relance ces vérifications sur chaque PR. Une PR rouge n'est pas fusionnée.

## 6. Tests de bout en bout (`pnpm e2e`)

Rejoue les vrais parcours client et équipe dans **Google Chrome** (installé normalement sur l'ordinateur, sans fenêtre), contre la base Supabase **locale**. À lancer avant une PR qui touche les sites client / équipe ou la base. **Pas dans la CI** (il faut Docker).

```
pnpm db:start        # si la base locale ne tourne pas déjà (Docker ouvert)
pnpm e2e             # ~2 minutes
```

> ⚠️ `pnpm e2e` **remet la base locale à zéro** (`db:reset` + `db:seed-users`) au début de chaque lancement : tout ce que tu as créé à la main en local est effacé. Il refuse de tourner si Supabase n'est pas local.

**Ce que fait la commande** (`e2e/run.mjs`) : vérifie que Supabase local tourne, `pnpm env:local`, `db:reset`, `db:seed-users`, cale la soirée de démo sur l'heure actuelle (voir plus bas), compile les deux sites (`expo export --platform web --clear` → `e2e/.dist/`), les sert sur http://127.0.0.1:8091 (client) et http://127.0.0.1:8092 (équipe), puis lance les scénarios un par un (`node --test`), écran de téléphone 390 × 844.

**Les 7 scénarios** (`e2e/tests/`, chacun avec ses propres comptes neufs, indépendants de l'ordre) :

| # | Parcours | Vérifie |
|---|---|---|
| 1 | Client complet | inscription email + mot de passe → date de naissance < 18 ans refusée → profil adulte → Night (lieu, compteur) → rejoindre en *classic* → Pass : le QR affiché est décodé et vaut `OUTLY1:<booking_id>:<nonce>` de la réservation lue avec la session du client → passage en *ghost* → suppression du compte → reconnexion impossible |
| 2 | Code par email | demande du code, lecture dans Mailpit (API locale), connexion → création du profil |
| 3 | Participants | *classic* voit *classic*, *ghost* ne voit personne ; signalement (ligne dans `reports`) ; blocage qui cache dans les deux sens |
| 4 | Porte (fausse caméra) | « Fast lane OK » + pseudo → même pass : « Pass already used » ; QR quelconque : « Invalid pass » ; le pass du client affiche « You're in! » ; le manager voit les compteurs et les derniers scans avec les pseudos |
| 5 | Rôles + bar | vigile : Tonight + Door ; barman : Tonight + Bar ; manager : les trois ; offre éteinte → « No Outly drinks offer tonight » ; offre allumée → « Offer OK » puis « Offer already used » ; offre remise en brouillon |
| 6 | Soirée finie | soirée de démo déplacée dans le passé → « This night is over », pas de bouton Rejoindre, pass plus affiché ; heures d'origine remises à l'identique |
| 7 | Hors ligne | scanner ouvert sans réseau → « No connection » ; réseau revenu → le même pass passe |

**La fausse caméra** : Chrome est lancé avec `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<pass.mjpeg>` ; l'image (640 × 480, QR centré sur fond blanc) est fabriquée en JavaScript (`e2e/lib/qr.mjs`), donc pareil sous macOS et Windows.

**La soirée de démo calée sur l'heure actuelle** : `seed_demo.sql` date la soirée avec la date du calendrier (21 h → 3 h). Remise à zéro entre minuit et 6 h, le site équipe (qui compte « la nuit » jusqu'à 6 h du matin) ne trouverait aucune guest list ce soir. Le lanceur déplace donc la soirée de démo autour de l'heure actuelle (début il y a 1 h, fin dans 6 h) et met l'autre guest list du Velvet Tram la veille, pour que les tests passent à n'importe quelle heure.

**Résultats** : captures d'écran des étapes clés (et de toutes les pages ouvertes en cas d'échec) + erreurs de console dans `e2e/.artifacts/<date>/` (les 5 derniers lancements sont gardés, dossier ignoré par Git).

**Options** :

```
pnpm e2e door offline          # seulement les scénarios dont le fichier contient « door » ou « offline »
E2E_SKIP_BUILD=1 pnpm e2e      # réutilise la dernière compilation (quand seuls les tests ont changé)
E2E_HEADED=1 pnpm e2e          # montre les fenêtres de Chrome
E2E_CHROME_PATH=/chemin/chrome pnpm e2e   # autre Chrome que celui installé
E2E_RUN_SKIPPED=1 pnpm e2e     # lance aussi les tests mis de côté à cause d'un bug connu de l'appli (pour vérifier une correction)
```

**Test mis de côté (bug connu)** : « the block confirmation stays on screen until "Done" » — après un blocage, la liste se recharge tout de suite et la feuille de confirmation disparaît avec la ligne de la personne bloquée (`apps/customer/src/components/AttendeeRow.tsx`). Le blocage lui-même est bien vérifié par le scénario 3. Retirer le `skip` une fois corrigé.

Si un port est pris (8091 / 8092), arrêter ce qui l'utilise. Si Chrome n'est pas trouvé, installer Google Chrome ou utiliser `E2E_CHROME_PATH`.

## Règles de travail à deux

- **On ne travaille jamais directement sur `main`.** Une branche par sujet (`slice/1-rouge`, `admin/dashboard`…), puis une PR.
- **Toute PR est relue par l'autre** avant d'être fusionnée.
- **Toujours `git pull` avant de commencer** à travailler.
- Les règles du projet sont dans `CLAUDE.md`, les décisions produit dans `docs/SPEC.md`. Claude les lit automatiquement.
- Les fichiers `.env.local` ne sont **jamais** envoyés sur GitHub (ils sont ignorés).
- Arrêter la base locale en fin de journée : `pnpm db:stop`.

## Le cycle de travail, en phrases à dire à Claude

Claude connaît git et GitHub : il suffit de lui dire quoi faire, en français.

**1. Avant de commencer à travailler**
> « Mets-moi à jour avec main. »

(Claude fait `git checkout main` puis `git pull` : tu récupères tout ce que l'autre a fusionné.)

**2. Commencer un nouveau sujet**
> « Crée une branche `admin/dashboard` à partir de main. »

**3. Envoyer son travail sur GitHub**
> « Vérifie que tout passe (typecheck, lint, tests), commit mon travail et pousse ma branche. »

Le code est alors sur GitHub, mais pas encore dans `main`.

**4. Proposer son travail à l'autre**
> « Ouvre une PR vers main avec un résumé clair de ce qui a changé et comment le tester. »

Claude donne le lien de la PR → l'envoyer à l'autre.

**5. Relire le travail de l'autre**
> « Relis la PR #12 : explique-moi ce qu'elle change, et signale les problèmes. »

Puis, si c'est bon : bouton **Merge pull request** sur GitHub (ou « fusionne la PR #12 »).

**6. Récupérer le travail de l'autre pendant qu'on est sur sa propre branche**
> « Récupère les derniers changements de main dans ma branche. »

Si vous avez modifié les mêmes lignes, Claude signale un **conflit** : il montre les deux versions et demande laquelle garder. Ne jamais forcer (`--force`) sans en parler à l'autre.
