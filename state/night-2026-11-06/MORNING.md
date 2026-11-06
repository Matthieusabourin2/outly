# Rapport du matin — nuit du 6 → 7 novembre 2026

Pour Gabriel. **Rien n'a été fusionné, `main` n'a pas été touché, les sites en ligne n'ont pas été republiés.** Tout est dans 2 PR vertes, à relire et à fusionner par toi.

## En 30 secondes

- ✅ **Appli Android** : elle marche de bout en bout **sur la vraie production**, vérifiée sur un émulateur Android 15 : inscription avec le vrai CAPTCHA, profil 18+, soirée, pass QR, et la session reste ouverte après redémarrage. Un **APK installable** est prêt (lien plus bas).
- 🔴 **Faille critique trouvée et corrigée dans Next.js** (le site admin). Elle permettait d'exécuter du code à distance. L'admin en ligne sur Vercel tourne encore l'ancienne version **tant que la PR #6 n'est pas fusionnée** : **à fusionner en premier**.
- ✅ **Code remis au propre** : PR #6 = tout ce qui tourne en production → `main`.
- ✅ **Page pour la réunion des CEO** : https://claude.ai/artifact/X82G6HDmoCYzQXqddXfN7M (privée : à partager via le bouton *Share* de la page). Version texte : `state/ceo-meeting-2026-11.md`.
- ⚠️ **Ton Mac** : le dossier `Documents` est synchronisé avec iCloud et le disque est presque plein (96 %). Ça a ralenti et même cassé des compilations cette nuit. Explications et solution plus bas.

## À faire par toi, dans l'ordre

1. **Fusionner la PR #6** (https://github.com/Matthieusabourin2/outly/pull/6) avec un **commit de fusion** : `gh pr merge 6 --merge`. Pas en « squash » ici : la PR #7 est construite par-dessus, et un squash lui ferait réafficher tout le contenu de la #6. Tous les checks sont verts, Vercel compris. Le site admin sera redéployé avec Next.js corrigé.
2. **Puis la PR #7** (https://github.com/Matthieusabourin2/outly/pull/7) : l'appli native. Elle vise `launch/2026-10-22` ; après la fusion de #6, change sa base vers `main` (sur GitHub : *Edit* à côté du titre), vérifie que les checks repassent au vert, puis fusionne (`--squash` possible pour celle-ci). Si tu as déjà fusionné #6 en squash, demande-moi : je recale #7 sur `main`. Les PR #4 et #5 sont remplacées par #6 : tu peux les fermer.
3. **Installer l'appli sur un téléphone Android** (toi, Théo, les CEO) :
   - ouvre sur le téléphone : https://expo.dev/accounts/gabsab1/projects/outly/builds/3be20405-3adb-4a6e-96c8-eafb4f0a3d8b → **Install** ;
   - Android demande d'autoriser l'installation depuis le navigateur (« sources inconnues ») : c'est normal pour une version de test hors Play Store.
4. **Changer le mot de passe de la base Supabase** (toujours en attente depuis le 22 oct., il est passé dans la conversation) : Supabase → *Project Settings → Database → Reset database password*.
5. **Préparer la réunion CEO** avec la page ci-dessus. Elle ne parle pas de Théo : c'est à toi de le présenter quand tu veux.

## Ce qui a été fait cette nuit

