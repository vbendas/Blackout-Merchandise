# MerchFrom Platform — Backend & Agent Plan

> Status: approved 5 Sep 2026; wave 0 built the same day (see §11). Supersedes the Cat-Suite / Merch Studio architecture in the PRD for the artist and admin experience. The public site (website-v3) and the crowdfunding landing are out of scope here.

## 0. Decisions locked in deliberation

| Topic | Decision |
|---|---|
| Interface | One assistant, no persona ("MerchFrom"). One conversation thread + one project card + guided next-action chips. Cat-Suite retired to marketing assets. |
| Backend shape | Agent-first: a typed **tool layer** over the database is the backend; the agent orchestrates; the web chat is the first client, MCP is a later client of the *same* tools. |
| What is not chat | The fan storefront + checkout; admin bulk tables (production queue, supplier orders). |
| Service paths | **A. Merch shop (POD):** artist publishes designs on our blanks at `merchfrom.com/[slug]` or a custom domain; fans buy; we print and ship to the fan; Stripe splits at sale time. **B. Bulk order:** artist orders a run (from shop products or new artwork) shipped to their address. |
| Money | Stripe Connect **destination charges**: fan pays MerchFrom; `application_fee` = base cost (+ shipping); remainder lands in the artist's Express account at charge time; Stripe pays out on schedule. MerchFrom is merchant of record. |
| Stripe onboarding | Hard gate: a shop cannot publish until the artist's Express account is `charges_enabled` + `payouts_enabled`. |
| Tax | Stripe platform account is the **Spanish entity**; Stripe Tax, origin Barcelona, EU OSS. MerchFrom invoices the fan; artist margin is artist income. |
| Shipping | Paid by the fan, flat zone table for MVP; carrier-rate integration later. Kept by MerchFrom. |
| Base cost | `base_costs` table: garment cost + print service cost + margin = total. Artists see only the total. Seeded with **placeholder numbers** until Victor supplies the real cost sheet (admin edits via `set_base_cost`). |
| Checkout | Stripe hosted Checkout (Apple/Google Pay included). |
| Design intake | Five artist situations, all in chat: print-ready file; file needing cleanup (remove bg, upscale); file needing edits; logo only → composition with a generated design; from scratch (Nano Banana 2 via fal, Style Capsules). |
| Model | Claude via Anthropic SDK with tool calling (Sonnet 5 for the loop, Opus 5 for design and pricing reasoning). MiniMax / Mistral / OpenRouter code dropped. |
| Notifications | Email (Resend) + Discord bot DM (opt-in pre-checked at registration, removable). |
| Voice | ElevenLabs: push-to-talk STT (Scribe) and full conversation mode (Conversational AI over WebRTC) — both in MVP. Our agent stays the brain (see §7). |
| Accounts | Solo artists only. Teams post-MVP. |
| Codebase | New `platform/` app, from scratch, `/app` kept as reference only. Shared `/src/db` (schema extended, not rewritten). |

## 1. Architecture

```
                   ┌──────────────────────────────────────────────────────────┐
 clients           │ web chat (artist / admin)   fan storefront   voice (11L) │  later: MCP server
                   └───────────────┬──────────────────┬──────────────┬────────┘
                                   │ SSE               │ SSR/RSC      │ webhook tools
                   ┌───────────────▼──────────────────────────────────▼────────┐
 agent runtime     │ /api/agent  — Claude tool loop, streaming, generative UI, │
                   │ role-scoped tool registry, confirm gates, audit           │
                   └───────────────┬───────────────────────────────────────────┘
                                   │ plain function calls (same process)
                   ┌───────────────▼───────────────────────────────────────────┐
 domain services   │ stores · designs · products · quotes · orders · proofs ·   │
 (deterministic)   │ production · supplier · payouts · notifications · admin    │
                   └───────────────┬───────────────────────────────────────────┘
                                   │ Drizzle
                   ┌───────────────▼───────────────────────────────────────────┐
 infrastructure    │ Neon (EU) · Stripe (Connect, Checkout, Tax) · Cloudinary  │
                   │ fal (NB2) · Resend · Discord · ElevenLabs · Upstash · Clerk│
                   └───────────────────────────────────────────────────────────┘
```

