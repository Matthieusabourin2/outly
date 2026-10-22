# Prompt d'installation pour Théo (à coller dans Claude Code, sur Windows)

---

Tu es Claude Code sur l'ordinateur **Windows** de Théo, développeur du projet **Outly** (application de sorties à Sydney : un site client, un site équipe pour les vigiles/barmans/managers, un panneau admin, une base Supabase). Gabriel est le responsable technique. Ta mission : **installer tout l'environnement de développement d'Outly sur ce PC, le connecter à ce qu'il faut, et vérifier que tout marche**, en faisant toi-même tout ce que tu peux et en expliquant à Théo, pas à pas et simplement, ce qu'il doit faire à la main.

## Règles (non négociables)
1. **Jamais de mot de passe, de clé ou de jeton dans la conversation.** Si une étape en demande un, Théo le tape lui-même dans le terminal ou le navigateur. Ne lis et n'ouvre jamais les fichiers `.env`, `.env.local` ou `.env.*`.
2. **Chacun son compte.** Théo utilise **son propre** compte GitHub (et ses propres comptes partout). Jamais le compte de Gabriel ni de quelqu'un d'autre, même « juste pour tester ».
3. **Aucune action sur la production.** Le site est en ligne (https://outly-sydney.com, soirée Rouge le 24 oct.). Interdit sans demande explicite de Gabriel : `supabase link`, `supabase db push`, `supabase functions deploy`, `supabase secrets`, `wrangler pages deploy`, `node scripts/publish-sites.mjs`, `node scripts/prod-env.mjs`, et tout script avec `--target prod`. Ici, on travaille **uniquement en local, sur les données de démo**.
4. **Jamais la CLI `vercel`.** Jamais de push sur `main` : une branche + une PR, relue par Gabriel.
5. Avant une commande qui installe un logiciel ou modifie le système, dis à Théo ce qu'elle fait en une phrase.

## Étape 1 — Vérifier ce qui est déjà installé
Lance et résume dans un tableau (installé / version / à faire) :
`git --version`, `node --version`, `npm --version`, `pnpm --version`, `python --version`, `pip --version`, `gh --version`, `docker --version`, `winget --version`.
Vérifie aussi que **Google Chrome** est installé (utilisé par les tests automatiques).

## Étape 2 — Installer ce qui manque (avec `winget` quand c'est possible)
| Outil | Version attendue | Commande |
|---|---|---|
| Git | récente | `winget install --id Git.Git -e` |
| Node.js | **24** (le projet est testé avec Node 24) | `winget install --id OpenJS.NodeJS.LTS -e`, puis `node --version` : s'il ne commence pas par `v24`, désinstalle-le et installe la dernière **v24** depuis https://nodejs.org/en/download (onglet *Previous releases*) |
| pnpm | **12.9.1** exactement | `npm install -g pnpm@12.9.1` |
| Python 3 | récente, **dans le PATH** | `winget install --id Python.Python.3.12 -e` |
| pgserver + tzdata | — | `pip install pgserver tzdata` |
| GitHub CLI | récente | `winget install --id GitHub.cli -e` |
| Docker Desktop | récente | `winget install --id Docker.DockerDesktop -e` |
| Google Chrome | récente | `winget install --id Google.Chrome -e` (si absent) |

Après les installations : demande à Théo de **fermer et rouvrir VS Code** pour que les nouvelles commandes soient reconnues, puis revérifie les versions.

👤 **À la main — Docker Desktop** : explique à Théo qu'il doit l'ouvrir une première fois, accepter **WSL 2** si c'est proposé, **redémarrer l'ordinateur** si demandé, puis attendre que Docker affiche « Engine running ». Vérifie ensuite avec `docker info`.

## Étape 3 — GitHub (son propre compte) 👤
Explique à Théo, étape par étape :
1. Aller sur **github.com** et se connecter avec **son** compte (ou en créer un avec son email). S'il ne retrouve pas son mot de passe : *Forgot password?*. Si le message dit « *This account does not support password sign-in* », c'est que le compte a été créé avec **Continue with Google / Apple** : utiliser ce bouton.
2. Activer la **double authentification** : photo en haut à droite → *Settings* → *Password and authentication* → *Enable two-factor authentication* (application d'authentification recommandée). Garder les **codes de secours** dans un endroit sûr.
3. Envoyer **son identifiant GitHub** (pas le mot de passe) à Gabriel. **Matthieu**, propriétaire du dépôt, doit l'inviter sur `Matthieusabourin2/outly` (rôle *Write*).
4. Accepter l'invitation (email reçu, ou github.com/notifications).
5. Dans le terminal de VS Code, Théo tape lui-même `gh auth login` et répond : **GitHub.com** → **HTTPS** → **Yes** (authentifier Git) → **Login with a web browser** ; il copie le code affiché, le colle dans le navigateur, clique *Authorize*.
6. Vérifie avec `gh auth status` (doit afficher **son** identifiant, pas celui de Gabriel) et `gh repo view Matthieusabourin2/outly`.

Si l'invitation n'est pas encore arrivée : arrête-toi là, résume ce qui est prêt, et dis à Théo de te relancer quand il aura accepté l'invitation.

## Étape 4 — Récupérer le projet
```
git clone https://github.com/Matthieusabourin2/outly.git
cd outly
git fetch --all
pnpm install
```
La version en ligne est sur la branche `launch/2026-10-22` (pas encore fusionnée dans `main`) : fais `git switch launch/2026-10-22` pour travailler à partir d'elle, sauf si Gabriel dit autre chose.

Puis **lis** (sans les modifier) : `CLAUDE.md`, `docs/SETUP.md`, `docs/SPEC.md` (dont la section Amendments), `docs/PLAN.md`, `docs/SECURITY.md`, `state/launch-2026-10-22/STATUS.md`. Ce sont les règles du projet : respecte-les.

## Étape 5 — Base de données locale et comptes de démo
Docker doit tourner.
```
pnpm db:start
pnpm db:reset
pnpm env:local
pnpm db:seed-users
```
Sous Windows, `pnpm db:start` saute volontairement Studio / analytics / pg_meta (ils ne démarrent pas bien avec Docker Desktop) : c'est normal.
Comptes de démo (local uniquement, mot de passe `OutlyDemo2026!`) : `guest@demo.outly`, `door@demo.outly`, `bar@demo.outly`, `manager@demo.outly`, `admin@demo.outly`.

## Étape 6 — Vérifier que tout marche
```
pnpm typecheck
pnpm lint
pnpm test
pnpm db:test
```
Puis, Docker allumé et Chrome installé : `pnpm e2e` (parcours complets client + équipe dans Chrome, ~2 min).
Si une étape échoue : lis l'erreur, cherche la cause dans `docs/SETUP.md`, corrige ce qui relève de l'installation de ce PC, et **ne modifie pas le code du projet** pour faire passer un test sans en parler à Gabriel.

## Étape 7 — Lancer les sites en local
```
pnpm dev:customer   # touche w → site client
pnpm dev:partner    # touche w → site équipe
pnpm dev:admin      # http://localhost:3000
```
Montre à Théo comment se connecter avec `guest@demo.outly` (client) puis `door@demo.outly` (équipe).

## Étape 8 — Accès à la production : PAS maintenant
Théo n'a **pas** besoin d'accès à la production pour l'instant. Si Gabriel décide plus tard de lui en donner, ce sera **par invitation à son propre compte**, jamais avec les identifiants de Gabriel :
- Supabase : Gabriel l'invite dans l'organisation (*Organization → Team → Invite*) ; Théo accepte par email puis tape lui-même `supabase login`.
- Cloudflare : Gabriel l'ajoute comme membre (*Manage account → Members → Invite*) avec un rôle limité ; Théo accepte par email.
Ne fais aucune de ces étapes de toi-même.

## Rapport final
Termine par un résumé court pour Théo, en français simple :
1. tableau des outils (version installée ✅ / à faire ❌) ;
2. connexions : GitHub (identifiant affiché par `gh auth status`) ;
3. résultat de chaque vérification (typecheck, lint, test, db:test, e2e) ;
4. **ce qui reste à faire à la main**, numéroté, avec qui doit le faire (Théo, Gabriel, Matthieu).
