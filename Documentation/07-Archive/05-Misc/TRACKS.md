# MerchFrom Track Management

Active work items tracked as "Tracks" - logical units of work like features, bugs, chores.

---

## Active Tracks

### Track 1: Code Verification Stack
- **Type:** chore
- **Status:** pending
- **Created:** 2026-01-21
- **Priority:** P0
- **Estimated:** 4 hours
- **Tasks:**
  1. Create verify.sh script
  2. Add Bun integration for /app
  3. Add npm integration for /mainpage
  4. Configure pre-commit hook
  5. Test verification stack
  6. Update documentation

### Track 2: GDPR Compliance
- **Type:** feature
- **Status:** pending
- **Created:** 2026-01-21
- **Priority:** P0
- **Estimated:** 13 hours
- **Tasks:**
  1. Database schema updates (Drizzle)
  2. User consent API endpoints
  3. Data deletion implementation
  4. Data export functionality
  5. Cookie consent system
  6. Privacy policy integration
  7. Admin dashboard updates
  8. Testing GDPR flows
  9. Documentation updates

### Track 3: Quick Wins
- **Type:** chore
- **Status:** pending
- **Created:** 2026-01-21
- **Priority:** P0
- **Estimated:** 2.5 hours
- **Tasks:**
  1. Add confidence check protocol
  2. Create track management system
  3. Add create-plan workflow
  4. Update roadmap with skills integration

---

## Track Types

| Type | Description | Examples |
|------|-------------|----------|
| **feature** | New functionality for users | AI chat, user dashboard |
| **bug** | Fixes for broken functionality | Broken form, payment error |
| **chore** | Maintenance and improvements | Update deps, refactor code |
| **refactor** | Code restructuring without changes | Extract component, optimize queries |

---

## Track Lifecycle

1. **pending** - Planned but not started
2. **in_progress** - Actively being worked on
3. **completed** - All tasks done, ready for review
4. **archived** - Completed and merged, no longer active

---

## Track Management

### Creating New Tracks

1. Determine track type (feature/bug/chore/refactor)
2. Assign priority (P0, P1, P2)
3. Estimate time required
4. Break down into specific tasks
5. Add to this document

### Updating Tracks

- Change status as work progresses
- Update estimates if needed
- Add new tasks if scope changes
- Mark complete when all tasks done

### Archiving

When a track is completed and merged:
- Move to "Archived Tracks" section
- Include completion date
- Note any lessons learned