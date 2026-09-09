# MyTradeBox vendor activation checklist

Last reviewed: 2026-09-09

The product is designed to remain fully usable when optional vendors are disabled. Vendor-backed controls are capability-gated and appear only when the corresponding environment variables are configured.

## 1. OpenAI — required for AI features

Used for:
- planning classification/enrichment where OpenAI is the selected enrichment provider
- Ask MyTradeBox answer generation
- Ask MyTradeBox embeddings/RAG
- Deep Research and optional public-web research
- opportunity outreach drafting

Configuration (Cloudflare/Next.js):
- `OPENAI_API_KEY`
- `ASK_MYTRADEBOX_MODEL` (default `gpt-5-mini`)
- `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)

Also configure the relevant Supabase Edge Function secret if the autonomous classifier uses OpenAI.

## 2. Plota — planning data + first contact layer

Planning ingestion is already implemented. Production commercial use requires a paid Plota API plan.

Contact strategy:
- homeowner-only applications: do **not** spend a Plota contact lookup; use project-address post
- residential + agent: Plota Contact Data is the first contact lookup
- company/developer/public-sector: Plota published professional contacts are first; company intelligence is secondary

To activate published planning-contact lookup:
- use a Plota plan/key with Contact Data enabled
- set `PLOTA_API_KEY` in the Cloudflare Worker as well as wherever planning ingestion runs
- set `CONTACT_INTELLIGENCE_PROVIDER=plota`

The lookup is explicit/on-demand because contact-bearing records are metered. The adapter requests `include_contact=true` only for a user-triggered lookup. Applicant names are context only; MyTradeBox does not attempt consumer email/mobile enrichment.

## 3. TwentyCI / TwentyAPI — property and recency intelligence

Used for property-level context on unlocked opportunities. This is deliberately separate from contact enrichment.

Implemented flow:
1. User opens an unlocked opportunity.
2. MyTradeBox can match the planning project address + full postcode to a TwentyCI property/UPRN.
3. A match must pass a confidence threshold before any enrichment is persisted.
4. MyTradeBox retrieves the available property record, detailed property attributes, trigger history, transaction history and Likely To Sell signal.
5. Normalised intelligence is cached for 7 days to control API usage.
6. The opportunity shows property value/context, latest property-market trigger, transaction recency and property activity guidance.
7. Deep Research consumes the saved property intelligence when available.
8. Property intelligence never changes electronic-contact permission and is not treated as proof of construction intent.

Configuration (Cloudflare Worker):
- `PROPERTY_INTELLIGENCE_PROVIDER=twentyci`
- `TWENTYCI_CLIENT_ID`
- `TWENTYCI_CLIENT_SECRET`
- `TWENTYCI_USERNAME`
- `TWENTYCI_PASSWORD`

TwentyAPI uses OAuth bearer tokens. The adapter obtains and caches an access token and retries once on an authentication expiry. Optional endpoints degrade cleanly if the account does not include that dataset.

Important product rule: TwentyCI is used to improve **property context, recency and prioritisation**, not to infer who lives at an address or to unlock cold homeowner email/mobile marketing.

## 4. Companies House — structured company context

Used only for company/developer-style opportunities and currently feeds Deep Research.

Configuration:
- create a Companies House developer application/API key
- set `COMPANIES_HOUSE_API_KEY` in the Cloudflare Worker

When configured, Deep Research can add company status, registered-office context and current officer records. Officers are registry context and are not automatically treated as sales contacts.

No paid B2B enrichment vendor is required for launch. Add one only if production usage proves Plota + Companies House insufficient for high-value company-led opportunities.

## 5. Stannp — homeowner/project-address postal outreach

Implemented flow:
1. AI generates an introductory letter.
2. MyTradeBox uses the project address and defaults the recipient to `Property Owner / Occupier` for homeowner-led work.
3. Stannp validates the address.
4. The user generates a zero-charge test PDF preview.
5. MyTradeBox shows the returned estimated cost.
6. Live sending requires a second explicit confirmation.
7. Provider job id, cost and status are stored in `outreach_deliveries`.
8. Status synchronisation records later delivery/failure activity against the opportunity.

Configuration:
- create/fund a Stannp account and obtain an API key
- set `STANNP_API_KEY`
- set `POSTAL_OUTREACH_PROVIDER=stannp`

Until both values exist the postal send UI is hidden.

## 6. Resend — email delivery

Already used for platform/notification email architecture. Do not activate the production sender until the MyTradeBox domain is ready.

Configuration:
- verify sending domain in Resend
- set `RESEND_API_KEY`
- set `RESEND_FROM_EMAIL`
- optionally `RESEND_REPLY_TO`

This is platform email. Direct marketing email to homeowners is intentionally not part of the contact strategy. Business/professional email flows must still respect subscriber type, UK GDPR, suppression and opt-out rules.

## 7. Stripe — billing

Checkout/webhook architecture is already implemented. Use Stripe test credentials for UAT, then replace with live credentials at production cutover.

Configuration:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 8. Early Signals

The normalized `market_signals` and `market_signal_trade_matches` models exist, but no Early Signals navigation is exposed. Keep `MARKET_SIGNAL_PROVIDER=none` until a source is proven to add incremental, actionable work beyond planning data.

Preferred first source to evaluate: UK public procurement/future-opportunity data (Contracts Finder / Find a Tender), rather than another paid construction-data vendor.

## Launch position

No consumer contact-enrichment vendor is required.
No generic B2B enrichment subscription is required.
No separate address-validation vendor is required because Stannp validates UK addresses before send.

The advanced-feature stack is therefore:
- Plota — planning + planning-professional contact layer
- TwentyCI — property/recency intelligence
- OpenAI — AI, RAG and Deep Research
- Supabase — application/data layer
- Stannp — physical mail
- Companies House — corporate context
- Resend — platform/permissioned email
- Stripe — billing

The closed-loop response/QuoteLink layer sits above these providers and should remain MyTradeBox-owned rather than delegated to a data vendor.
