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
