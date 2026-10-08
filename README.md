# Outly

Good times, anytime. A going-out app for Sydney: customer app, partner venue app, admin platform.

- Spec and decisions: `docs/SPEC.md`
- Rules for Claude Code: `CLAUDE.md`
- Prompts to run each build slice: `docs/KICKOFF_PROMPT.md`

Status: **slice 0** — monorepo, local Supabase (schema + RLS, tested), demo seed, design system, three app shells.

## Setup (Windows or macOS)

See **`docs/SETUP.md`** — tools to install, first run, and how we work as two developers.

## First run

    pnpm install
    pnpm db:start                        # first run downloads Docker images
    pnpm db:reset                        # migrations + demo seed
    pnpm env:local                       # writes apps/*/.env.local from `supabase status`
    pnpm db:types                        # regenerate packages/db/src/types.ts

Then, in separate terminals:

    pnpm dev:customer    # Expo — press i for iOS simulator, or scan the QR with Expo Go
    pnpm dev:partner     # Expo
    pnpm dev:admin       # http://localhost:3000

Phone and Mac must be on the same Wi-Fi: the apps reach Supabase through the Mac's LAN address.

## Checks

    pnpm typecheck && pnpm lint && pnpm test && pnpm db:test

`pnpm db:test` runs migrations + seed + RLS smoke tests on a throwaway Postgres (no Docker). CI runs the same on every push.
