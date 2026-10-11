# Merch Studio: UI/UX Optimisation and Implementation Plan

> Created: 11 October 2026
> App: `platform/` (Next.js 16, React 19), route `/studio`
> Visual identity: the website door (`mainpage/index.html`): black `#000`, white ink at alpha (50% secondary, 16% hairlines), Inter, IBM Plex Mono for small tags, 2px corners, uppercase tracked labels, underlined text links. Tokens live in `platform/app/globals.css` and `platform/components/chat/tokens.css`.

---

## Part A: UI/UX optimisation plan

The audience is artists, bands, labels and creators buying premium merch. Every word and state on screen should read like a premium studio, never like a developer tool.

### A1. Voice and copy
| Problem | Fix |
|---|---|
| Greeting says "What are we making, Dev?" (dev-bypass user is "Dev Artist") | Dev user gets a realistic artist name (`AUTH_DEV_NAME`, default "Nova Halo"); the internal word "Dev" never renders in the UI |
| Raw enums on screen ("AWAITING_PAYMENT") | One `humanStatus()` helper maps every status to plain words ("Awaiting payment") |
| Composer placeholder "Message MerchFrom..." | "Describe a piece, a drop or a run" (from the Studio mock) |
| Rail of icon shortcuts that only fire prompts ("Shop", "Inbox"...) felt arbitrary | Replaced by a session history sidebar (B3) |

### A2. Navigation and information architecture
- Left sidebar = the artist's work, not app features: **New session**, **Collections** (each holding its sessions), **Sessions** (ungrouped, most recent first), and an **account footer**.
- Each session has its own URL (`/studio/s/<id>`), so back/forward, refresh and shared links work. `/studio` is always a fresh home screen.
- Collections are the store's existing merch collections (`collections` table): the same "Summer tour" groups both its products and the sessions about it.
- Settings and Billing are pages inside the Studio shell (`/studio/settings`, `/studio/billing`), reached from the account drop-up.

### A3. Home screen
- Keep: greeting, status line, state-based quick actions, composer, "Continue" line.
- The greeting uses the artist's first name; with no name it falls back to the shop name.

### A4. Feedback and states
- Loading: the shell (sidebar, header) renders immediately; the thread area shows a quiet skeleton instead of a centred spinner.
- `?notice=stripe_ready | stripe_action_required` (set by the Stripe Connect return) is currently ignored. Show a dismissible notice line under the header.
- Errors: inline, plain language, with a retry action; never a stack or code.
- Session rename and collection moves are optimistic, rolled back on failure.

### A5. Cards and thread
- One card header pattern: small uppercase label, then the Inter title, then content. 2px corners, hairline borders, transparent ground.
- Packshots on ecru `#ECE5DA` plates (done for blanks; extend to product/mockup images where the PNG is transparent).
- User messages: hairline box, not a filled grey bubble, to stay in the door's flat language.

### A6. Accessibility
- Visible 1px white focus ring everywhere (`:focus-visible`).
- Sidebar is a `nav` with a labelled list; rename via Enter/F2, Escape cancels; menus are keyboard reachable and close on Escape/outside click.
- Respect `prefers-reduced-motion` (already in tokens).
- Secondary text stays at or above 50% white (about 5.3:1 on black).

### A7. Mobile
- Sidebar becomes an off-canvas drawer opened from a menu button in the header; the composer keeps full width.
- Safe-area insets on the composer and drawer footer.

### A8. Consistency follow-ups (not in this round)
- Clerk sign-in/up screens fully themed (black, Inter, 2px).
- Admin pages (`/admin/*`) moved into the Studio shell.
- Delete/archive session, search across sessions.
- Feed remembered facts (`listFacts`) and the active project into new sessions.

---

## Part B: implementation plan

### Decisions
1. Session groups reuse the store `collections` table. New nullable column `conversations.collection_id` (FK to `collections.id`, `on delete set null`). Admins have no store, so they see sessions without Collections.
2. Session title: `conversations.title`. When null, it is set automatically from the first user message (first 60 characters, trimmed at a word boundary). Rename overwrites it.
3. Session order: `coalesce(last_message_at, created_at)` descending. Empty sessions (no messages) are not listed.
4. Routes: `/studio` (fresh home), `/studio/s/[sessionId]` (open a session), `/studio/settings`, `/studio/billing`. The shell (sidebar) lives in `app/(chat)/studio/layout.tsx` so every Studio page shares it.
5. After the first message of a fresh session, the URL is replaced with `/studio/s/<id>` (`window.history.replaceState`, no remount) and the sidebar list refreshes.

