# Agent Assignment Guide

> **Version:** 2.0  
> **Based on:** Master Roadmap v2.0 (Jan 27, 2026)  
> **Status:** Phase 3.5-3.6 Active Task Assignments

---

## Overview

This folder contains **dedicated task breakdown documents** for each specialized agent. Each document provides:

- **Agent Role:** What they specialize in
- **Phase Tasks:** Which phases they lead
- **Specific Assignments:** Task IDs, subtasks, files affected
- **Estimated Time:** For planning and capacity
- **Dependencies:** What they depend on from other agents
- **Success Criteria:** How to know when tasks are complete

---

## Quick Reference: Agent Roles

| Agent | Specialization | Primary Focus | Est. Hours (Phase 3.5-3.6) |
|-------|---------------|--------------|---------------------------|
| **Agent 1** | Database Specialist | Schema, migrations, DB operations | 5-6 |
| **Agent 2** | API Specialist | API routes, integrations, webhooks | 8-10 |
| **Agent 3** | Frontend Specialist | React components, UI/UX, styling | 60-70 |
| **Agent 4** | Full-Stack Specialist | End-to-end features, integration testing | 5-8 |
| **Agent 5** | AI Specialist | AI models, prompts, voice integration | 4-6 |
| **Agent 6** | Operations Specialist | Documentation, processes, organization | 3-4 |

---

## Document Index

| Agent | Document | Tasks | Est. Hours |
|-------|----------|-------|-----------|
| 1 | [Agent-1-Database.md](./Agent-1-Database.md) | Schema updates, migrations, DB ops | 5-6 |
| 2 | [Agent-2-API.md](./Agent-2-API.md) | STT/TTS APIs, voice agent, waitlist interviews | 8-10 |
| 3 | [Agent-3-Frontend.md](./Agent-3-Frontend.md) | Audio UI, inline cards, lightbox, waitlist form | 60-70 |
| 4 | [Agent-4-FullStack.md](./Agent-4-FullStack.md) | Integration, testing, QA | 5-8 |
| 5 | [Agent-5-AI.md](./Agent-5-AI.md) | Voice-to-voice pipeline, prompt engineering | 4-6 |
| 6 | [Agent-6-Operations.md](./Agent-6-Operations.md) | Documentation, folder org, processes | 3-4 |

---

## Execution Timeline

### Week 1 (Jan 27 - Feb 2)

**Agent 1:** Database schema updates (5-6 hours)
- Task 3.5.0 (all subtasks)

**Agent 2:** API routes foundation (6-8 hours)
- Task 3.5.1.4 (Deepgram STT)
- Task 3.5.1.8 (Voice agent API) - *depends on Agent 3*
- Task 3.5.5.12 (Catalog API) - *depends on Agent 1*

**Agent 3:** Audio UI + Inline Cards (30+ hours)
- Task 3.5.1 (all UI except APIs)
- Task 3.5.2-3.5.4 (all inline card components)
- Task 3.5.5.1-3.5.5.10 (catalog lightbox UI)

**Agent 5:** Voice model research/integration (4-6 hours)
- Voice-to-voice architecture planning
- MiMo prompt engineering for interview

**Agent 6:** Folder reorganization (already done!)

### Week 2 (Feb 2 - Feb 9)

**Agent 1:** Product blanks seeding (2+ hours)
- Task 3.5.5.11 (seed data)

**Agent 2:** Voice interview APIs (4-6 hours)
- Task 3.6.11 (text interview)
- Task 3.6.12 (voice interview)

**Agent 3:** Product detail + waitlist (40+ hours)
- Task 3.5.6 (all subtasks)
- Task 3.5.7 (unified lightbox)
- Task 3.6 (all waitlist components)

**Agent 4:** Integration testing (5-8 hours)
- E2E testing for all components
- Cross-browser testing
- Mobile responsiveness

---

## Parallel Execution Strategy

