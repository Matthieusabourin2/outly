# État de la nuit — 13 → 14 octobre 2026

> Mis à jour par l'orchestrateur à chaque étape. Lire `PLAN.md` pour le détail.

| Étape | État | Notes |
|---|---|---|
| 0. Préparation (branche d'intégration, 4 worktrees, install, typecheck) | ✅ fait | `slice/1-rouge-night` @ 72eb4b1 + plan |
| A. Déploiement prêt | ⏳ à lancer | |
| B. Tests de bout en bout | ⏳ à lancer | |
| C. Durcissement des sites | ⏳ à lancer | |
| D. Audit sécurité base | ✅ fait (avant la nuit) | migration 0003, 47 tests, API sondée, parcours Chrome OK |
| E. Sécurité transverse | 🟡 en partie fait | fait : SECURITY.md, audit deps + CI, Auth durci, delete-account restreint, contrôle secrets des builds (CI). Reste nuit : CAPTCHA Turnstile, CSP |
| Relecture adversariale | ⏳ | |
| Audit sécurité final (diff complet de la nuit) | ⏳ | |
| Intégration + vérification complète | ⏳ | |
| Push + PR brouillon + checks | ⏳ | |
| Rapport du matin | ⏳ | |
| Nettoyage worktrees | ⏳ | |

## Journal

- 2026-10-13 — préparation terminée, plan écrit.
- 2026-10-13 — en attendant le « go » : README à jour, `db:seed-users` documenté dans CLAUDE.md, offre de démo du Velvet Tram corrigée (l'offre Outly démarre éteinte, comme pour Rouge). 36 tests verts.
- 2026-10-13 — chantier D fait par l'orchestrateur : 0003 (helpers → private, RPC fermées à anon, public_profiles sans prénoms, réservations invisibles pour vigiles/barmans, colonnes commerciales masquées + RPC venue_commercial_terms). Émulation de test alignée sur les droits par défaut de Supabase. 47 tests, 13 sondes API, parcours client + équipe OK dans Chrome.
- 2026-10-13 — Gabriel insiste sur la cybersécurité : ajout du chantier E (sécurité transverse) et d'un audit sécurité final. `pnpm audit` : 2 hautes + 2 moyennes (3 dans des outils de dev, 1 — decode-uri-component — dans le code livré).
- 2026-10-13 — chantier E en partie fait par l'orchestrateur (voir tableau). Vérifié : mot de passe faible refusé, 2e code < 1 min refusé, comptes existants OK ; delete-account : 403 pour un autre site, 401 sans session, suppression OK ; check-secrets attrape de fausses clés et laisse passer la clé publique.
- 2026-10-13 — fait par l'orchestrateur (chantier C, à ne pas refaire) : rafraîchissement mis en pause quand l'onglet est caché / téléphone verrouillé (`startVisiblePolling` dans packages/ui ; mesuré : 0 requête en 35 s onglet caché, rafraîchissement immédiat au retour) ; état « This night is over » sur Night et Pass (`isNightOver` dans core, 3 tests ; vérifié dans Chrome) ; offre masquée après la soirée ; texte de l'offre de démo dédoublonné.
