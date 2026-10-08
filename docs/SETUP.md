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
| **VS Code** + Claude Code | [code.visualstudio.com](https://code.visualstudio.com) | idem | L'éditeur |

Pas besoin d'installer la CLI Supabase : elle est fournie par le projet (`pnpm install` s'en occupe).

> **Windows :** utilise le terminal intégré de VS Code (PowerShell). Si `pnpm` n'est pas reconnu après installation, ferme et rouvre VS Code.

## 2. Récupérer le projet

Il faut d'abord avoir été ajouté au dépôt GitHub `gabrielsabourin1-netizen/outly` (demande à Gabriel).

```
git clone https://github.com/gabrielsabourin1-netizen/outly.git
cd outly
pnpm install
```

## 3. Lancer la base de données locale

Docker doit être ouvert. La première fois, le téléchargement prend plusieurs minutes.

```
pnpm db:start        # démarre Supabase en local
pnpm db:reset        # applique les migrations + les données de démo
pnpm env:local       # crée les fichiers .env.local des 3 applis
```

La base locale ne contient **que des données de démo** (bars et deals fictifs). Aucune donnée réelle d'utilisateur.

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