### Independent Tasks (Can run in parallel)
- Agent 1: Schema updates (doesn't depend on anything)
- Agent 3: Audio UI, inline cards (can start immediately)
- Agent 5: Prompt engineering (can research while others code)
- Agent 6: Documentation (independent)

### Dependent Tasks (Sequential)
```
Agent 1: Schema updates (5-6h)
    ↓
Agent 2: Catalog API (requires schema complete)
Agent 1: Product seed data (requires catalog API working)
    ↓
Agent 3: Catalog lightbox (requires seed data + API ready)
```

```
Agent 3: Audio UI (30h, no dependencies)
    ↓
Agent 2: Voice API routes (requires audio UI done for testing)
Agent 5: Voice prompt eng (can happen in parallel)
    ↓
Agent 3: Waitlist form (requires voice API ready)
    ↓
Agent 4: E2E testing (requires all components)
```

---

## Daily Standup Checklist

**Each morning:**
1. Check this README for your assigned tasks
2. Open your Agent document (e.g., Agent-3-Frontend.md)
3. Mark completed subtasks ✅
4. Note any blockers
5. Update time estimates if changed

**Each evening:**
1. Commit code with proper messages
2. Update your Agent document with progress
3. Flag any dependencies blocking other agents
4. Brief the team on blockers

---

## How to Use These Documents

### For Agent Assignment
1. Open your assigned Agent document
2. Read the full task breakdown
3. Start with Task 1, complete all subtasks
4. Move to Task 2, etc.

### For Status Updates
1. Mark subtasks as complete: ✅
2. Add time spent vs. estimated
3. Note any issues in the "Notes" section
4. Flag dependencies that are blocking

### For Team Coordination
1. Check dependencies before starting new task
2. Notify other agents when blocking task is unblocked
3. Update this README if timeline changes

---

## Definitions

### Task ID Format
`3.5.1.2` = Phase 3, Subphase 5, Task 1, Subtask 2

### Estimated Time
Conservative estimate including testing, debugging, iterations

### Success Criteria
Clear definition of "done" for each task

### Dependencies
List of other tasks/agents that must complete before this task can proceed

---

## Rollup Status

### Overall Phase 3.5-3.6 Progress
- **Target Completion:** Feb 9, 2026 (2 weeks)
- **Current Status:** 🔄 IN PROGRESS
- **Overall Progress:** 0% (starting)

### By Agent (Updated Daily)
| Agent | Assigned Tasks | Status | Progress | Notes |
|-------|----------------|--------|----------|-------|
| 1 | 3.5.0, seed data | 🔄 | 0% | Starting schema updates |
| 2 | APIs, integrations | ⏳ | 0% | Waiting for schema from Agent 1 |
| 3 | All UI components | ⏳ | 0% | Can start audio UI immediately |
| 4 | Integration/QA | ⏳ | 0% | Waiting for components |
| 5 | Voice integration | 🔄 | 0% | Starting prompt research |
| 6 | Documentation | ✅ | 100% | Folder reorganization complete |

---

## Key Constraints & Notes

### Environment Setup Required
- All agents have access to Drizzle schema at `/src/db/schema.ts`
- Database: Neon PostgreSQL (connection string in `.env.local`)
- API keys required: Deepgram, OpenRouter, Replicate (for future Flux generation)

### Browser/Device Testing
- Chrome, Safari, Firefox (desktop)
- iOS Safari, Android Chrome (mobile)
- Test on real devices (not just emulators)

### Voice-to-Voice Testing
- Test on different network speeds (slow 3G, 4G, WiFi)
- Test on different devices (MacBook, iPhone, Android)
- Record latency metrics for voice response

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation for all components
- Screen reader testing
- Focus management in lightbox components

---

## Communication Channels

- **Standup:** Daily 9 AM (15 min)
- **Blockers:** Slack #dev-blockers
- **Code Review:** GitHub PR comments
- **Documentation:** This folder + commit messages

---

## Success Definition

**Phase 3.5-3.6 Complete when:**
- ✅ All assigned tasks marked complete
- ✅ All tests passing
- ✅ No critical bugs
- ✅ Mobile responsive on all views
- ✅ Deployed to staging environment
- ✅ Team review completed

---

**Last Updated:** January 27, 2026  
**Next Review:** Daily during standups  
**Owner:** Victor (Orchestrator)
