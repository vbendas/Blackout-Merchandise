# Blackout Merchandise

Blackout Merchandise is a merchandise platform for artists and creators. An artist describes a design in a chat with one of three cat "brand ambassador" agents (Leopoldo, Francisca and Antonia), the design is generated through hosted image-generation APIs, and the platform then prepares it for print: colour separations, halftones, films, proofs and job sheets for screen printing, or print-ready files for DTG/DTF. Artists sell the result in their own shop with Stripe checkout, and the production team works the orders from station screens in the print shop.

## Who it is for

- Artists, bands, tattooers and other creators who want to sell merch without handling print preparation themselves.
- The print-shop team that turns approved designs into printed garments (pre-press, production, support).

## Built with

The active code is in `platform/` (the app), `mainpage/` (the public website) and `src/db/` (the shared database schema). Last commit per directory before this README was written: `platform/`, `mainpage/` and `src/` on 2026-10-17; `app/` on 2026-08-24; `merchstation/` and `services/` on 2026-07-11; everything else earlier.

| Area | Stack |
|------|-------|
| App (`platform/`) | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Database | PostgreSQL (Neon in production, PGlite for the local demo), Drizzle ORM |
| Auth | Clerk |
| Payments | Stripe (Checkout and Connect) |
| Agents | Anthropic API via the Anthropic TypeScript SDK (Claude Sonnet by default, Haiku for simple turns) |
| Image generation | fal.ai hosted APIs: Nano Banana 2 (`fal-ai/nano-banana-2`, `/edit`) with style reference images, Ideogram background removal |
| Voice | ElevenLabs |
| Email | Resend |
| Print pipeline | TypeScript engine in `platform/lib/print` (sharp, ag-psd, pdfkit, pdf-lib), a job queue in Postgres and a separate worker process |
| File storage | Cloudflare R2, or local disk with `PRINT_STORAGE_DRIVER=local` |
| Website (`mainpage/`) | Static HTML, CSS and JavaScript, no build step |
| Tests | Node's test runner through `tsx` |

Image generation uses hosted APIs only. The project does not train or fine-tune models.

## Repository layout

| Directory | What it is |
|-----------|------------|
| `platform/` | The main app: artist studio and chat agents, shops and checkout, admin, pre-press, production stations, print worker |
| `mainpage/` | Public website (static pages: door, apply flow, press board, FAQ, agents page, film) |
| `src/` | Shared Drizzle schema and seed data (`src/db/`), used by `platform/` and the legacy `app/` |
| `Documentation/` | Product, architecture, roadmap and development docs; old notes are in `Documentation/99-Archive/` |
| `app/` | Legacy: the first Next.js app (Bun), replaced by `platform/` |
| `merchstation/` | Legacy: terminal UI for catalogue management |
| `services/` | Legacy: Python services (colour separation, mockup generator, print engine), replaced by `platform/lib/print` |
| `drizzle/` | Legacy: migrations for `app/` (the platform has its own in `platform/drizzle/`) |
| `data/` | Pantone colour reference data |
| `plans/` | Legacy: feature plans from May 2026 |
| `openspec/` | Legacy: OpenSpec change proposals for `app/` |
| `scripts/` | Legacy: one-off scripts for `app/` (asset upload, migrations) |
| `python/` | Legacy: early print-processing prototype |
| `Animation/` | Legacy: animation prototype (separate Next.js project) |
| `Workspace/` | Legacy: one-off supplier catalogue extraction scripts |
| `OpenCode/` | Legacy: agent task notes from an earlier tooling setup |

Dot-directories (`.claude/`, `.opencode/`, `.taskmaster/`, `.husky/`) hold editor, agent and git-hook configuration.

## Running the app locally

Requirements: Node.js 20 or newer and npm. Python 3 is only needed to serve the website.

### Option 1: local demo, no external services

The demo builds a local PGlite database with the catalogue, sample shops, designs run through the real print pipeline and production jobs. It does not call Neon, R2, fal or any other service. The build takes a few minutes and a few GB of memory and disk.

```bash
cd platform
npm ci
npm run demo:local            # add "-- --reset" to wipe and rebuild

LOCAL_DB_DIR=.local-demo/db PRINT_STORAGE_DRIVER=local PRINT_STORAGE_DIR=.local-demo/print-storage \
  AUTH_DEV_BYPASS=1 NEXT_PUBLIC_APP_URL=http://localhost:3030 npx next dev --webpack -p 3030
```

Then open http://localhost:3030/dev. Run the build and the dev server one at a time; the local database takes one process at a time.

### Option 2: against a Postgres database

```bash
cd platform
npm ci
cp ../.env.example .env.local   # then fill in the values
npm run db:migrate              # apply platform/drizzle migrations
npm run seed                    # blank catalogue
npm run seed:print              # ink system
npm run dev                     # http://localhost:3000
npm run worker                  # in a second terminal, for print jobs
```

The root `.env.example` covers the shared keys (`DATABASE_URL`, Clerk, Stripe, ElevenLabs, `NEXT_PUBLIC_APP_URL`). The platform also reads `FAL_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ELEVENLABS_AGENT_ID` and the print storage settings (`PRINT_STORAGE_DRIVER=local` with `PRINT_STORAGE_DIR`, or the `R2_*` variables); see `process.env` usage in `platform/lib` and [Platform-Plan.md](./Documentation/Dev/Platform-Plan.md). For local development without Clerk, set `AUTH_DEV_BYPASS=1` (ignored in production).

### Website

```bash
cd mainpage
npm run dev                     # python3 http.server on 127.0.0.1:3000
```

## Tests

```bash
cd platform
npm test                        # unit and integration tests (tsx --test)
npm run lint
npx tsc --noEmit
```

## Status

Solo project under active development. The print-preparation pipeline and production stations are built and waiting on checks against real prints; see [ROADMAP.md](./ROADMAP.md) for what comes next.

More documentation: [CONTRIBUTING.md](./CONTRIBUTING.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [TESTING.md](./TESTING.md), [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) and the [Documentation](./Documentation/) folder.

## License

The code is released under the [MIT License](./LICENSE). Third-party fonts and assets keep their own licences; see [mainpage/LICENCES.md](./mainpage/LICENCES.md).