Rules that keep this honest:

- **Services are the only writers.** Tools call services; API routes (webhooks, storefront) call services. No SQL in tools or routes.
- **State machines, not vibes.** Order, proof, production and supplier-order statuses move only through service functions with explicit transitions. The model never sets a status directly.
- **Confirm gates.** Any tool flagged `confirm: true` (publish, approve proof, place bulk order, refund, supplier order, waitlist approval) does not execute on the model's say-so; it returns a card and executes only when the human clicks. Idempotency keys on every write tool.
- **Untrusted text is marked.** Product descriptions, fan messages, ticket bodies are wrapped as data when fed to the model, never as instructions.

## 2. Repository layout

```
/platform                 Next.js 16 app (npm), Vercel region fra1
  app/
    (auth)/sign-in, register/          Clerk + post-waitlist registration
    (chat)/page.tsx                    artist + admin conversation (same page, role decides tools)
    (chat)/admin/production, /supplier tables (admin only)
    [slug]/                            fan storefront: shop, product, cart
    api/agent/route.ts                 SSE agent loop
    api/agent/confirm/route.ts         executes a confirm-gated tool call
    api/voice/*                        ElevenLabs session tokens, custom-LLM bridge
    api/stripe/*                       checkout session, connect onboarding, webhooks
    api/webhooks/clerk, /discord
    api/uploads/sign                   Cloudinary signed uploads
  lib/agent/                           runtime: loop, registry, system prompt, memory, ui protocol
  lib/tools/                           one file per tool group, each exports Tool[]
  lib/services/                        domain services (pure TS over Drizzle)
  lib/ui-cards/                        card schemas (zod) shared by agent + React
  components/chat/, components/cards/, components/storefront/
  middleware.ts                        Clerk + custom-domain host → /[slug] rewrite
/src/db                               shared schema + migrations (extended, see §3)
/scripts/seed-blanks.ts               seeds blanks, colours, sizes, size guides from website-v3 data
```

## 3. Data model (deltas to `/src/db/schema.ts`)

Keep: `users`, `artistStores`, `shopCustomizations`, `orders`, `orderItems`, `consents`, `dataSubjectRequests`, `waitlist`, `supplierOrders`, `supplierOrderItems`, `processedWebhookEvents`, `supportTickets`, `ticketMessages`, `appSettings`, `catalogProducts` / `productVariants` / `colors` / `sizes` (the blank catalog).

Drop or ignore: `productBlanks` (superseded by `catalogProducts`), `chatSessions` (replaced), `staff` / `agentStaffAssignments` (no human-handoff routing in MVP; admin *is* the human).

New / changed:

