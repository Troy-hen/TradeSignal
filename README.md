# MyTradeBox

MyTradeBox turns UK planning applications into qualified local opportunities for trade businesses, and sells exclusive local territories (postcode district × trade) on monthly subscription.

The whole product exists to serve one loop: **Find → Score → Value → Alert → Action → Win.** A trade business claims exclusive rights to a postcode district for their trade; MyTradeBox continuously ingests planning applications, works out which ones represent real work for that trade, scores and values the opportunity, and alerts the territory holder before their competitors know it exists.

## Contents

- [Architecture](#architecture)
- [Local development](#local-development)
- [Supabase setup](#supabase-setup)
- [Cron jobs](#cron-jobs)
- [Stripe configuration](#stripe-configuration)
- [Resend (email) configuration](#resend-email-configuration)
- [Planning data provider](#planning-data-provider)
- [AI / LLM configuration](#ai--llm-configuration)
- [Cloudflare deployment](#cloudflare-deployment)
- [Security model](#security-model)
- [Testing](#testing)
- [Known gaps / manual setup still needed](#known-gaps--manual-setup-still-needed)

## Architecture

**Stack:** Next.js 16 (App Router, Turbopack) on Cloudflare Workers via `@opennextjs/cloudflare` · Supabase (Postgres, Auth, Edge Functions, Cron) · Stripe (Checkout + Billing Portal + webhooks) · Resend (email) · OpenAI (default AI provider; Anthropic fully implemented as a swappable alternative).

**The pipeline** (all autonomous, running in Supabase Edge Functions on `pg_cron` schedules — never in the Next.js app, which only handles user-facing requests and Stripe):

```
pg_cron ──▶ ingest-planning-applications ──▶ planning_applications (+ pending classification row)
pg_cron ──▶ classify-planning-application ──▶ application_classifications, application_trade_opportunities
                                                          │
                                          DB trigger ─────┘ (matching fan-out, both directions)
                                                          ▼
                                                    lead_matches
                                                          │
pg_cron ──▶ notify-leads ─────────────────────────────────┘ (Resend emails)
```

- **Ingestion** (`supabase/functions/ingest-planning-applications`) polls the active planning-data provider (see [Planning data provider](#planning-data-provider)), upserts by content hash so re-ingesting unchanged data is a no-op, and writes a `pending`/`stale` classification row via a DB trigger the moment a new/changed application lands — so a later AI failure never loses the underlying planning record.
- **AI enrichment** (`supabase/functions/classify-planning-application`) claims a batch of pending/stale rows (`FOR UPDATE SKIP LOCKED`, safe against overlapping cron ticks), calls the configured LLM with a Zod-validated structured-output schema, and upserts one row per matched trade into `application_trade_opportunities`. Every call — success or failure — is logged to `ai_enrichment_runs` first.
- **Matching** is two DB triggers, not a separate function: a forward trigger fans a new opportunity out to every company with an active claim on that district+trade; a reverse trigger backfills recent opportunities the moment a claim activates, so a brand-new subscriber doesn't see an empty dashboard.
- **Opportunity scoring** is a Postgres function/trigger (`0–100`, bucketed HOT/STRONG/POSSIBLE/LOW) — additive on trade fit, value, project size, and recency, then multiplied by a planning-stage factor (an approved application scores far higher than a submitted one; a rejected one is crushed to near-zero) and an AI-confidence factor. This is deterministic, not an LLM call — the SQL function is the single source of truth.
- **Notifications** (`supabase/functions/notify-leads`) run on three cadences (instant / daily / weekly) plus approval alerts and any queued transactional email (payment failed, territory became available), all idempotent so re-running a tick is harmless.
- **Territory exclusivity** is enforced by a single Postgres partial unique index (`territory_claims (territory_id) WHERE status IN ('reserved','active','suspended')`) — not application logic. Two concurrent checkout attempts for the same district+trade race at the database, and the loser gets a typed `territory_unavailable` error, with no TOCTOU window.
- **Three-tier data access**, all enforced by RLS/grants (never a frontend filter): anonymous visitors and signed-up users without an active territory claim get aggregate counts plus a locked detail preview via `check_territory_availability()`; full detail (address, planning reference, AI reasoning, outreach assistant) requires an active territory claim, gated by `has_active_lead_match()` directly on the underlying tables.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `PLANNING_PROVIDER=mock` (the default) the app runs fully end-to-end with zero external credentials except Supabase — the mock provider generates ~250 realistic UK planning applications across the seeded postcode districts.

## Supabase setup

1. Create a Supabase project (Postgres 17+, PostGIS available).
2. Apply every file in `supabase/migrations/` in order (via the Supabase CLI `supabase db push`, or the Supabase MCP server's `apply_migration` if working with Claude Code).
3. Deploy the four Edge Functions in `supabase/functions/` (`ingest-planning-applications`, `classify-planning-application`, `notify-leads`, `generate-outreach`). The first three must be deployed with **`verify_jwt: false`** — they authenticate `pg_cron`/`pg_net` calls via their own `CRON_SECRET` check, not a Supabase JWT (pg_cron's call never carries one, so `verify_jwt: true` would have the platform gateway reject every call before the function's own check ever runs). `generate-outreach` keeps the default `verify_jwt: true`, since it's called by a real signed-in user and needs RLS to actually gate access.
4. Set these as **Edge Function secrets** (Project Settings → Edge Functions → Secrets, or `supabase secrets set KEY=value` — one set of secrets covers all four functions):

   | Secret | Notes |
   |---|---|
   | `CRON_SECRET` | Verifies `pg_cron`/`pg_net` → Edge Function calls. Also stored in Supabase Vault (`vault.create_secret`) so the SQL side of `pg_net.http_post` calls can reference it without the plaintext sitting in `cron.job.command`. |
   | `OPENAI_API_KEY` | Default AI provider. |
   | `ANTHROPIC_API_KEY` | Only needed if `AI_ENRICHMENT_PROVIDER=anthropic`. |
   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email sending. |
   | `PLANNING_PROVIDER` | `mock` (default) or `plota`. |
   | `PLOTA_API_KEY` | Only read when `PLANNING_PROVIDER=plota`. Demo operation does not require a plan-tier variable. |
   | `PLOTA_MAX_PAGES_PER_RUN` | Optional scheduled-ingestion cap; defaults to one ten-row page per Plota run. |
   | `NEXT_PUBLIC_APP_URL` | Used to build links inside emails. |

   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the platform — never set these manually.

## Cron jobs

All scheduled via `pg_cron`/`pg_net` (see the relevant `supabase/migrations/*_cron.sql` files) — no external cron service:

| Job | Schedule | Purpose |
|---|---|---|
| `ingest-planning-applications-new` | every 30 min | New applications since the last run |
| `ingest-planning-applications-updated` | `:15`/`:45` past the hour | Changed applications (offset from the above so they interleave) |
| `classify-planning-application` | every 2 min | Drains the pending/stale classification queue, batch of 15 |
| `notify-leads-instant` | every 10 min | Score ≥ threshold → immediate email |
| `notify-leads-daily` | 07:00 UTC | Daily digest |
| `notify-leads-weekly` | Mon 07:00 UTC | Weekly digest |
| `expire-territory-reservations` | every 5 min | Backstop that frees a reservation if the Stripe webhook never arrives |
| `rescore-stale-opportunities` | 04:00 UTC | Recency decays continuously even with no data change — re-scores the last ~180 days |
| `prune-rate-limit-events` | 03:00 UTC | Truncates the public-checker rate-limit table past 48h |

## Stripe configuration

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (in the Cloudflare Worker's env, not Supabase — see [Cloudflare deployment](#cloudflare-deployment)). Point Stripe's webhook at `<your-app-url>/api/webhooks/stripe`, subscribed to `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.

Territory pricing uses inline Checkout `price_data` (read live from `territories.monthly_price_pence`) rather than a pre-created Stripe Price catalog — an admin price change takes effect on the next checkout with no Stripe-side sync step, which matters given there's no practical way to pre-create Prices for ~3,000 postcode districts × N trades.

The webhook handler reads the **raw** request body before any JSON parsing (Stripe's signature covers the exact byte stream), verifies it, and fails closed — an unverifiable signature is a `400` with nothing processed. Idempotency is a `stripe_events` ledger keyed on `event.id`; a duplicate delivery is a no-op `200`.

## Resend (email) configuration

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as Edge Function secrets (email sending happens in `notify-leads`, not the Next.js app). No SDK — a single `fetch` POST per email, since the surface is small.

## Planning data provider

`lib/planning-providers` from an earlier iteration of this codebase has been superseded — the real, active implementation lives in `supabase/functions/_shared/planning-providers/` (Deno), since ingestion is an autonomous Edge Function concern, not something the Next.js app touches directly.

- **`mock` (default)** — `MockPlanningProvider` generates ~250 seeded, deterministic, realistic UK-style applications across the districts in `postcode_districts`, marked `is_demo_data`. Zero external dependency; this is what local dev and a fresh deploy run against out of the box.
- **`plota`** — uses Plota's bearer-auth REST API with the current application fields (`description`, `address`, `planning_route`, `date_decided`, `commercial`) mapped into the normalized planning schema. List requests explicitly use a ten-row page, cursor pagination is followed, and `include_contact` is never set to `true` by default. The Demo key is capped at **500 requests total, not monthly**; use the targeted manual sync below for smoke-testing, not an unrestricted historical backfill. Scheduled Plota reads default to one ten-row page per run; set `PLOTA_MAX_PAGES_PER_RUN` only when you deliberately want to spend more calls. A plan-tier environment variable is not required for Demo operation.

For a bounded end-to-end smoke test, call the ingestion function with only the districts you want to inspect. This makes one Plota list request per district (maximum ten rows per request):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ingest-planning-applications" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"run_type":"manual_backfill","postcode_districts":["IP22","NR1","N2"]}'
```

The ingestion response reports fetched/created rows. The classifier then needs to run with a configured `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` and an active `application_enrichment` prompt before aggregate opportunity counts and AI-backed values can appear.

## AI / LLM configuration

`AI_ENRICHMENT_PROVIDER=openai` (default) or `anthropic`. Both go through the same `AiEnrichmentProvider` interface and the same Zod schema (`supabase/functions/_shared/ai/schemas.ts`), enforced at the SDK level via structured outputs (OpenAI's `responses.parse` + `zodTextFormat`; Anthropic's `messages.parse` + `zodOutputFormat`) — a malformed model response is rejected by the schema, not hoped into shape by a prompt. Every enrichment attempt, successful or not, is logged to `ai_enrichment_runs` with the model, prompt version, raw response, token counts, and latency.

Every AI-derived number (`estimated_total_project_value_*`, `estimated_trade_value_*`) is stored in columns structurally separate from factual planning data, and the UI labels them "indicative estimate — not a valuation" everywhere they're shown.

## Cloudflare deployment

The app deploys as a Cloudflare Worker via `@opennextjs/cloudflare` (`wrangler.jsonc`). Set these in the Cloudflare dashboard under the Worker's **Settings → Variables** (separate from, and in addition to, the Supabase Edge Function secrets above):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL          # the real deployed URL, not localhost
MYTRADEBOX_DEMO_USER_EMAILS # exact internal demo account email(s), comma/newline separated
MYTRADEBOX_DEMO_USER_IDS    # exact internal demo auth UUID(s), comma/newline separated
```

The `TERRITORY_CHECK_LIMITER` rate-limiting binding in `wrangler.jsonc` (edge-layer defense on the public territory checker) uses wrangler's pre-GA `unsafe.bindings` form rather than the newer first-class `ratelimits` config key introduced in Cloudflare's September 2025 GA release — confirmed via Cloudflare's own changelog that existing `unsafe`-binding deployments continue to function, but the exact field names for the newer syntax weren't verifiable from the sandbox this was built in (`developers.cloudflare.com` was network-blocked there). Worth migrating to the current syntax from an environment with real docs access.

Node.js middleware support in OpenNext's Cloudflare adapter is experimental — `proxy.ts` is intentionally minimal (Supabase session refresh only, no DB queries) and every API route resolves its own auth directly rather than relying on middleware for anything security-critical.

## Security model

Full detail lives in the commit history of `supabase/migrations/20260908090000_security_hardening.sql` and `20260908091500_audit_admin_grants.sql`; the short version:

- RLS enabled on every tenant table; `anon` has zero table-level grants on planning/territory/company data (verified, not just RLS-filtered — a direct `SELECT` as `anon` fails with `insufficient_privilege`, confirmed in `supabase/tests/001_rls_and_access_control.sql`).
- Every `SECURITY DEFINER` function's `EXECUTE` grant was audited against what actually needs it. Two real gaps were found and closed: `claim_classification_batch()`/`upsert_planning_application()` (meant to be cron/service-role only) were reachable by any authenticated or anonymous caller via PostgREST with no internal check; `browse_opportunity_teaser()` was reachable by `anon` due to a `revoke ... from public` that doesn't touch Supabase's separate per-role default grants (the fix has to name `anon`/`authenticated` explicitly, not just the `PUBLIC` pseudo-role).
- Tenant identity is always resolved server-side via `company_memberships`/`auth.uid()` — API routes and Server Actions never trust a client-supplied `company_id` or price.
- Stripe webhook signatures are verified against the raw body and fail closed; idempotency via a `stripe_events` ledger.
- The public territory checker is rate-limited at two independent layers: a Cloudflare Workers edge binding (fails open when absent, e.g. local dev) backed by a DB-level `rate_limit_events` table inside `check_territory_availability()` itself, which is what actually protects any environment without the edge binding.
- `audit_logs` covers territory claimed/cancelled, subscription status changes, and admin role grants/revokes — the last of these via a DB trigger, since there's no in-app admin-grant mechanism at all (the first grant is necessarily a direct SQL operation).
- Security headers (CSP, `X-Frame-Options: DENY`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`) are set in `next.config.ts`.

Two low-severity advisor findings are deliberately left as documented exceptions rather than "fixed": `spatial_ref_sys` (a PostGIS system table of SRID constants, no tenant data) can't have RLS enabled by a migration role since it's owned by the extension itself; `postgis`/`pg_net` living in the `public` schema is Supabase's own default placement (`pg_net`'s control file explicitly marks it non-relocatable — confirmed live), and moving `postgis` this late would touch the `geography()` columns already depending on it for no functional benefit.

## Testing

```bash
# SQL suite — RLS isolation, territory exclusivity, planning ingestion
# dedup, matching fan-out, opportunity scoring, rate limiting. Each file
# is self-contained (creates its own zzz_test_-prefixed fixtures, asserts
# via RAISE EXCEPTION, cleans up on success — a failure rolls back the
# whole thing automatically since each is one implicit transaction).
DATABASE_URL="postgresql://...:6543/postgres" supabase/tests/run.sh

# AI structured-output Zod schema validation (OpportunitySchema,
# OutreachSchema) — requires the Deno CLI, since these files use Deno's
# npm: specifier and can't be imported from the Next.js/Node side.
deno test supabase/functions/_shared/ai/schemas.test.ts
```

Never point `DATABASE_URL` at a database with real customer data — the suite inserts and deletes real rows in real tables.

## Known gaps / manual setup still needed

- `lib/planning-providers/` (an early Next.js-side draft, superseded by the Deno rewrite in `supabase/functions/_shared/planning-providers/`) is dead code left in the repo — safe to delete.
- Demo territory activation is allow-listed by exact user email or auth UUID via `MYTRADEBOX_DEMO_USER_EMAILS` / `MYTRADEBOX_DEMO_USER_IDS`; it activates the real claim and matching triggers without creating a Stripe subscription.
- No admin-invite flow exists in this MVP; the first `admin_users` grant is a direct SQL operation (`insert into admin_users (profile_id) values (...)`) against a real `auth.users` row, which is now audited via trigger regardless of how it happens.
- Plota's webhook-based push ingestion (`application.match.created`) is implemented (HMAC verification, event dedup) but not wired as the primary ingestion path — polling via the endpoints in [Planning data provider](#planning-data-provider) already satisfies "incremental scheduled ingestion" on its own; the webhook path is a documented, tested-but-dormant latency optimization for later.
