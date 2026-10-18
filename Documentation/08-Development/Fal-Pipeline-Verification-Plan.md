> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

# Implementation Plan: fal.ai Pipeline Verification & Upgrades

> **Created**: August 24, 2026
> **Source**: Image-Generation-Architecture.md v1.1, Section 11 (Aug 2026 review open actions)
> **Executor**: Claude Sonnet session — follow this plan phase by phase, in order
> **Owner**: Victor Bendas

---

> **STATUS: COMPLETED + SUPERSEDED — August 24, 2026**
>
> All three phases below were executed the same day this plan was written. Phase 1 (endpoint sweep) found that two of the six endpoint IDs in `FAL_ENDPOINTS` were fabricated/nonexistent; the sweep corrected the IDs and prices to what's actually live on fal.ai. Phase 2 (LoRA-aware edit prototype) was built and run; the result was **not adopted** — the observed quality degradation across edit rounds turned out to be chaining noise inherent to repeated edit calls, not style drift that a LoRA-aware edit path would fix. Phase 3 (BFL klein warm-standby) was **ruled out** — the fal-trained LoRA artifact and BFL klein's finetune requirements are architecturally incompatible, so the fallback upgrade in ADR-001 does not work as proposed. Two LoRA training runs executed during this work (2 x $6.40): one on the original aged-paper-background images, one on the white-background cutouts.
>
> Later the same day, a full strategy pivot away from custom-trained style LoRAs superseded this entire plan: image generation moved to reference-guided generation on off-the-shelf models (primary Nano Banana 2, fallback Seedream 5.0 Pro), with styles reworked as "Style Capsules." The LoRA plan was retired for good; no model training is planned. See `Documentation/05-Shared/Image-Generation-Architecture.md` v2.0 for the current architecture. The plan below is kept intact as a historical record and should not be executed further.

---

## Context (read this first)

The August 2026 provider-docs review of `Documentation/05-Shared/Image-Generation-Architecture.md` confirmed the architecture (FLUX.2 Dev + `flux-2-trainer` + LoRA inference on fal.ai) but surfaced three follow-up tasks. This plan turns them into executable phases.

**Current state of the code — verified Aug 24, 2026:**

- `app/src/lib/ai/falClient.ts` is a **stub**: `falClient` is `null`, `generateDesign`/`editDesign`/`upscaleDesign` all throw. `@fal-ai/client` is **not installed**. Nothing live calls fal.ai yet, so endpoint renames here are zero-risk.
- `FAL_ENDPOINTS` in that file is the only place endpoint IDs live in code. The only other reference is a comment in `app/src/lib/ai/studioFlow.ts:83`.
- `FAL_API_KEY` is **not present** in `app/.env.local`. Phases 2 and 3 cannot run API calls until Victor provides it. Phase 1 needs no key.
- No LoRAs have been trained yet. The 6-style catalog in `LORA_STYLES` (falClient.ts) is metadata only.

**Ground rules for the executing session:**

1. Work on a feature branch off `main` (e.g. `feat/fal-endpoint-sweep`). Do not commit to `main` directly.
2. After any code change in `/app`: `cd app && bun run verify` (pre-commit hook enforces this; a verify failure blocks commit).
3. Never print or commit API keys. `FAL_API_KEY` goes in `app/.env.local` only (Victor adds it himself, or you add it from a value he pastes — never echo it back).
4. When a phase changes endpoint names or pricing, update **code and `Documentation/05-Shared/Image-Generation-Architecture.md` in the same commit** — the doc explicitly warns they must move together (see the note under its Section 9).
5. After completing each phase, update the Status column in Section 11 of Image-Generation-Architecture.md (`Open` → `Done <date>` or `Blocked: <reason>`), and append a line to `Documentation/DEVLOG.md`.
6. Do not restructure the pipeline, add vendors, or change ADR decisions. This plan is verification + prototype only. If you find something that contradicts the architecture doc, stop and report to Victor instead of improvising.

---

## Phase 1 — Endpoint Sweep (no API key needed, ~30 min)

**Goal**: Make `FAL_ENDPOINTS` match fal's live model IDs so the Day 10/12 wiring sprints don't build on dead routes.

### Steps

