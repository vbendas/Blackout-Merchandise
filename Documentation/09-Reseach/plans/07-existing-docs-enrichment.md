# Implementation Plan: Existing Documentation Enrichment

> **Plan ID**: PLAN-07
> **Priority**: MEDIUM
> **Estimated Time**: 2-3 hours
> **Parallelizable**: YES — but be careful with file conflicts (multiple edits to same files)
> **Output Files**: Multiple existing files updated with research data

---

## 1. Overview

### Goal
Update and enrich existing project documentation files by injecting verified market data, competitive intelligence, and consumer insights from the research reports. This is the "connective tissue" plan that ensures research data flows into all existing docs.

### Why
Current docs are internally consistent but externally hollow — they describe what Merch From does without backing it with market evidence. Adding data transforms them from "we believe" to "the data shows."

### Scope
Files to update (in priority order):
1. `Documentation/PRD.md` — Add market context link
2. `Documentation/01-Product/Business-Model.md` — Add market sizing and economics data
3. `Documentation/01-Product/Vision.md` — Add market validation
4. `Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md` — Add urgency data
5. `Documentation/07-Community/04-Crowdfunding-Landing/Overview.md` — Add market justification
6. `Documentation/05-Shared/Design-System.md` — Add consumer psychology notes
7. `Documentation/AGENTS.md` — Update market references

### Acceptance Criteria
- [ ] Each file updated with relevant research data
- [ ] All new data has source citations
- [ ] No contradictions introduced between files
- [ ] Changes are additive (no existing content removed)
- [ ] Cross-references between files are consistent

---

## 2. Source Material

Both research reports are the primary source for all updates.

---

## 3. Task Breakdown

### T1: Update PRD.md (S — 15 min)
**Current state**: Navigation index with no market data.
**Action**: Add a "Market Context" section or link:
- Add link to new Market Analysis doc (PLAN-01 output)
- Add 3-4 key market statistics in the Quick Reference table
- Add "Competitive Landscape" link to Battlecard (PLAN-05 output)

**Specific additions**:
```markdown
| Market Size (Creator Merch, 2025) | $6.8 billion (Dataintelo) |
| POD Market Growth | 23.6% CAGR → $57.5B by 2033 (Grand View Research) |
| EU POD Market | $1.97B → $13.69B by 2033, 24.06% CAGR |
```

**[CRITICAL]** PRD.md is the navigation hub. Only add links and high-level stats — detailed data belongs in sub-documents.

**Files**: `Documentation/PRD.md`

---

### T2: Update Business-Model.md (M — 30 min)
**Read first** to understand current structure.

**Likely additions** (adapt after reading):
- TAM/SAM/SOM section (from research)
- Revenue model comparison (D2C, POD, Retail, Label) with margin data
- Creator economics justification for "zero upfront cost" model
- Comparable company revenue data (Displate, Fourthwall, Printful)
- Market timing argument (Fyul window + marketplace collapse)
- EU beachhead rationale with CAGR data

**[GOTCHA]** Read the full file first to avoid duplicating content. Some market data may already exist.

**Files**: `Documentation/01-Product/Business-Model.md`

---

### T3: Update Vision.md (S — 20 min)
**Read first** to understand current structure.

**Likely additions**:
- Market validation section: "The $13.4B opportunity"
- Consumer demand evidence: streaming vs. merch gap, Gen Z sustainability preference
- Competitive vacuum: marketplace collapse creating migration opportunity
- AI differentiation: 12-month window to build first-mover advantage

**[ARCH]** The Vision doc should remain aspirational but grounded. Add data to support vision claims, not replace the vision itself.

**Files**: `Documentation/01-Product/Vision.md`

---

### T4: Update Roadmap-Crowdfunding-v1.0.md (S — 15 min)
**Read first** to understand current sprint plan.

**Likely additions**:
- Add "Why This Timing" section near the top with market data
- Fyul merger window: 18-24 months of reduced innovation
- Marketplace collapse: largest artist migration opportunity
- AI window: 12-month exclusive advantage
- EU regulation: EPR creating compliance moat
- Add urgency data to Day 3+ sprint descriptions

**Files**: `Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md`

---

### T5: Update Crowdfunding Overview.md (M — 25 min)
**Read first** to understand current projections.

**Likely additions**:
- Market context section: "Why €35-50K is the right target" with market data
- Comparable crowdfunding campaigns in creator economy (if data exists in research)
- Backer conversion justification: how market data supports the 267-458 backer projection
- Geographic targeting: EU-first strategy backed by 24.06% CAGR
- Capital allocation justification: market rates for facility fit-out, inventory, infrastructure

**[VERIFY]** Ensure financial projections remain unchanged — only add supporting context, don't alter the numbers.

**Files**: `Documentation/07-Community/04-Crowdfunding-Landing/Overview.md`

---

### T6: Update Design-System.md (S — 10 min)
**Action**: Minor additions only.

- Add a "Consumer Psychology Notes" section:
  - Gold sheen (premium positioning): validated by premium pricing tolerance (+25-30%)
  - Dark mode only: aligns with Gen Z aesthetic preferences
  - Color choices: Recording Red for action states aligns with urgency-driven purchase behavior

**Files**: `Documentation/05-Shared/Design-System.md`

---

### T7: Update AGENTS.md (S — 10 min)
**Action**: Add research references to relevant sections.

- Update "Current Phase" section with market timing data
- Add "Research Sources" to Quick Navigation
- Update tech stack justification with AI moat context (12-month window)
- Add competitive positioning note to "P0 Sprint" context

**Files**: `Documentation/AGENTS.md` (or root `AGENTS.md`)

---

### T8: Cross-Reference Consistency Check (S — 10 min)
- Ensure TAM/SAM/SOM figures are identical across all docs
- Ensure CAGR figures are consistent
- Ensure competitor names are consistent (Fyul vs. Printful+Printify)
- Ensure market sizing year references are consistent (2025 base year)

---

## 4. Parallelization

**⚠️ CONFLICT WARNING**: This plan edits multiple existing files. If run in parallel with other plans that edit the same files, there could be merge conflicts.

**Safe parallelization**:
- T1, T2, T3 can run in parallel (different files)
- T4, T5 can run in parallel (different files)
- T6, T7 can run in parallel (different files)
- T8 must run after all others (consistency check)

**Conflict risk with other plans**:
- PLAN-01 may also update PRD.md (T10) → coordinate
- PLAN-04 updates Roadmap.md → different file from T4
- PLAN-06 updates Brand-Guidelines.md → no overlap

## 5. Agent Assignment
- **[SUBAGENT]** — But only ONE agent should run this plan to avoid file conflicts

## 6. Verification
- [ ] Each modified file still reads correctly
- [ ] No broken cross-references
- [ ] All statistics are consistent across files
- [ ] No content was removed, only added
- [ ] `bun build` or `npm run build` still works (if any code files were touched — unlikely)
