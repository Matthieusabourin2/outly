# Outly — instructions for Claude Code

Outly is a Sydney going-out app: three products (customer app, partner venue app, admin platform) on one Supabase backend.
**Read `docs/SPEC.md` before any work.** It is the source of truth; decisions D1–D12 are settled. Do not reopen them silently — if something in the spec seems wrong, stop and say so, and record changes in the "Amendments" section of the spec.

## Stack
- pnpm workspaces + Turborepo, TypeScript strict everywhere.
- `apps/customer`, `apps/partner`: Expo (latest stable SDK) + Expo Router. Dark theme only.
- `apps/admin`: Next.js App Router + Tailwind + shadcn/ui.
- `packages/ui` (tokens + RN components), `packages/core` (zod schemas, business rules), `packages/db` (generated Supabase types).
- `supabase/`: migrations, Edge Functions (Deno), seed, tests.
- Google Maps + Places API (New) via the `places-proxy` Edge Function only. Stripe Connect **test mode**. Claude API via `ai-chat` Edge Function.

## Non-negotiables (check on every change)
1. **RLS on every table.** A new table ships with its policies and a test in `supabase/tests/`. Never use the service role key in a client.
2. **No secrets in apps.** Google, Stripe, Anthropic keys live only in Edge Function secrets.
3. **Google terms:** store only `google_place_id` (lat/lng ≤ 30 days in `place_cache`). Places data on a map → Google Maps only. Show Google attribution; reviews/photos link to `googleMapsUri`.
4. **Honest offers:** every deal/event has `source` (`public_listing` | `outly_partner` | `demo`) and shows its label. `public_listing` needs `source_url` + `verified_at` (hidden after 30 days). Never invent an offer for a real venue. Demo data only in demo/dev.
5. Booking, guest list, QR pass and Outly Pay only at `partner_status = 'partner'` venues.
6. **18+ only** (DB trigger + sign-up UI).
7. **AI reads and drafts; the human confirms.** No AI tool performs a write without a confirmation screen. Responsible-service rules in every system prompt (see SPEC §10).
8. Social is **friends only**: report + block everywhere users interact. Friend activity is opt-in, off by default. Never share live location.
9. Money in integer cents AUD. Stripe test keys only — live keys must not exist.
10. Booking/check-in/payment state changes go through the SQL RPCs or Edge Functions, never direct client updates.

## Workflow
- Work in **vertical slices** (SPEC §12). One slice per branch: `slice/<n>-<name>`. Finish a slice end to end (DB → customer → partner → admin where relevant) before starting the next.
- Before coding a slice: write a short plan (files, migrations, screens, tests) and wait for approval.
- After coding: run typecheck, lint, unit tests, `pnpm db:test` (RLS smoke tests), and describe the manual device test for the slice.
- Migrations are append-only: `supabase/migrations/NNNN_description.sql`. Never edit an applied migration.
- Regenerate types after each migration: `pnpm db:types`.
- UI uses tokens from `packages/ui` — no hard-coded colours or font sizes in screens.
- The mockup boards are mood references, not pixel specs; where they conflict with the spec, the spec wins (e.g. tab bars, Live Orders cut, no Facebook login, no testimonials in-app).
- Keep copy in English (Australian spelling: "favourite", "personalise").

## Commands (to be wired up in slice 0)
- `pnpm dev:customer` / `pnpm dev:partner` / `pnpm dev:admin`
- `pnpm db:reset` — reset local Supabase and apply migrations + demo seed
- `pnpm db:test` — run `supabase/tests/*.sql`
- `pnpm db:types` — `supabase gen types typescript --local > packages/db/src/types.ts`
- `pnpm typecheck`, `pnpm lint`, `pnpm test`

## Error codes
SQL functions raise `OUTLY_*` codes (e.g. `OUTLY_LIST_FULL`, `OUTLY_NOT_PARTNER`, `OUTLY_UNDER_18`). Map them to user-facing messages in `packages/core/src/errors.ts`; never show raw SQL errors.
