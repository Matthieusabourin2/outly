# Plan de nuit — 13 → 14 octobre 2026 (travail autonome, sans Gabriel)

> Document de pilotage pour Claude (orchestrateur) et ses agents. Source de vérité de la nuit.
> L'état d'avancement vit dans `STATUS.md` (même dossier), mis à jour à chaque étape.
> En cas de conflit : `CLAUDE.md` et `docs/SPEC.md` (Amendments A1–A9) priment sur ce plan.

## 1. Objectif de la nuit (le « goal »)

**Au réveil de Gabriel, la branche `slice/1-rouge-night` est prête à être relue : le lancement de Rouge (sam. 24 oct.) ne dépend plus que de décisions humaines (comptes, hébergement, contenu), plus du code.**

Concrètement, mesurable :
1. Les sites client et équipe se **construisent en statique, prêts à héberger** (Cloudflare Pages *ou* Vercel), avec retour SPA, en-têtes de sécurité, manifest PWA et icônes Outly.
2. Une **procédure de mise en ligne écrite et testable** (`docs/DEPLOY.md`) : Supabase hébergé, fonction serveur, réglages Auth, variables, domaine.
3. Des **scripts de mise en place de Rouge** (soirée, guest list 200, line-up, comptes du personnel) testés **en local**, sûrs par défaut (simulation, refus de la prod sans drapeau explicite).
4. Une **suite de tests de bout en bout** dans le dépôt (`pnpm e2e`) qui rejoue les parcours client et équipe dans Chrome, caméra comprise.
5. Les sites client et équipe **durcis** (cas limites, erreurs, accessibilité, iPhone/Safari) sans changer les décisions produit.
6. Un **audit sécurité de la base** avec correctifs testés dans une migration `0003`.
7. Tout vert : typecheck, lint, tests unitaires, `pnpm db:test`, `pnpm e2e`, exports web, gitleaks. Poussé sur GitHub, PR en brouillon, rapport du matin écrit.

## 2. Règles infranchissables (gates) — valables pour TOUS les agents

- **Jamais** de push sur `main`, **jamais** de fusion de PR (`gh pr merge` interdit), jamais de `--force` sur une branche partagée.
- **Jamais** la CLI `vercel` ni le MCP Vercel (CLAUDE.md § Déploiement). Le seul déploiement possible cette nuit : la preview automatique de l'admin quand une branche est poussée.
- **Jamais** ouvrir, afficher ou commiter un fichier `.env`, `.env.local`, `.env.*` (sauf les modèles `.env.example`). Aucune valeur de clé dans un message, un log ou un commit.
- **Aucune action externe** : pas de création de compte, pas d'achat, pas de projet Supabase/Cloudflare/Google, pas d'email réel (Mailpit local uniquement), pas de données de production.
- **Hors périmètre** : `apps/admin` (chantier de Tondal775), l'abonnement payant et les applis des stores (8 nov.), le contenu réel de Rouge (line-up, emails du personnel → placeholders).
- **Pas de changement de décision produit.** Si un agent pense qu'une décision est mauvaise : il ne la change pas, il l'écrit dans son rapport (section « Questions pour Gabriel »).
- **Migrations** : ne jamais modifier `0001_init.sql`. Les nouveaux changements de base vont dans `0003_*.sql`. `0002` (pas encore en production) peut recevoir une correction de bug avérée, avec test.
- Règles de `CLAUDE.md` : tokens de `packages/ui` (pas de couleurs/tailles en dur dans les écrans), textes de l'interface en anglais australien, erreurs `OUTLY_*` traduites via `packages/core`, RLS + test pour toute nouvelle table/fonction.
- **Chaque agent travaille uniquement dans son worktree** (chemin absolu donné) et sur sa branche `night/<chantier>`. Il commite au fil de l'eau, **ne pousse pas** (l'orchestrateur intègre et pousse).
- Base locale partagée (Docker, ports 54321/54322/54324) : seul le chantier **e2e** a le droit de la réinitialiser (`db:reset`). Les autres utilisent `pnpm db:test` (Postgres jetable, sans Docker).