### API contract (shared by WP1 and WP3)
All routes require a signed-in user (`requireUser()` from `@/lib/auth`) and only ever touch that user's own rows. JSON in and out. Errors: `{ error: string }` with 400/404.

```ts
// lib/studio/types.ts (WP1 creates; WP3 imports)
export interface StudioSession {
  id: string;
  title: string;            // never empty: falls back to "Untitled session"
  collectionId: string | null;
  lastActivityAt: string;   // ISO
}
export interface StudioCollection {
  id: string;
  name: string;
  productCount: number;
}
export interface StudioSidebarData {
  collections: StudioCollection[];   // [] for admins / users without a store
  sessions: StudioSession[];         // only sessions with at least one message
}
```

| Method and path | Body | Returns |
|---|---|---|
| `GET /api/studio/sessions` | none | `StudioSidebarData` |
| `PATCH /api/studio/sessions/[id]` | `{ title?: string; collectionId?: string \| null }` | `StudioSession` |
| `POST /api/studio/collections` | `{ name: string }` | `StudioCollection` |
| `PATCH /api/studio/collections/[id]` | `{ name: string }` | `StudioCollection` |
| `DELETE /api/studio/collections/[id]` | none | `{ ok: true }`, or 400 `{ error }` when the collection still has products. Sessions in it become ungrouped. |
| `GET /api/agent/history?conversationId=<id>` | existing | existing (WP3 uses it to open `/studio/s/<id>`) |

Title rules: trimmed, 1 to 80 characters. Collection name: trimmed, 1 to 60 characters; reuse `createCollection` from `lib/services/collections.ts`.

### Work packages and model assignment

| WP | Scope | Model | Wave | Depends on |
|---|---|---|---|---|
| WP1 | Data and API: schema column + migration, session/collection services, auto-title, the five routes above | Sonnet 5.5 | 1 | none |
| WP2 | Copy and identity fixes (A1): dev user name, `humanStatus()`, placeholder, no "Dev" anywhere | Haiku 5.5 | 1 | none |
| WP3 | Studio shell: layout, session sidebar (new session, collections, rename, move, menus), account footer with drop-up, `/studio/s/[id]` routing, mobile drawer, notice line, loading skeleton | Opus 5.5 | 1 | WP1 contract (builds against it in parallel) |
| WP4 | Settings and Billing pages and their API routes | Sonnet 5.5 | 1 | WP3 layout wraps them (content-only pages) |
| WP5 | Integration verification: build, lint, Playwright pass on desktop and phone, fixes | Opus 5.5 (lead) | 2 | WP1-4 |

### File ownership (no two agents edit the same file)
- **WP1:** `src/db/schema.ts` (conversations column + relation only), `platform/drizzle/*` (generated), `platform/lib/services/conversations.ts`, `platform/lib/services/studio-sessions.ts` (new), `platform/lib/studio/types.ts` (new), `platform/app/api/studio/**` (new), `platform/lib/agent/loop.ts` (auto-title hook only, if needed).
- **WP2:** `platform/lib/auth.ts`, `platform/lib/services/users.ts`, `platform/lib/agent/guidance.ts`, `platform/lib/format/status.ts` (new), `platform/components/chat/Composer.tsx` (placeholder only), card components that print raw statuses (`components/cards/*`, status text only), `platform/.env.example` if present.
- **WP3:** `platform/app/(chat)/studio/layout.tsx` (new), `platform/app/(chat)/studio/page.tsx`, `platform/app/(chat)/studio/s/[sessionId]/page.tsx` (new), `platform/components/studio/**` (new: sidebar, account menu, notice, skeleton, sidebar context), `platform/components/chat/ChatShell.tsx`, `platform/components/chat/useConversation.ts`, `platform/components/chat/TopBar.tsx`, `platform/components/chat/EmptyState.tsx`, `platform/components/chat/tokens.css`, delete `platform/components/chat/StudioRail.tsx`.
- **WP4:** `platform/app/(chat)/studio/settings/page.tsx`, `platform/app/(chat)/studio/billing/page.tsx`, `platform/components/studio/settings/**`, `platform/components/studio/billing/**`, `platform/app/api/studio/profile/route.ts`, `platform/lib/services/billing.ts` (new, read-only queries).