```
base_costs            id, catalog_product_id, print_service_id, garment_cost_cents,
                      print_cost_cents, margin_cents, total_cents (generated), qty_from
                      (quantity break, 1 for POD), currency, valid_from, valid_to
print_services        id, code ('screen_1c','screen_2c','dtg','embroidery'), name, max_colours,
                      positions[], setup_cents (bulk), notes
designs               id, store_id, source ('upload'|'generated'|'edited'), original_url,
                      print_url (cleaned/upscaled), preview_url, width_px, height_px, dpi_at_print,
                      has_alpha, readiness ('ready'|'needs_cleanup'|'blocked'), readiness_notes,
                      parent_design_id, generation_params jsonb, created_at
products (change)     + design_id, catalog_product_id, print_service_id, placement jsonb
                      (position, width_cm, offset), base_cost_cents (snapshot),
                      retail_price_cents, status ('draft'|'proof_pending'|'live'|'archived'),
                      collection_id, sort_order
product_colours       product_id, colour_code, mockup_url          (enabled colourways)
product_sizes         product_id, size_code
collections           id, store_id, name, slug, sort_order, is_visible
proofs                id, product_id | bulk_order_id, version, mockup_urls[], spec jsonb,
                      status ('pending'|'approved'|'changes_requested'), approved_at, approved_by
orders (change)       order_type enum → ('pod'|'bulk'); + store_id (already), fan_email,
                      shipping_cents, tax_cents, application_fee_cents, transfer_cents,
                      stripe_checkout_session_id, stripe_transfer_id, production_status
                      ('queued'|'printing'|'packed'|'shipped'|'delivered'), tracking jsonb
bulk_orders           id, store_id, quote jsonb (lines, qty breaks, unit cost, total), status
                      ('quoted'|'proof_pending'|'awaiting_payment'|'paid'|'in_production'|
                      'shipped'|'delivered'|'cancelled'), ship_to jsonb, order_id (after payment)
payout_ledger         id, order_id, store_id, stripe_charge_id, stripe_transfer_id, gross_cents,
                      fee_cents (our base cost), transfer_cents, stripe_fee_cents, status,
                      anomaly_flags text[], reviewed_at
stripe_accounts       store_id, account_id, charges_enabled, payouts_enabled, requirements jsonb,
                      last_synced_at
custom_domains        id, store_id, hostname, status ('pending'|'verifying'|'active'|'error'),
                      vercel_domain_id, verification jsonb, created_at
conversations         id, user_id, role_at_time ('artist'|'admin'), title, summary text,
                      last_message_at
messages              id, conversation_id, role ('user'|'assistant'|'tool'), content jsonb
                      (Anthropic content blocks incl. tool_use/tool_result + ui cards), tokens
tool_invocations      id, message_id, tool_name, input jsonb, output jsonb, confirmed_by,
                      confirmed_at, idempotency_key, duration_ms, error
notifications         id, user_id, channel ('email'|'discord'|'inapp'), event, payload jsonb,
                      status, sent_at
notification_prefs    user_id, discord_dm bool (default true), discord_user_id, email bool
project_cards         id, conversation_id, kind ('product'|'bulk_order'|'onboarding'), ref_id,
                      state jsonb   — the persistent right-hand card
users (change)        role enum ('artist'|'admin'); discord_user_id
artist_stores(change) + is_published, published_at, accent_colour, logo_url, banner_url,
                        about, socials jsonb, currency 'EUR', locale
shipping_zones        id, name, countries text[], flat_cents, free_over_cents
```

Seed data: 122 blanks, 93 colourways, size guides, print techniques and colour names come straight from `website-v3/lib/*` via `scripts/seed-blanks.ts`. Base costs are seeded from your cost sheet (garment + print + margin per blank × print service × qty break).

## 4. Tool layer

Each tool: `{ name, description, input: zod, scope: 'artist'|'admin'|'both', confirm?: boolean, readOnly?: boolean, run(ctx, input) → { result, ui?: Card[] , next?: Chip[] } }`. The registry filters by the caller's role. The same registry is what the MCP server will expose later.

**Discovery / catalog** (both, read-only): `list_blanks(type?, fit?, colour?, q?)`, `get_blank(code)` (specs, colours, size guide, print services), `get_size_guide(code)`, `get_print_services(code)`.

**Store**: `get_my_store`, `update_store(name, slug, accent, logo, banner, about, socials)`, `start_stripe_onboarding` → onboarding link card, `get_payout_status`, `add_custom_domain(hostname)` → DNS instructions card, `publish_store` *(confirm; blocked until Stripe + ≥1 live product)*, `unpublish_store` *(confirm)*.