1. **Verify each endpoint against fal's live docs** (WebFetch/WebSearch on `fal.ai/models/...` pages). For each of the six IDs in `FAL_ENDPOINTS`, confirm the exact current model ID and per-unit price:

   | Constant | Doc'd (old) | Expected current (per Aug 2026 review — verify, do not assume) |
   |---|---|---|
   | `TRAIN_LORA` | `fal-ai/flux-2-trainer` | likely unchanged ($0.008/step) |
   | `GENERATE_WITH_LORA` | `fal-ai/flux-2-dev/lora` | `fal-ai/flux-2/lora` |
   | `KONTEXT` | `fal-ai/flux-2-kontext` | FLUX.1-era branding — find current FLUX.2 edit path (`fal-ai/flux-2/lora/edit` and/or a non-LoRA FLUX.2 edit endpoint) |
   | `KONTEXT_MAX` | `fal-ai/flux-2-kontext/max` | same question as above |
   | `UPSCALER` | `fal-ai/flux-2-upscaler` | verify |
   | `REMOVE_BACKGROUND` | `fal-ai/ideogram/remove-background` | verify price (~$0.02) — cost model is sensitive to this |

2. **Record findings** in a table (old ID → live ID → price → source URL) — this table goes into the PR description and the doc update.

3. **Update `app/src/lib/ai/falClient.ts`**:
   - Replace stale IDs in `FAL_ENDPOINTS`; keep constant names (`KONTEXT`, `KONTEXT_MAX`) unless the model split (fast vs. max tier) no longer exists — if fal no longer offers a two-tier edit model, replace the pair with one `EDIT` constant and simplify `selectKontextModel()` accordingly, noting this for Victor.
   - Add an `EDIT_WITH_LORA: 'fal-ai/flux-2/lora/edit'` constant (verified ID) with a comment `// LoRA-aware editing — Phase 2 prototype, see Fal-Pipeline-Verification-Plan.md`.
   - Update `calculateDesignCostCents()` only if verified prices differ from the hardcoded cents values.
   - Update the file's header comment block (it lists the old endpoint names).