### WP3 detail: sidebar behaviour
- Width 272px desktop, fixed left, hairline right border, black ground. Top: wordmark "MERCHFROM" (uppercase label) and a **New session** button (links to `/studio`).
- **Collections** section (hidden when the user has no store): header row with label "COLLECTIONS" and a `+` button that turns into an inline name input (Enter creates, Escape cancels). Each collection row is expandable and lists its sessions; row menu (`...`): Rename, Delete (shows the API error inline when it still has products).
- **Sessions** section: ungrouped sessions, newest first. Active session highlighted (white text, 8% white ground). Row menu (`...`): Rename (inline input), Move to collection (submenu listing collections + "No collection"), plus "New collection..." which creates and moves in one step.
- **Account footer:** avatar (Clerk image, else initials on a hairline square), display name, shop name underneath in 50% white. Click opens a drop-up: Settings, Billing, divider, Sign out (Clerk `signOut`, hidden in dev bypass). Closes on Escape and outside click.
- Data: a client `StudioSidebarProvider` in the layout fetches `GET /api/studio/sessions`, exposes `{ data, refresh, renameSession, moveSession, createCollection, renameCollection, deleteCollection }` with optimistic updates. `ChatShell` calls `refresh()` after a turn ends and after the first message of a fresh session.
- Mobile (below 768px): sidebar hidden; header shows a menu button that opens it as a drawer over a 60% black scrim.

### WP4 detail: Settings and Billing
- **Settings** (`/studio/settings`): Profile (display name, editable; avatar and email shown; "Manage account" opens Clerk's `openUserProfile()`, hidden in dev bypass), Language (select of the locales the app supports, saved to `users.locale`), Notifications (Discord link status from `linkStatus`, connect via `/api/discord/link`, email/DM toggles via `setPrefs`), Shop (name and slug, read-only, with a "Change in Studio" hint).
- **Billing** (`/studio/billing`): Payouts (Stripe Connect status from `getStripeAccountStatus`; "Set up payouts" posts to `/api/stripe/connect` and follows the returned URL), Payout history (last 20 `payout_ledger` rows for the store: date, gross, transfer, status via `humanStatus`), Bulk orders (from `listBulkOrders`: reference, date, total, status). Empty states in plain words.
- Both pages use the shell, a page heading in `mf-display`, sections as hairline-separated blocks with uppercase labels, and the existing `mf-pill` buttons.

### Acceptance criteria
1. No "Dev", raw enum or developer wording visible anywhere in `/studio` (dev bypass included).
2. Sidebar lists real sessions with titles; New session, rename session, create/rename/delete collection and move session all persist across reload.
3. `/studio/s/<id>` opens that session; refreshing keeps it; the first message in a fresh session moves the URL to its `/studio/s/<id>` and the session appears in the sidebar.
4. Account footer shows avatar + name; drop-up opens Settings and Billing pages inside the shell.
5. Phone width (390px): no horizontal scroll, sidebar works as a drawer.
6. `npm run build` passes; `eslint` shows no new errors (the existing `Composer.tsx` refs error is known).

---

## Status (11 October 2026)

| WP | Result |
|---|---|
| WP1 | Done. Migration `platform/drizzle/0002_public_queen_noir.sql` applied by the owner on 11 Oct. Sessions created before auto-titling get a title from their first user message on first listing. |
| WP2 | Done. `DEV_DISPLAY_NAME` in `lib/auth.ts` (also used by `lib/services/voice.ts`), `humanStatus()` in `lib/format/status.ts`. |
| WP3 | Done. Verified against stubbed APIs (desktop + 390px phone). |
| WP4 | Done. Locales en, es, pt, fr, de, it (no list existed before; `components/studio/settings/locales.ts`). Profile PATCH also accepts the notification toggles. |
| WP5 | Build passes; lint has no new errors (pre-existing: `RegisterForm.tsx` links, `AdminQueueCard.tsx` apostrophe, `Composer.tsx` refs). User messages now use a hairline box. Verified against the real backend after the migration: collection create/move/delete, session rename, `/studio/s/<id>`, Settings name save, Billing data, 390px phone. Fixed: Clerk sync no longer overwrites a name edited in Settings (`lib/services/users.ts`). |

Known gaps: notice line shows on chat screens only (not Settings/Billing); collection delete waits for the server (not optimistic) so refusals can show inline; Discord linking returns to `/studio`, not Settings.