| | Résultat |
|---|---|
| **PR #6** (`launch/2026-10-22` → `main`) | Ouverte, **7 checks verts**. En plus : **Next.js 16.4.5** (2 failles critiques : exécution de code à distance), outils de développement mis à jour ou forcés en version corrigée, 2 risques acceptés et justifiés (`pnpm-workspace.yaml`) |
| **Appli native** (PR #7, branche `native/android-preview`) | CAPTCHA Cloudflare dans l'appli (WebView servie comme `outly-sydney.com`) avec bouton « Try again » ; écran allumé **seulement** sur l'onglet Pass ; état du réseau ; clavier qui ne cache plus les champs ; session rafraîchie au retour dans l'appli ; Google seulement sur le site ; mises à jour de correctifs du SDK Expo 57 |
| **Build Android** (EAS, projet `@gabsab1/outly`) | 3 builds réussis ; le dernier (versionCode 4) est celui à installer. Les valeurs publiques (adresse Supabase, clé publique, clé de site du CAPTCHA) sont dans les **variables d'environnement EAS**, pas dans le code. Clé de signature Android gardée par Expo |
| **Sécurité de l'APK** | Aucun secret dans le code compilé (contrôle adapté au format Hermes, une fausse alerte expliquée et corrigée sans affaiblir le contrôle) ; **4 permissions seulement** (internet, état du réseau, Wi-Fi, vibration) ; sauvegarde Android de la session désactivée |
| **Revue adversariale** (2 agents : sécurité, justesse) | **1 vrai bug trouvé et corrigé** : la liste des adresses autorisées de la WebView ne correspondait jamais, ce qui aurait **bloqué le CAPTCHA sur iPhone** ; plus 5 améliorations (origine exacte des messages, bouton « Try again », permissions, sauvegardes, modules natifs pour le site équipe) |
| **Page CEO** | Rédigée puis vérifiée chiffre par chiffre par un 2ᵉ agent (prix des stores, règle Google des 12 testeurs × 14 jours, commission Apple/Google…) |

## Comment c'est vérifié

| Vérification | Résultat |
|---|---|
| Parcours complet dans l'appli Android (Maestro, émulateur Android 15) **contre la production** | ✅ 2 fois (builds 2 et 3) : CAPTCHA réel → compte → profil → soirée → rejoindre → pass QR → redémarrage, session conservée |
| QR du pass ↔ base de production | ✅ le QR décodé correspond à la réservation (« confirmed », code secret identique) |
| Écran allumé | ✅ activé sur l'onglet Pass, relâché sur Soirée, repris en revenant |
| Sites web (rien ne doit changer) | ✅ `pnpm e2e` **8/8** (suppression de compte comprise), `db:test` **69**, test CSP dans Chrome **18 vérifs / 0 violation** |
| Code | ✅ typecheck, lint, 23 tests unitaires, `expo-doctor` 21/21, audit des dépendances sans faille haute ni critique |
| **Production nettoyée** | ✅ comptes de test et soirée de test supprimés ; il reste Rouge et les 5 comptes réels. **Aucune migration**, aucun réglage changé, CAPTCHA jamais désactivé |

## ⚠️ Ton Mac : iCloud et disque plein

- `~/Documents` est synchronisé avec **iCloud**, avec « Optimiser le stockage » activé, et le disque est à **96 %** (9,6 Go libres).
- iCloud synchronise aussi `node_modules`, soit des centaines de milliers de fichiers. Cette nuit, les services iCloud tournaient à 40-60 % du processeur et **bloquaient la lecture des fichiers** : l'admin ne compilait plus (« connection timed out »), et une commande Git a même échoué pour la même raison.
- Hors iCloud, la même compilation prend **1,7 seconde**.
- **Je n'ai touché à aucun réglage.** J'ai travaillé dans une copie hors iCloud : **`~/outly-night`** (un « worktree » Git du même dépôt, branche `native/android-preview`).
- **Ma recommandation** : sortir le projet de `Documents`, par exemple `~/Code/outly`, puis libérer de la place. Tes fichiers `.env.local` sont aussi copiés dans iCloud aujourd'hui (des clés locales, sans gravité, mais autant l'éviter).
- Ton dossier habituel est revenu sur la branche `launch/2026-10-22`, propre. Quand tu n'as plus besoin de la copie de la nuit : `git worktree remove ~/outly-night`.
- **Installés sur ton Mac pour les tests Android** (sans mot de passe administrateur) : Java 17, les outils Android (~5 Go dans `/opt/homebrew/share/android-commandlinetools`), Maestro. Pour récupérer la place : `brew uninstall --cask android-commandlinetools && brew uninstall maestro openjdk@17`. L'appareil virtuel a été supprimé ; il se recrée en une minute (`e2e/native/README.md`).

## Limites et points ouverts

- **iPhone** : rien n'est possible sans compte Apple Developer (99 USD/an). Le code est prêt, et le bug qui aurait bloqué le CAPTCHA sur iPhone est corrigé.
- **Sur l'émulateur, le CAPTCHA demande de cocher une case.** Sur un vrai téléphone, il passe souvent tout seul. À vérifier sur de vrais téléphones Android.
- **Dans l'appli, pas d'email de code ni de « mot de passe oublié »**, comme sur le site, tant qu'il n'y a pas de service d'emails (Resend).
- **Connexion Google** : seulement sur le site pour l'instant.
- **La base est en offre gratuite, donc sans sauvegarde quotidienne** : Supabase Pro est proposé dans la page CEO.

Journal détaillé : `state/night-2026-11-06/STATUS.md`.
