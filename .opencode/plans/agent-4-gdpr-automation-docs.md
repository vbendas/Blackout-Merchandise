# 🤖 Agent 4: GDPR Automation & Documentation

**Branch:** `feature/gdpr-automation-docs`
**Time Estimate:** 3.5 hours
**Agent Role:** Implement automated data retention, integrate GDPR features into app layout, update Clerk webhooks for deletion, create comprehensive GDPR documentation

---

## Task Breakdown

### Task 4.1: Create Data Retention Cron Job (1 hour)

**Explanation:** GDPR requires data minimization and automatic deletion. We're creating a Vercel cron job that runs daily at 2 AM to delete expired data (inactive accounts after 2 years, withdrawn consents after 30 days).

**Subtasks:**
1. Create directory: `app/src/app/cron/`
2. Create `app/src/app/cron/retention/route.ts`
3. Add imports: NextResponse, db, schema tables (users, consents), Drizzle operators
4. Add exports:
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   ```
5. Define CRON_SECRET from environment variable
6. Implement GET handler with authentication:
   - Get Authorization header
   - Check against `Bearer ${CRON_SECRET}`
   - Return 401 if doesn't match
7. Implement retention logic:
   - Calculate two years ago date
   - Delete users where role='customer' and updatedAt < 2 years ago
   - Calculate thirty days ago date
   - Delete consents where withdrawnAt < 30 days ago
   - Track deleted counts (users + consents)
8. Return JSON response with success status, timestamp, and results
9. Wrap in try/catch with logging
10. Test logic for date calculations

**Deliverables:**
- `app/src/app/cron/retention/route.ts` created
- Cron route protected by CRON_SECRET authentication
- Deletes inactive customer accounts
- Deletes expired consent records
- Returns deletion statistics

**Verification:**
Run typecheck - no errors.

---

### Task 4.2: Update Vercel Cron Configuration (15 min)

**Explanation:** Vercel needs to know about our cron job. We're configuring Vercel to run our retention route daily at 2 AM.

**Subtasks:**
1. Check if `vercel.json` exists in project root
2. If not exists, create `vercel.json`
3. Add cron configuration:
   ```json
   {
     "crons": [
       {
         "path": "/cron/retention",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```
4. Verify cron schedule format (6 parts: minute hour day month weekday)
5. Save file

**Deliverables:**
- `vercel.json` created (or updated)
- Cron job configured for daily 2 AM execution
- Path points to /cron/retention route

**Verification:**
Review cron syntax - should be valid.

---

### Task 4.3: Update Clerk Webhook with Deletion Handler (30 min)

**Explanation:** When Clerk deletes a user account, we need to clean up all their GDPR data from our database. We're adding a user.deleted event handler to our existing webhook that deletes consent records and data subject requests.

**Subtasks:**
1. Open `app/src/app/api/webhooks/clerk/route.ts`
2. Find existing webhook event handlers
3. Add new handler for `event.type === 'user.deleted'`:
   - Extract `clerkUserId` from `event.data.id`
   - Query users table by clerkId to find our internal userId
   - If user exists and user[0] exists:
     - Get userId from user[0].id
     - Delete consent records where userId matches
     - Delete data subject requests where userId matches
     - Note: users table deletion should cascade (check schema onDelete setting)
   - Log deletion for debugging
   - If user doesn't exist, log and continue (graceful handling)
4. Wrap in try/catch with error handling

**Deliverables:**
- `app/src/app/api/webhooks/clerk/route.ts` updated
- User deletion handler added
- All GDPR-related data cleaned up on Clerk account deletion
- Proper logging in place

**Verification:**
Review webhook code - deletion logic should be correct.

---

### Task 4.4: Add Consent Banner to App Layout (15 min)

**Explanation:** The consent banner we created needs to be rendered on every page so users see it. We're updating the root layout to import and display the ConsentFooterBanner component.

**Subtasks:**
1. Open `app/src/app/layout.tsx`
2. Import ConsentFooterBanner at top of file:
   ```typescript
   import { ConsentFooterBanner } from '@/components/privacy/ConsentFooterBanner';
   ```
3. In the body component, add `<ConsentFooterBanner />` before closing `</body>` tag
4. Verify component is imported correctly
5. Keep existing layout structure intact (no breaking changes)
6. Save file

**Deliverables:**
- `app/src/app/layout.tsx` updated
- ConsentFooterBanner component imported
- Component rendered in layout
- Banner visible on all pages

**Verification:**
Run `bunx tsgo --noEmit app/src/app/layout.tsx` - no import errors.

---

### Task 4.5: Create DPIA Documentation (1.5 hours)

**Explanation:** GDPR requires a Data Protection Impact Assessment for high-risk processing. We're creating comprehensive DPIA.md in Documentation/ folder with all required sections: processing overview, necessity assessment, risk assessment, safeguards, data subject rights, international transfers, breach notification, and conclusion.

**Subtasks:**
1. Create `Documentation/DPIA.md`
2. Write header section with:
   - Date: January 21, 2026
   - Project: Blackout Merchandise - AI-Powered Merchandise Platform
   - Controller: Blackout Merchandise Ltd, Portugal
   - DPO: dpo@blackoutmerch.example (Victor)
3. Section 1: Processing Overview
   - Purpose: Explain AI-powered merch platform
   - Data Types: List all 5 categories
   - Data Subjects: Artists, customers, visitors
   - Recipients: List all 4 external services
4. Section 2: Necessity Assessment
   - Checklist with 3 questions and answers
   - Necessity of each data type explained
5. Section 3: Risk Assessment
   - Create table with 7 risks, likelihood, severity, mitigation
   - Fill in all risks with mitigation strategies
6. Section 4: Safeguards
   - Technical safeguards (6 items with checkboxes)
   - Organizational safeguards (3 items with checkboxes)
   - Legal safeguards (3 items with checkboxes)
7. Section 5: Data Subject Rights
   - List 5 implemented rights with response times
8. Section 6: International Data Transfers
   - Document EU to US transfers
   - List 3 safeguards (SCC, adequacy, encryption)
9. Section 7: Breach Notification
   - 72-hour notification process with 4 steps
   - Breach response team list
10. Section 8: Conclusion
   - Assessment result: acceptable with proposed safeguards
   - Residual risk: low-medium
   - Reviewer and date
11. Section 9: Approval
   - Placeholder for external review
   - Next review date: January 21, 2027

**Deliverables:**
- `Documentation/DPIA.md` created
- All 8 DPIA sections completed
- Risk assessment table with 7 risks
- 15 safeguards documented with checkboxes
- Victor listed as DPO and reviewer

**Verification:**
Open file - all sections should be present.

---

### Task 4.6: Create PRIVACY.md Implementation Guide (30 min)

**Explanation:** Developers need a guide to GDPR implementation. We're creating PRIVACY.md in Documentation/ folder with overview, data subject rights, consent management, retention policies, and testing procedures.

**Subtasks:**
1. Create `Documentation/PRIVACY.md`
2. Write Overview section:
   - Blackout Merchandise implements full GDPR compliance
   - Purpose: AI-powered merch platform
3. Section: Data Subject Rights
   - Access: `/data-rights` → Request data access
   - Deletion: `/data-rights` → Delete account
   - Portability: `/data-rights` → Export data (JSON, CSV, XML)
4. Section: Consent Management
   - Cookie banner on first visit
   - Granular controls (essential, analytics, marketing)
   - Withdraw consent anytime in settings
5. Section: Data Retention
   - Accounts: 2 years from last activity
   - Orders: 7 years (legal requirement)
   - Consents: Until withdrawn + 30 days
   - Analytics: 26 months then anonymized
6. Section: Data Protection Officer
   - Email: dpo@blackoutmerch.example
7. Section: Testing Procedures
   - Consent flow test scenarios
   - Data rights API test scenarios
   - Verification steps
8. Save file

**Deliverables:**
- `Documentation/PRIVACY.md` created
- Complete implementation guide
- All GDPR features documented
- Testing checklist included

**Verification:**
Open file - all sections should be present.

---

## Agent 4 Completion Checklist

- [ ] Data retention cron route created
- [ ] Vercel cron configured for 2 AM daily
- [ ] CRON_SECRET environment variable documented
- [ ] Clerk webhook updated with deletion handler
- [ ] Consent banner added to app layout
- [ ] DPIA.md created with 8 sections
- [ ] PRIVACY.md created with 7 sections
- [ ] All 7 tasks completed
- [ ] Branch ready for review and merge
