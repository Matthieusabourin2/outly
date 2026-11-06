# Nuit 6 → 7 nov. 2026 — état

Plan : `~/.claude/plans/zippy-plotting-prism.md` (copie des étapes ci-dessous). Branche : `native/android-preview` (depuis `launch/2026-10-22`).

| Étape | État | Notes |
|---|---|---|
| 1. PR `launch/2026-10-22` → `main` | ✅ PR #6, 7 checks verts | ne pas fusionner (Gabriel). Correctif sécurité ajouté : Next.js 16.4.5 (failles critiques) + outils de dev |
| 2. Appli native prête (CAPTCHA WebView, écran allumé, Google web seulement, clavier, sessions) | ✅ codé, typecheck/lint/tests/expo-doctor verts | à prouver sur émulateur (étape 4) |
| 3. Build Android EAS (APK preview) | ✅ build 47b6866b réussi (1er essai), APK 115 Mo | https://expo.dev/accounts/gabsab1/projects/outly/builds/47b6866b-e7a6-45c1-83ae-b04b9fcf9953 — aucun secret (contrôle sur les chaînes du bundle Hermes), pointe vers la prod, clé Turnstile présente |
| 4. Vérification sur émulateur contre la prod | ⏳ | |
| 5. Page réunion CEO | ✅ `state/ceo-meeting-2026-11.md` (rédigée + vérifiée par 2 agents) | rien sur Théo (c'est à Gabriel de le présenter) |
| 6. Audit + MORNING.md | 🔄 revue 2 angles faite, correctifs commités (d9696c1) ; 2ᵉ build EAS en cours | |

## Journal
- 2026-11-07 — début de la nuit. caffeinate 12 h. PR #6 ouverte.
- 2026-11-07 — **iCloud** : `~/Documents` est synchronisé avec iCloud (« Optimiser le stockage », disque à 92 %) ; `fileproviderd`/`bird`/`cloudd` à 40-60 % de CPU bloquaient les lectures (build Next « connection timed out »). Travail de la nuit dans une copie hors iCloud : `~/outly-night` (git worktree) ; dépôt principal laissé sur un commit fixe (détaché). Hors iCloud, l'admin compile en 1,7 s.
- 2026-11-07 — Audit des dépendances rouge sur PR #6 : 2 failles **critiques** Next.js (exécution de code à distance) → Next 16.4.5 ; outils de dev mis à jour / forcés en version corrigée ; 2 risques acceptés et justifiés (decode-uri-component via expo-router, zod 3 en lint). PR #6 verte.
- 2026-11-07 — Natif : Turnstile dans une WebView (origine outly-sydney.com, messages filtrés, navigation bloquée), expo-keep-awake, expo-network, clavier, rafraîchissement de session, Google web seulement, patchs SDK 57. EAS : projet créé, keystore Android dans le cloud Expo, build preview lancé.
- 2026-11-07 — Page CEO rédigée et vérifiée (workflow 2 agents).
- 2026-11-07 — APK : le contrôle des secrets a signalé « clé secrète Supabase » → faux positif prouvé (texte `sb_secret_` de @supabase/functions-js collé à `_fbBatchedBridgeConfig` dans le bytecode Hermes, 10+22 = 32 caractères) ; exclusion ciblée, une vraie clé reste détectée.
- 2026-11-07 — Émulateur : `sdkmanager` bloqué à 13 % après 1 h → arrêté ; téléchargement direct des zips depuis dl.google.com (3 Mo/s).
- 2026-11-07 — Revue adversariale (workflow, angles sécurité + justesse) : **bug confirmé** — `originWhitelist` en `…/*` ne correspond jamais (la lib compare des origines sans chemin) → notre filtre n'était jamais appelé ; sur iPhone le widget aurait été bloqué. Corrigé (`['*']` + filtre par origine exacte). Aussi : origine exacte des messages, bouton « Try again » si le CAPTCHA ne charge pas, permissions overlay/stockage bloquées, `allowBackup: false`, modules natifs ajoutés au site équipe, README Maestro. 2ᵉ build EAS lancé.
