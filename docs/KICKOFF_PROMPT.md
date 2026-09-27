# Prompts to paste into Claude Code

Open a terminal in the `outly/` folder, run `claude`, then paste the prompt for the current slice.

---

## Prompt 1 — Slice 0 (foundation)

```
You are building Outly. First read CLAUDE.md and docs/SPEC.md completely; they are the source of truth.

Already done in this repo:
- docs/SPEC.md (all decisions), CLAUDE.md (rules)
- supabase/migrations/0001_init.sql (full schema + RLS + booking RPCs), tested
- supabase/seed_demo.sql (fictional demo venues/deals/events)
- supabase/tests/rls_smoke.sql (14 passing RLS tests) + supabase_stub.sql + run_local.py (runs tests on plain Postgres without Docker)
- packages/ui/src/tokens.ts (design tokens)
- root package.json, pnpm-workspace.yaml, turbo.json, .env.example

Your task: complete SLICE 0 as defined in SPEC §12. Before writing code, give me a numbered plan and wait for my OK.

Scope of slice 0:
1. Check prerequisites on my Mac (Node 20+, pnpm, Supabase CLI, Docker Desktop or OrbStack for local Supabase, Xcode + iOS simulator, Expo Go on my phone). Tell me exactly what to install if something is missing.
2. `supabase init` in the existing supabase/ folder without overwriting migrations/seed/tests; configure config.toml (auth: email + Apple + Google providers stubbed, site_url for Expo dev). Wire seed_demo.sql as the local seed.
3. apps/customer: Expo + Expo Router + TypeScript. Dark theme from packages/ui tokens, Plus Jakarta Sans via expo-font. Tab bar exactly: Home · Explore · AI · Squad · Profile (AI as the raised centre button). Each tab a placeholder screen using tokens.
4. apps/partner: same stack. Tabs: Today · Scan · Bookings · Promote · More. Placeholders.
5. apps/admin: Next.js App Router + Tailwind + shadcn/ui, theme mapped from tokens (dark + light). Sidebar: Dashboard, Venues, Deals & Promotions, Events, Bookings, Users, CRM, Payouts & Transactions, Reports & Exports, AI Copilot, Settings & Permissions. Placeholder pages.
6. packages/ui: export tokens + first components (Button, Chip, Card, SourceLabel, Screen) used by both Expo apps. packages/core: zod setup + errors.ts mapping OUTLY_* codes. packages/db: generated types from the local database.
7. Supabase client setup in all 3 apps reading env vars (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY; NEXT_PUBLIC_… for admin). No secrets in clients.
8. Scripts: dev:customer, dev:partner, dev:admin, db:reset, db:test (runs supabase/tests on the local DB), db:types, typecheck, lint.
9. A GitHub Actions workflow running typecheck, lint and `python3 supabase/tests/run_local.py`.
10. Make each Expo home screen query the demo venues from Supabase and list their names, to prove the whole chain works.

Definition of done: all three apps boot (customer + partner in iOS simulator and on my phone via Expo Go, admin at localhost:3000), each shows the design system and the demo venues, `pnpm db:test` passes, `pnpm typecheck` passes. Then summarise what was done and what I must test by hand.
```

---

## Prompt 2 — Slice 1 (auth, 18+, roles)

```
Read CLAUDE.md and SPEC §4 and §12. Implement SLICE 1. Plan first, wait for OK.
- Customer sign-up / log in: Sign in with Apple, Google, email + password (Supabase Auth). No Facebook.
- Onboarding: 3 intro screens (boards 1), then profile creation: username, display name, date of birth (18+ enforced client-side AND by the DB trigger — show a clear refusal for under-18), interests → profiles.preferences.
- Profile tab: view/edit profile, log out.
- Partner app: log in, load venue_memberships, venue switcher if several, tabs filtered by role (venue_door sees Today + Scan only).
- Admin: log in; only users in outly_staff get in; sidebar filtered by outly role.
- Seed script scripts/seed-demo-users.ts (Auth admin API, service key read from local env only) creating: a customer, a venue owner + door staff for "Harbourlight Rooftop", an outly_admin.
- Add RLS tests for anything new.
Done when: the customer, the door staff and the admin each log in and see only their own space, on a real phone for the two apps.
```

---

## Prompt for any later slice

```
Read CLAUDE.md and docs/SPEC.md. Implement SLICE <N> exactly as defined in SPEC §12 and the relevant sections (<list sections>). Plan first and wait for my OK. Respect all non-negotiables. Finish with: tests run, manual test steps on device, and any spec amendment you propose.
```
