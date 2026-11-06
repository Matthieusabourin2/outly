# Outly

Good times, anytime. A going-out app for Sydney: customer app, partner venue app, admin platform.

- Spec and decisions: `docs/SPEC.md`
- Rules for Claude Code: `CLAUDE.md`
- Current plan, deadlines and who does what: `docs/PLAN.md`
- Prompts to run each build slice: `docs/KICKOFF_PROMPT.md`

Status: **Rouge slice** (launch night Sat 24 Oct 2026) — customer and staff websites built and tested locally; going live is pending (hosting, Supabase project, domain). Progress table in `docs/PLAN.md`.

## Setup (Windows or macOS)

See **`docs/SETUP.md`** — tools to install, first run, and how we work as two developers.

## First run

    pnpm install
    pnpm db:start                        # first run downloads Docker images
    pnpm db:reset                        # migrations + demo seed
    pnpm env:local                       # writes apps/*/.env.local from `supabase status`
    pnpm db:seed-users                   # demo accounts (local only) — rerun after every db:reset

Then, in separate terminals:

    pnpm dev:customer    # customer website — press w to open it in the browser
    pnpm dev:partner     # staff website (door, bar, managers) — press w
    pnpm dev:admin       # http://localhost:3000

Demo accounts and the demo launch night are described in `docs/SETUP.md`. The customer and staff sites ship as websites for the launch (SPEC A2); the camera scanner needs HTTPS or localhost.

## Checks

    pnpm typecheck && pnpm lint && pnpm test && pnpm db:test

`pnpm db:test` runs migrations + seed + RLS smoke tests on a throwaway Postgres (no Docker). CI runs the same on every push.