**Design**: `upload_design` → signed upload card, `analyze_design(design_id)` (vision + metadata: px, DPI at requested width, alpha, background, text legibility) → readiness, `clean_design(design_id, ops: remove_bg | upscale | trim)`, `edit_design(design_id, instruction)` (NB2 edit), `compose_design(logo_design_id, brief, style_capsule?)`, `generate_design(brief, style_capsule?, references?)`, `list_style_capsules`. All generation tools return a mockup-grid card with *Use this · Variations · Edit* actions.

**Product**: `create_product(design_id, blank_code, print_service, placement, colours, sizes, name)` → draft + mockups, `update_product`, `render_mockups(product_id)`, `set_price(product_id, retail_cents)` → margin shown, `get_quote(product_id | spec, qty)` → base cost (total only), `submit_proof(product_id)` → proof card, `approve_proof(proof_id)` *(confirm)*, `request_proof_changes(proof_id, notes)`, `publish_product` *(confirm)*, `archive_product`, `create_collection`, `assign_to_collection`.

**Bulk**: `create_bulk_quote(lines[], ship_to)`, `submit_bulk_proof`, `approve_bulk_proof` *(confirm)*, `pay_bulk_order` → Checkout link card, `get_bulk_order(id)`.

**Orders / inbox** (artist): `list_orders(status?, since?)`, `get_order(id)`, `get_sales_summary(period)`, `get_inbox`, `mark_read`, `contact_support(message)`.

**Admin** (admin only): `admin_queue` (everything waiting on you), `list_waitlist(status)`, `approve_waitlist(id)` *(confirm)* / `reject_waitlist`, `list_production(status)`, `advance_production(order_id, to)` *(confirm for 'shipped')*, `set_tracking(order_id, carrier, code)`, `draft_supplier_order(order_ids[])`, `place_supplier_order(id)` *(confirm)*, `receive_supplier_order`, `list_payout_anomalies`, `review_payout(id, verdict)`, `refund_order(id, amount, reason)` *(confirm)*, `set_base_cost(...)` *(confirm)*, `update_shipping_zone`, `reply_ticket`, `resolve_ticket`, `broadcast(message, audience)` *(confirm)*.

**Account / GDPR** (both): `get_my_data_export`, `request_deletion` *(confirm)*, `update_notification_prefs`.

About 60 tools. Each is a thin wrapper over a service function so the storefront, webhooks and admin tables call the same code.

## 5. Agent runtime

- **Loop**: `POST /api/agent` (SSE). Load conversation (last N messages + rolling summary), build system prompt (role, store snapshot, project card state, catalogue of chips), call Claude with the role-scoped tools, stream text deltas, execute non-confirm tools server-side inside the loop, persist every block, stop at end-of-turn or at a confirm-gated tool (card is emitted, turn ends; `POST /api/agent/confirm` resumes with the tool result).
- **Models**: Sonnet 5 default. Opus 5 for `compose_design`, `generate_design` briefs, `get_quote` explanations and any turn where the artist asks for creative direction (routed by a tiny classifier in the system prompt, not a second model call).
- **Memory**: per-conversation summary refreshed every ~20 messages; per-store facts (brand, palette, tone, past choices) in `artist_stores.memory jsonb`, written by a `remember(fact)` tool the model can call.
- **Generative UI protocol**: tool results carry `ui: Card[]` and `next: Chip[]`. Card kinds (zod in `lib/ui-cards`): `onboarding_checklist`, `blank`, `blank_grid`, `design`, `mockup_grid`, `product`, `quote`, `proof`, `order`, `orders_table`, `stripe_onboarding`, `domain_setup`, `bulk_quote`, `admin_queue`, `production_row`, `supplier_order`, `payout_anomaly`, `ticket`, `upload`, `confirm`. Cards render inline; any card with `expandable: true` opens in a modal. The React side is a switch over `kind` — the model never emits HTML.
- **Guided chat**: every assistant turn ends with 2–5 chips picked from a fixed catalogue keyed by state (no store → *Name my shop / Browse blanks / Upload artwork*; product drafted → *Price it / Add colours / Send proof*; live → *Add a product / Bulk order / Sales this month*). A persistent *What can I do?* chip opens the full menu card. First login shows the onboarding checklist card; it ticks itself as tools succeed.
- **Project card**: the right-hand panel mirrors `project_cards` for the conversation: current product or bulk order with blank, colours, sizes, print, price, proof status, and its own action buttons. Switching products swaps the card; the thread stays one thread.
- **Guardrails**: confirm gates; per-user rate limit (Upstash); tool input validation (zod) with model-readable errors; write tools require idempotency key; untrusted text wrapped `<data>`; admin tools only when Clerk role = admin; full `tool_invocations` audit; prompt caching on the system prompt + tool defs.

