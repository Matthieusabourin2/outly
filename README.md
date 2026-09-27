# Outly

Good times, anytime. A going-out app for Sydney: customer app, partner venue app, admin platform.

- Spec and decisions: `docs/SPEC.md`
- Rules for Claude Code: `CLAUDE.md`
- Prompts to run each build slice: `docs/KICKOFF_PROMPT.md`

Status: slice 0 started — database schema + RLS (tested), demo seed, design tokens, monorepo config. App shells next.

Quick check of the database layer without Docker:

    pip install pgserver
    python3 supabase/tests/run_local.py