## 3. Les chantiers (en parallèle, worktrees isolés)

Base commune : branche `slice/1-rouge-night` (= `slice/1-rouge` + ce plan).

| Chantier | Worktree | Branche | Fichiers autorisés |
|---|---|---|---|
| **A. Déploiement prêt** | `~/Documents/GitHub/outly-wt/deploy` | `night/deploy` | `apps/customer` + `apps/partner` (config, `public/`, `assets/`, `package.json`), `scripts/`, `content/`, `docs/DEPLOY.md`, `package.json` racine (scripts), `.gitignore` |
| **B. Tests de bout en bout** | `~/Documents/GitHub/outly-wt/e2e` | `night/e2e` | nouveau paquet `e2e/`, `package.json` racine (scripts), `pnpm-workspace.yaml`, `docs/SETUP.md` (section e2e) |
| **C. Durcissement des sites** | `~/Documents/GitHub/outly-wt/apps` | `night/apps` | `apps/customer/src`, `apps/partner/src`, `packages/ui`, `packages/core` |
| **D. Audit sécurité base** | `~/Documents/GitHub/outly-wt/db` | `night/db` | `supabase/migrations/0003_*.sql` (+ correctifs avérés de `0002`), `supabase/tests/`, `packages/db/src/types.ts` (régénéré), `packages/core/src/errors.ts` (nouveaux codes) |

Chaque chantier se termine par : typecheck + lint + tests unitaires + `pnpm db:test` verts dans son worktree, commits propres (messages en anglais, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), et un **rapport structuré** (fait / vérifié comment / non fait / risques / questions pour Gabriel).

## 4. Intégration (orchestrateur, après les chantiers)

1. Relecture de chaque rapport + vérification adversariale (un relecteur par chantier).
2. Fusion des 4 branches dans `slice/1-rouge-night` (ordre : D → C → A → B), résolution des conflits (attendus : `package.json` racine, `pnpm-lock.yaml`).
3. Régénération des types si `0003` existe ; `pnpm install`.
4. Vérification complète : typecheck, lint, unit, `pnpm db:test`, `db:reset` + `db:seed-users` + `pnpm e2e`, exports web des 2 sites, gitleaks sur tout l'historique.
5. Push de `slice/1-rouge-night`, PR **brouillon** vers `slice/1-rouge` (empilée sur la PR #4), `gh pr checks --watch`.
6. Mise à jour de `docs/PLAN.md` (avancement) et rapport du matin `state/night-2026-10-13/MORNING.md` + résumé en français dans la conversation.
7. Nettoyage : suppression des worktrees (les branches `night/*` restent locales, non poussées).

## 5. Critères de fin (Definition of done)

- [ ] `slice/1-rouge-night` poussée, PR brouillon ouverte, **tous les checks GitHub verts** (checks, database, secrets, Vercel preview admin).
- [ ] `pnpm e2e` passe en local (parcours client + équipe, caméra simulée), résultats consignés dans le rapport.
- [ ] Les 2 sites s'exportent en statique avec retour SPA et en-têtes ; la procédure `docs/DEPLOY.md` liste chaque étape humaine restante.
- [ ] Scripts Rouge testés en local, refus prouvé sans `--target prod` explicite.
- [ ] Migration `0003` (si nécessaire) couverte par des tests ; `pnpm db:test` vert.
- [ ] Aucun secret (gitleaks), aucun push sur `main`, aucune fusion, aucune action externe.
- [ ] `MORNING.md` : ce qui est fait, comment c'est vérifié, ce qui reste, décisions à prendre, prochaines commandes.

## 6. Si quelque chose bloque

Un agent bloqué n'improvise pas hors périmètre : il documente le blocage (symptôme observé, ce qu'il a essayé) et rend la main. L'orchestrateur note le blocage dans `STATUS.md` et continue les autres chantiers. Une nuit partielle mais propre vaut mieux qu'une nuit complète mais risquée.