## 6. Commerce flows

**Stripe onboarding (gate)**: `start_stripe_onboarding` creates an Express account (country = artist's), returns an Account Link card. Webhook `account.updated` syncs `stripe_accounts`. `publish_store` refuses until `charges_enabled && payouts_enabled`; the onboarding card reappears with the missing requirements.

**POD sale**: storefront cart → `POST /api/stripe/checkout` creates a hosted Checkout Session in `payment` mode with `payment_intent_data.application_fee_amount = Σ base_cost + shipping`, `transfer_data.destination = artist account`, `automatic_tax.enabled`, shipping options from `shipping_zones`, metadata `{store_id, order_id}`. Webhook `checkout.session.completed` → `orders.status = paid`, `production_status = queued`, `payout_ledger` row, notifications (artist: sale; admin: queue). `charge.refunded` → reverse transfer, ledger update. Anomaly rules on the ledger: transfer ≠ gross − fee − tax; fee < base cost snapshot; refund after ship; account payouts disabled.

**Bulk order**: `create_bulk_quote` prices lines with qty breaks from `base_costs` (+ setup per print service, + shipping zone) → quote card → proof → `pay_bulk_order` creates a Checkout Session with no transfer (100 % MerchFrom) → paid → production queue.

**Tax**: Stripe Tax with origin address Barcelona; registrations: ES + EU OSS. Tax is computed on the full retail price; the application fee is unaffected. Invoices via Stripe (Checkout invoice creation on) in MerchFrom's name.

**Production**: `orders.production_status` machine `queued → printing → packed → shipped → delivered`; admin advances via chat or the production table; `shipped` requires tracking and triggers the fan + artist notification. Supplier orders group queued items by blank/colour/size for Stanley/Stella.

## 7. Storefront, domains, notifications, voice

**Storefront** (`/[slug]`): SSR, dark, minimal, inherits the v3 design language with the artist's accent, logo, banner, about, socials. Pages: shop (collections), product (colourways, sizes, mockup gallery), cart, checkout hand-off, order status by link. No fan accounts in MVP (email-only, order lookup by token).

**Custom domains**: `add_custom_domain` → Vercel Domains API (`POST /v9/projects/{id}/domains`) → DNS card (CNAME/A + TXT) → verification polling → `active`. `middleware.ts` maps `Host` → store slug via a cached lookup and rewrites to `/[slug]`. Certificates are Vercel-managed.

**Notifications**: events `waitlist.approved`, `stripe.action_required`, `proof.ready`, `sale.new`, `order.shipped`, `bulk.quote_ready`, `payout.paid`, `admin.queue_item`. Channels: Resend templates (React Email) and a Discord bot (application with `dm` scope; the registration form shows a pre-checked "Discord DMs" box and a *Connect Discord* button that links the user via OAuth). Unsubscribe from either in `update_notification_prefs` or via the email footer.

**Voice**: (1) push-to-talk: browser records → `POST /api/voice/transcribe` → ElevenLabs Scribe → text lands in the input box. (2) conversation mode: an ElevenLabs Conversational AI agent with **Custom LLM** pointed at `POST /api/voice/llm` — an OpenAI-compatible bridge that runs *our* agent loop (same tools, same memory), so there is one brain and voice is just another client; confirm-gated tools speak the confirmation and show the card on screen. Session tokens minted server-side; conversation persisted to the same thread.

**Registration after waitlist approval**: approval email with a signed link → Clerk sign-up → registration step (display name, shop name/slug, country, Discord DMs [x], terms/privacy consent recorded in `consents`) → lands in chat with the onboarding checklist.

## 8. Security, privacy, ops

- Neon in EU (Frankfurt), Vercel `fra1`, Cloudinary EU-pinned folder, ElevenLabs/Anthropic with data-processing terms noted in the privacy policy.
- Clerk roles: `artist`, `admin`. Admin tools double-check the Clerk claim server-side.
- Secrets only in Vercel env; `verify.sh` secret scan kept; no `.env` in repo.
- GDPR: existing `consents`, `dataSubjectRequests` reused; export/delete tools; conversation retention 24 months; design files owned by the artist and deletable.
- Observability: structured logs per tool invocation, Sentry, a daily admin digest (queue, anomalies, failed webhooks).
- Tests: services unit-tested (pricing, state machines, Stripe amount maths), agent golden conversations (recorded tool sequences for the five design scenarios and both purchase paths), Playwright e2e for storefront checkout in Stripe test mode.

## 9. Build order

Waves are sized for Sonnet subagents with disjoint file ownership; each wave ends with something demoable for the crowdfunding video.

| Wave | Scope | Demoable |
|---|---|---|
| **0 Foundations** (1 wk) | `platform/` app; schema deltas + migrations; seed blanks/colours/size guides; Clerk sign-in + registration; agent loop with streaming, tool registry, card/chip protocol, 6 tools (`get_my_store`, `list_blanks`, `get_blank`, `update_store`, `remember`, `get_inbox`); chat UI with chips + project card + expandable cards; conversation persistence. | Sign in, be greeted with the checklist, browse blanks in chat, name the shop. |
| **1 Design → product** (1.5 wk) | Design tools (upload, analyze, clean, edit, compose, generate via fal/NB2 with Style Capsules); mockup rendering; product tools; base-cost table + `get_quote`; proof cards; collections. | Upload or generate artwork, see it on a hoodie in three colours, price it, approve a proof. |
| **2 Money** (1.5 wk) | Stripe Express onboarding gate; storefront `/[slug]`; **custom domains** (Vercel Domains API + host rewrite); cart; hosted Checkout with destination charges + Tax + shipping zones; webhooks; orders + payout ledger; email notifications. | Publish a shop on the artist's own domain, buy a tee as a fan in test mode, watch the split land on the artist account and the order appear in the artist's chat. |
| **3 Bulk + admin** (1 wk) | Bulk quote/proof/pay; admin queue card; production state machine + table; supplier order drafting + table; payout anomaly rules; waitlist approval flow; support tickets in chat. | Your morning routine from one prompt: approve, start production, draft supplier order. |
| **4 Reach** (1 wk) | Discord bot; voice push-to-talk + conversation mode (custom-LLM bridge); sales summaries. | Artist talks to MerchFrom by voice and gets a Discord DM when a fan buys. |
| **5 Hardening** (1 wk) | GDPR tools; rate limits; golden-conversation tests; e2e checkout; Sentry; admin digest; copy pass; PT/ES/EN UI strings for chat chrome. | Pre-launch checklist green. |

Total ≈ 7 weeks of build with parallel agents; wave 2 is the earliest point the crowdfunding video can show the full loop.

## 10. Risks and open items

- **Stripe Express availability** per artist country (fine for EU/UK; check others at registration and block with a clear message).
- **Stripe Tax + Connect**: tax is calculated on the platform charge; confirm invoice numbering and OSS reporting export with your accountant before launch.
- **NB2 quality on logos/type**: composition with an artist's logo is the hardest of the five scenarios; keep a "send to a human designer" fallback tool (`request_design_help`) from day one.
- **ElevenLabs custom-LLM latency**: tool calls inside a voice turn must stay under ~1.5 s or be spoken as "one moment"; design generation is never awaited in voice mode (card appears, voice continues).
- **Custom domains at MVP** add support load (DNS); the card must be idiot-proof and the admin queue must show stuck verifications.
- **Cost sheet**: base costs are placeholders until the real garment/print/margin numbers arrive; the crowdfunding video must not be recorded on placeholder prices.
- Pre-existing lint debt in `/app` is irrelevant to `platform/`; new app starts with a clean `verify` script.

## 11. Status log

- **5 Sep 2026 — Wave 0 built.** `platform/` app scaffolded (Next 16, npm, port 3006). Schema rewritten and migrated into a new empty database `merchfrom_platform` (the original Neon database is shared with an unrelated project and was left untouched). Seeded 122 blanks, 94 colours, 1,382 colourways, 122 size guides, 5 print services, 1,708 placeholder base-cost rows, 5 shipping zones. Agent runtime (Claude streaming tool loop, confirm gates, audit, prompt caching), 8 tools, chat UI with cards/chips/project rail, Clerk auth + registration. Verified in the browser end to end with the scripted mock model. Blocked on credentials: real Clerk keys (the ones in `/app/.env.local` are placeholders) and an `ANTHROPIC_API_KEY`. Until then `AUTH_DEV_BYPASS=1` (dev-only, refuses to run in production) and `AGENT_MOCK=1` are set in `platform/.env.local`.
- **6 Sep 2026 — Chat UI rebuilt on Vercel AI Elements** (shadcn 4.21 + ai-elements 1.9, `motion`, `streamdown`) to the approved mock (artifact "MerchFrom Chat"): centred composer with attach / mic / voice-dialog, quick-action pills keyed by shop state, suggestion autocomplete (`GET /api/agent/suggest`, curated templates + live blank/colour names, area-tagged), onboarding progress row, composer docks to the bottom on the first message, project pill in the top bar replaces the right rail. History payload now carries greeting / quickActions / checklist / projectPill (`lib/agent/guidance.ts`). Mic and voice buttons are present but inert until wave 4.
- **6 Sep 2026 — Wave 1 built (design → product).** Storage on fal; `POST /api/uploads` with readiness analysis (sharp metadata, dpi at 28 cm, alpha/background heuristics, Claude vision when a key exists); cleanup (remove-bg, upscale), edit, logo composition and generation on Nano Banana 2; 8 Style Capsules (no reference images yet). Mockups composited onto real packshots per colourway with calibrated print areas (pocket-aware on hoodies). Products, quotes (totals only, qty breaks), proofs with confirm-gated approval, collections; publish fails closed until Stripe is connected. Chat: uploads via picker/drag/paste, design / mockup grid / product / quote / proof / upload cards, product pill + panel. Verified end to end in the browser on the scripted mock.
- **6 Sep 2026 — Wave 2 built (money), with custom domains pulled forward.** Stripe Connect Express onboarding gate (mock gateway until the Spanish account's test keys exist; real gateway wired), hosted Checkout with destination charges — application fee = Σ base cost + shipping, explicit transfer amount so Stripe Tax stays on the platform — webhooks (session completed, account updated, charge refunded) with idempotency, orders + payout ledger with anomaly flags, shipping zones. Fan storefront at `/[slug]` (shop, product, cart, order status), cache revalidated on publish/price changes. Custom domains through the Vercel Domains API (mock until a token exists) with host → slug rewrite in the proxy. Notifications: in-app inbox, email via Resend with a local outbox fallback, Discord rows queued for wave 4. Chat cards: Stripe onboarding, domain setup, order, orders table, sales summary. Verified end to end: artist connects payouts → proof → publish → fan buys via mock checkout → order page → artist sees the order, sales and inbox.
