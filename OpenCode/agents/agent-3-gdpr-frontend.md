# 🤖 Agent 3: GDPR Frontend

**Branch:** `feature/gdpr-frontend`
**Time Estimate:** 4 hours
**Agent Role:** Build user-facing interfaces for GDPR compliance - consent management, privacy policy page, data rights portal

---

## Task Breakdown

### Task 3.1: Copy shadcn UI Components (30 min)

**Explanation:** Our consent management needs Dialog and Checkbox components. The `front-end/landing-page-hero` project already has shadcn components configured with our zinc color scheme. We'll copy necessary components to the `/app` project instead of creating from scratch.

**Subtasks:**
1. Navigate to `front-end/landing-page-hero/components/ui/`
2. Copy `dialog.tsx` to `app/src/components/ui/dialog.tsx`
3. Copy `checkbox.tsx` to `app/src/components/ui/checkbox.tsx`
4. Verify both files copied successfully
5. Check that imports in copied files reference correct paths (`@/lib/utils`)
6. No modifications needed - components should work as-is

**Deliverables:**
- `app/src/components/ui/dialog.tsx` copied from front-end
- `app/src/components/ui/checkbox.tsx` copied from front-end
- Both components ready for import

**Verification:**
Run `cat app/src/components/ui/dialog.tsx` to confirm file exists.

---

### Task 3.2: Create Consent Footer Banner (1 hour)

**Explanation:** We need a minimal, non-intrusive footer banner that shows "Privacy & Cookies" link. Clicking opens a Dialog where users can set their consent preferences (analytics, marketing) with granular controls.

**Subtasks:**
1. Create directory: `app/src/components/privacy/`
2. Create `app/src/components/privacy/ConsentFooterBanner.tsx`
3. Implement component:
   - State management with useState for dialog open/close
   - useState for consent preferences (essential: true, analytics: false, marketing: false)
   - useEffect to check localStorage on mount
   - If saved consent exists and acknowledged: don't show full dialog, only minimal footer link
   - Set consents from saved state
   - Dialog with DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription from shadcn
   - Three consent options:
     - Essential (always on, disabled)
     - Analytics (toggleable checkbox with explanation)
     - Marketing (toggleable checkbox with explanation)
   - Two buttons: "Reject Non-Essential" and "Save Preferences"
   - Link to /privacy page
   - Footer bar: always visible, shows "Privacy & Cookies" button with DialogTrigger
4. Use zinc color palette (zinc-950, zinc-900, zinc-800) for minimal, neutral look
5. Implement handleSave function:
   - Save new consent state to localStorage with version '1.0'
   - POST to /api/consent with analytics and marketing values
   - Close dialog on save
6. Implement handleReject function:
   - Set analytics and marketing to false, keep essential true
   - Call handleSave
7. Export as default export

**Deliverables:**
- `app/src/components/privacy/ConsentFooterBanner.tsx` created
- Minimal footer banner always visible
- Full consent dialog with granular controls
- localStorage integration for persistence

**Verification:**
Review component code - all imports should resolve correctly.

---

### Task 3.3: Create Privacy Policy Page (1 hour)

**Explanation:** GDPR requires a published privacy policy with specific sections. We're creating a page that covers all required GDPR elements: controller identity, data collected, legal basis, data sharing, user rights, data retention, security, international transfers, and contact information.

**Subtasks:**
1. Create `app/src/app/privacy/page.tsx`
2. Use zinc color palette (dark mode only)
3. Page structure with main container:
   - max-w-4xl mx-auto py-16 px-4 bg-zinc-950 text-white
4. Section 1: Identity of Controller
   - MerchFrom Ltd., Portugal
   - Data Protection Officer: dpo@merchfrom.com
5. Section 2: Data We Collect
   - Account data (email, name, profile image)
   - Usage data (pages visited, features used)
   - Order data (shipping, payment, history)
   - Technical data (IP, browser, device)
6. Section 3: Legal Basis for Processing
   - Consent (marketing communications)
   - Contract (order fulfillment, account management)
   - Legitimate interest (fraud prevention)
   - Legal obligation (tax records)
7. Section 4: Data Sharing
   - List partners: Stripe, Clerk, Neon, OpenRouter
   - Emphasize: "We do NOT sell your personal data"
8. Section 5: Your Rights
   - Right to access
   - Right to deletion
   - Right to portability
   - Right to object
   - Right to withdraw consent
   - Link to /data-rights portal
9. Section 6: Data Retention
   - Accounts: 2 years from last activity
   - Orders: 7 years (legal requirement)
   - Consents: Until withdrawn + 30 days
10. Section 7: Security
   - Encryption at rest (Neon AES-256)
   - Encryption in transit (HTTPS/TLS 1.3)
   - Access controls (Clerk)
11. Section 8: International Transfers
   - EU to US transfers
   - Standard Contractual Clauses
   - Adequacy decisions
12. Section 9: Contact
   - DPO email
13. Footer with "Last updated: January 21, 2026"
14. Use clean typography (no emojis, professional formatting)

**Deliverables:**
- `app/src/app/privacy/page.tsx` created
- All 9 GDPR-required sections present
- Clean, professional zinc-colored design
- Links to data rights portal included

**Verification:**
Run `bunx tsgo --noEmit app/src/app/privacy/page.tsx` - no type errors.

---

### Task 3.4: Create Data Rights Portal Page (1 hour)

**Explanation:** GDPR data rights need to be easily accessible. We're creating a portal page with three main action buttons (Access, Deletion, Portability) that calls our API endpoints and displays results inline or as downloads.

**Subtasks:**
1. Create `app/src/app/data-rights/page.tsx`
2. Add 'use client' directive (for interactive buttons)
3. Import useState, Button from HeroUI
4. Implement page layout:
   - max-w-2xl mx-auto py-16 px-4 bg-zinc-950 text-white
   - Header: "Data Rights Portal"
   - Description: "Exercise your GDPR rights to access, delete, or export your data"
5. Implement useState for loading state and result message
6. Implement handleRequest function:
   - Accepts type parameter ('access', 'deletion', 'portability')
   - Sets loading=true, clears result
   - POST to `/api/data-rights/${type}`
   - Parses JSON response
   - For portability with JSON format: display response inline
   - For portability with CSV format: download file dynamically
   - For deletion: display confirmation message or partial_deletion details
   - Sets loading=false and displays result
7. Create three sections with Cards:
   - Card 1: Right to Access
     - Description: Request complete copy of all your personal data
     - Button: "Request Data Access" → handleRequest('access')
   - Card 2: Right to Deletion
     - Description: Request deletion of your account and all associated data
     - Button: "Delete My Account" → confirmation dialog → handleRequest('deletion')
   - Card 3: Right to Portability
     - Description: Export your data in machine-readable format to transfer to another service
     - Format selector (JSON default)
     - Button: "Export My Data" → handleRequest('portability')
8. Add result display area below buttons
9. Use HeroUI Button components with appropriate variants
10. Add error handling for failed requests

**Deliverables:**
- `app/src/app/data-rights/page.tsx` created
- Three data right actions accessible
- Result display for user feedback
- CSV download for portability

**Verification:**
Run typecheck - no errors.

---

## Agent 3 Completion Checklist

- [ ] shadcn dialog.tsx copied to app
- [ ] shadcn checkbox.tsx copied to app
- [ ] Consent footer banner component created
- [ ] Privacy policy page created with 9 sections
- [ ] Data rights portal page created
- [ ] All components using zinc color palette
- [ ] All pages use HeroUI or shadcn components
- [ ] All 5 tasks completed
- [ ] Branch ready for review and merge
