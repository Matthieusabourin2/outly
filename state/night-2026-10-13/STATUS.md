# État de la nuit — 13 → 14 octobre 2026

> Mis à jour par l'orchestrateur à chaque étape. Lire `PLAN.md` pour le détail.

| Étape | État | Notes |
|---|---|---|
| 0. Préparation (branche d'intégration, 4 worktrees, install, typecheck) | ✅ fait | `slice/1-rouge-night` @ 72eb4b1 + plan |
| A. Déploiement prêt | ⏳ à lancer | |
| B. Tests de bout en bout | ⏳ à lancer | |
| C. Durcissement des sites | ⏳ à lancer | |
| D. Audit sécurité base | ✅ fait (avant la nuit) | migration 0003, 47 tests, API sondée, parcours Chrome OK |
| E. Sécurité transverse | ⏳ à lancer | ajouté le 13 oct. à la demande de Gabriel |
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