4. **Update `Documentation/05-Shared/Image-Generation-Architecture.md`** in the same commit:
   - Section 2 table: replace "verify" hedges with confirmed IDs/prices; delete the "Endpoint drift" warning callout (it's resolved).
   - Section 9: update the `FAL_ENDPOINTS` code block to mirror the new file; delete the "do not update either until the sweep confirms" note.
   - Section 11: action 1 status → `Done`.
   - Revision history: add a v1.2 row.

5. **Verify & commit**: `cd app && bun run verify`, then commit as `fix(ai): sweep FAL_ENDPOINTS against live fal.ai model IDs`.

### Acceptance criteria

- Every ID in `FAL_ENDPOINTS` matches a live fal.ai model page (source URLs recorded).
- Doc Section 2/9 and code agree exactly.
- `bun run verify` passes.

---

## Phase 2 — LoRA-Aware Edit Prototype (needs FAL_API_KEY + budget, ~half day)

**Goal**: Measure whether running the edit loop on `fal-ai/flux-2/lora/edit` (style LoRA kept active) degrades less over 6+ rounds than the current Kontext-only flow. Decision input for replacing the edit path and possibly relaxing ADR-004's branching pressure.

### Preconditions — stop and ask Victor if missing

- `FAL_API_KEY` present in `app/.env.local`.
- Budget approval: expect **under $15 total** — ~$8 if a test LoRA must be trained + ~$2-4 of generation/edit calls. Confirm with Victor before the first paid call.
- A style LoRA to test with. Preference order: (a) an already-trained Blackout Merchandise LoRA if one exists by then, (b) train `american-traditional-v1` for ~$8 using 20-30 reference images Victor provides, (c) a public FLUX.2 LoRA from fal's gallery as a stand-in (zero training cost; acceptable for the degradation comparison, note the substitution in the report).

### Steps

1. `cd app && bun add @fal-ai/client` (this also unblocks the Day 10 sprint TODO in falClient.ts).
2. Write a standalone script `app/scripts/prototype-lora-edit.ts` (runnable via `bun run scripts/prototype-lora-edit.ts`). It must:
   - Generate one base image with the LoRA active (`GENERATE_WITH_LORA`, fixed seed, prompt like `"american traditional skull with roses, t-shirt design, centered"`).
   - Run the **same fixed sequence of 6 edit instructions** down two arms:
     - **Arm A (current design)**: edit endpoint without LoRA (whatever Phase 1 confirmed as the Kontext successor).
     - **Arm B (candidate)**: `EDIT_WITH_LORA` with the same style LoRA and weight 1.0 on every round.
   - Suggested instruction sequence (keep identical across arms): 1 "make the linework bolder", 2 "add a banner below the skull", 3 "shift palette toward red and black only", 4 "make the roses larger", 5 "add small stars in the background", 6 "make the overall composition darker".
   - Save every intermediate to `app/scripts/prototype-output/` as `armA-round<N>.png` / `armB-round<N>.png` (add this dir to `.gitignore`), and write `results.json` with per-round: endpoint, cost, latency, image URL.
3. Run both arms. Total: 1 generation + 12 edits.
4. **Evaluate**: build a side-by-side contact sheet (rounds 1-6 per arm) and assess: line crispness, style retention vs. round 1, artifact accumulation. This is a visual judgment — present the contact sheet to Victor for the final call; include your own read (which arm held style longer, at which round each arm visibly degraded).
5. **Report**: write `Documentation/08-Development/ADRs/` findings — if Arm B wins, draft **ADR-006: LoRA-aware editing replaces Kontext-only edit loop** (status: Proposed, for Victor to accept), covering the new per-design cost (recompute the Section 7 table with ~$0.021/MP edit pricing at the actual resolutions used) and the change to `selectKontextModel()`/auto-escalation. If Arm A wins or it's a wash, record that in Section 11 (action 2 → `Done — not adopted`) and stop.
6. Do **not** rewire the production edit path in this phase, even if Arm B wins — adoption is a separate task after Victor accepts the ADR.
7. Update Section 11 status + DEVLOG. Commit script and report: `feat(ai): prototype LoRA-aware edit loop vs Kontext-only`.

### Acceptance criteria

- Both arms completed with identical instruction sequences and recorded costs.
- Contact sheet + results.json + written recommendation delivered to Victor.
- No production code paths changed.

---

## Phase 3 — BFL Warm-Standby Compatibility Check (research-first, ~2 hrs)

**Goal**: Confirm the ADR-001 fallback upgrade is real: fal-trained `.safetensors` LoRAs can be uploaded to BFL's Dashboard and served via FLUX.2 klein with a `finetune_id`.

### Steps

1. **Research (no account needed)**: via BFL's current docs (docs.bfl.ai), confirm:
   - FLUX.2 klein LoRA inference status (was public beta in Aug 2026) and which klein size (4B/9B) serves external LoRAs.
   - Accepted upload format: file type, rank/alpha constraints, base-model compatibility requirements (a LoRA trained against FLUX.2 **dev** must be confirmed loadable on **klein** — this is the crux; if BFL requires klein-trained adapters, the warm-standby idea fails).
   - Pricing per generation on klein with a finetune.
2. **Get the fal side**: from fal's `flux-2-trainer` docs, confirm the trainer's output artifact (`.safetensors` download availability, rank used at default settings).
3. **Verdict paths**:
   - **Compatible on paper** → if a trained LoRA exists (from Phase 2), and Victor has/creates a BFL account, do one real upload + one test generation as proof. Otherwise mark `Done (paper-verified, live test pending BFL account)`.
   - **Incompatible** → update ADR-001's mitigation in Image-Generation-Architecture.md back to a plain-generation fallback, with a dated note explaining why the klein route failed.
4. **If compatible**: add to the architecture doc (ADR-001 section) a short "Warm standby runbook": upload the 6 catalog LoRAs on each (re)train, quarterly smoke test (one generation per style via BFL), and where the `finetune_id`s are recorded (suggest: new column on the planned `lora_styles` table — schema change is Victor's call, propose only).
5. Update Section 11 (action 3) + DEVLOG. Commit: `docs: verify BFL klein warm-standby compatibility (ADR-001)`.

### Acceptance criteria

- A definitive yes/no on fal-trainer → BFL klein compatibility, with doc sources cited.
- ADR-001 mitigation text matches the finding.
- No BFL account creation or spend without Victor's go-ahead.

---

## Phase 4 — Close-out (~15 min)

1. Confirm Section 11 of Image-Generation-Architecture.md shows final status for actions 1-3 (action 4, monthly cost review, stays open — it's a recurring process, not a task).
2. Bump Image-Generation-Architecture.md version + revision history to reflect all changes made.
3. Summarize the whole run in `Documentation/DEVLOG.md` (one dated entry).
4. Open a PR to `main` titled `fal.ai pipeline verification: endpoint sweep, LoRA-edit prototype, BFL fallback check` with the Phase 1 findings table and the Phase 2 recommendation in the body.

---

## Blockers summary (things only Victor can provide)

| Blocker | Needed for | Ask |
|---|---|---|
| `FAL_API_KEY` | Phase 2, Phase 3 live test | Add to `app/.env.local` |
| Budget OK (~$15) | Phase 2 | Confirm before first paid call |
| Reference images (20-30) | Phase 2 option (b) LoRA training | Or approve public-LoRA stand-in |
| BFL account | Phase 3 live test | Paper verification proceeds without it |

Phase 1 has **zero blockers** — start there.
