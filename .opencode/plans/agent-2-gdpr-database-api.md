# 🤖 Agent 2: GDPR Database & API

**Branch:** `feature/gdpr-database-api`
**Time Estimate:** 4 hours
**Agent Role:** Build the data layer for GDPR compliance - database schema, API endpoints for data subject rights, and consent tracking

---

## Task Breakdown

### Task 2.1: Design Database Schema (1 hour)

**Explanation:** GDPR requires storing consent records, data subject requests, and breach logs. We need to add 3 new tables to the existing Drizzle schema with proper relationships and constraints.

**Subtasks:**
1. Open `src/db/schema.ts`
2. After `orderItemsRelations` function, add new table definitions:
   - `consents` table with columns: id, userId, consentType, granted, grantedAt, withdrawnAt, ipAddress, userAgent, consentVersion, method, createdAt, updatedAt
   - `dataSubjectRequests` table with columns: id, userId, requestType, status, requestedAt, completedAt, notes, createdAt
   - `dataBreachLogs` table with columns: id, severity, affectedCount, dataTypes, description, notifiedAt, resolvedAt, createdAt
3. Add proper enums using `text()` with `enum` parameter:
   - consentType: ['essential', 'analytics', 'marketing']
   - requestType: ['access', 'deletion', 'portability']
   - status: ['pending', 'completed', 'rejected']
   - method: ['explicit_opt_in', 'implicit', 'withdrawn']
   - severity: ['low', 'medium', 'high']
4. Add foreign key relationships:
   - consents.userId references users.id with onDelete cascade
   - dataSubjectRequests.userId references users.id with onDelete set null
5. Update `usersRelations` to include new relations:
   - `consents: many(consents)`
   - `dataSubjectRequests: many(dataSubjectRequests)`
6. Verify all TypeScript syntax is correct
7. Save file

**Deliverables:**
- `src/db/schema.ts` updated with 3 new table definitions
- All tables have proper constraints and enums
- Relations updated for referential integrity

**Verification:**
Run `bunx tsgo --noEmit src/db/schema.ts` to verify no type errors.

---

### Task 2.2: Create SQL Migration File (30 min)

**Explanation:** Drizzle needs a SQL migration file to apply schema changes to the database. We're creating this with proper table creation, indexes, and comments.

**Subtasks:**
1. Create directory `drizzle/migrations/` if it doesn't exist
2. Create file `drizzle/migrations/0001_gdpr_compliance.sql`
3. Write SQL to create `consents` table:
   - Primary key (UUID)
   - All columns with proper types (UUID, TEXT, BOOLEAN, TIMESTAMP)
   - CHECK constraints for enums
   - Index on userId for queries
   - Index on consentType for filtering
4. Write SQL to create `data_subject_requests` table:
   - All columns with proper types
   - CHECK constraints for enums
   - Index on userId and status
5. Write SQL to create `data_breach_logs` table:
   - All columns with proper types
   - CHECK constraints for severity enum
   - Index on severity and createdAt
6. Add COMMENT ON TABLE statements to document each table's purpose
7. Verify SQL syntax is valid

**Deliverables:**
- `drizzle/migrations/0001_gdpr_compliance.sql` created
- All 3 tables with full column definitions
- Indexes created for query performance
- Comments added for documentation

**Verification:**
Review SQL file - all CREATE TABLE statements should be present.

---

### Task 2.3: Set Up Staging Database (30 min)

**Explanation:** GDPR should be tested in a staging environment that mirrors production but doesn't affect real user data. We'll create a separate database within the same Neon project and configure it for testing.

**Subtasks:**
1. Go to Neon dashboard (neon.tech)
2. Sign in to merch-from project
3. Click "New Database" button
4. Set database name: `staging_neon_db` (or similar name)
5. Choose region (default is fine)
6. Click "Create" button
7. After creation, click "Connection Details"
8. Copy connection string (PostgreSQL URL)
9. Create `.env.staging` file in project root
10. Add to `.env.staging`:
    ```
    DATABASE_URL=<paste-connection-string-here>?sslmode=require
    ```
11. Keep all other variables (Clerk, Stripe, etc.) pointing to staging if needed, or can use production values for non-database services

**Deliverables:**
- New staging database created in Neon
- `.env.staging` file created with DATABASE_URL
- Staging database ready for migrations

**Verification:**
Verify connection string starts with `postgresql://` and includes SSL mode.

---

### Task 2.4: Run Migration on Staging (30 min)

**Explanation:** Now that we have a staging database and migration file, we need to apply the schema changes to create the 3 new tables. Drizzle CLI will handle this.

**Subtasks:**
1. Set environment to use staging config:
   ```bash
   export $(grep -v '^#' .env.staging | xargs)
   ```
2. Run Drizzle migration command:
   ```bash
   bunx drizzle-kit migrate
   ```
3. Verify output shows migration applied successfully
4. Connect to Neon staging database in dashboard
5. Verify 3 new tables exist: `consents`, `data_subject_requests`, `data_breach_logs`

**Deliverables:**
- Migration applied to staging database
- All 3 GDPR tables created in staging
- Staging database ready for API testing

**Verification:**
Connect to Neon and confirm tables are visible.

---

### Task 2.5: Create Access Request API Route (45 min)

**Explanation:** GDPR Article 15 gives users right to access their data. We're creating an API endpoint that collects all user data (profile, stores, orders, consents) and returns it as a comprehensive report.

**Subtasks:**
1. Create directory: `app/src/app/api/data-rights`
2. Create `app/src/app/api/data-rights/access/route.ts`
3. Import dependencies:
   - NextResponse from Next.js
   - auth from Clerk for user authentication
   - db from our database module
   - Schema tables (users, artistStores, orders, consents, dataSubjectRequests)
   - eq from Drizzle ORM for queries
4. Implement POST handler:
   - Get userId from Clerk auth
   - Return 401 if not authenticated
   - Create data subject request record with type 'access' and status 'completed'
   - Query users table for profile
   - Query artistStores for store data (if artist)
   - Query orders table for customer orders
   - Query orders table for artist orders (via storeId relationship)
   - Query consents table for consent records
   - Build report object with all collected data
   - Include retention periods documentation
   - Add data protection officer email
   - Return JSON response
5. Wrap in try/catch with proper error handling
6. Add appropriate TypeScript types

**Deliverables:**
- `app/src/app/api/data-rights/access/route.ts` created
- Collects all user data correctly
- Returns comprehensive GDPR-compliant report

**Verification:**
Review TypeScript code - no type errors should exist.

---

### Task 2.6: Create Deletion Request API Route (45 min)

**Explanation:** GDPR Article 17 gives users right to deletion. We're creating an API endpoint that handles deletion requests, including checking for legal obligations (active orders) and providing retry dates.

**Subtasks:**
1. Create `app/src/app/api/data-rights/deletion/route.ts`
2. Import dependencies (same as access route)
3. Implement POST handler:
   - Get userId from Clerk auth
   - Check for active orders (pending/paid/processing/shipped)
   - If active orders exist:
     - Return 400 with partial_deletion status
     - Include retry date (current date + 7 days)
     - Explain legal obligation (7 years retention for orders)
     - Create request record with type 'deletion' and status 'rejected'
   - If no active orders:
     - Create request record with type 'deletion' and status 'completed'
     - Delete user from database (cascade deletes related data)
     - Explicitly delete consent records for this userId
     - Explicitly delete data subject requests for this userId
     - Log deletion timestamp
     - Return success message with GDPR notice about 30-day grace period
4. Wrap in try/catch with logging
5. Test logic for both cases (with and without active orders)

**Deliverables:**
- `app/src/app/api/data-rights/deletion/route.ts` created
- Handles full deletion when no active orders
- Handles partial deletion with retry date when active orders exist
- Proper error handling and logging

**Verification:**
Verify both code paths (with/without active orders) are implemented.

---

### Task 2.7: Create Portability Request API Route (45 min)

**Explanation:** GDPR Article 20 gives users right to data portability. We're creating an API endpoint that exports user data in multiple formats (JSON, CSV, XML) as machine-readable, commonly used formats.

**Subtasks:**
1. Create `app/src/app/api/data-rights/portability/route.ts`
2. Import dependencies plus:
   - URL for query parameter parsing
3. Implement POST handler:
   - Get userId from Clerk auth
   - Check format query parameter (defaults to 'json')
   - Validate format is one of: 'json', 'csv', 'xml'
   - Return 400 if invalid format
   - Create data subject request record with type 'portability' and status 'completed'
   - Collect user data (same as access route)
   - Build exportData object with all data
   - Switch on format parameter:
     - 'json': JSON.stringify(data, null, 2)
     - 'csv': Call convertToCSV(data) function
     - 'xml': Call convertToXML(data) function
   - Set appropriate Content-Type header for format
   - Set Content-Disposition header with filename
   - Set Cache-Control: no-cache
   - Return NextResponse with data
4. Implement convertToCSV function:
   - Define headers array
   - Create rows array with header row first
   - Map through profile data to add row
   - Map through consents data to add rows
   - Map through orders data to add rows
   - Join all rows with newline
   - Return CSV string
5. Implement convertToXML function:
   - Create XML header with version and encoding
   - Create root element with export data
   - Use escapeXML helper to prevent XML injection
   - Include all data sections
   - Return XML string
6. Implement escapeXML helper:
   - Replace & with &amp;
   - Replace < with &lt;
   - Replace > with &gt;
   - Replace " with &quot;
   - Replace ' with &apos;

**Deliverables:**
- `app/src/app/api/data-rights/portability/route.ts` created
- Supports JSON export (default)
- Supports CSV export with proper formatting
- Supports XML export with proper escaping
- All formats include Content-Type and Content-Disposition headers

**Verification:**
Review all format conversion functions.

---

### Task 2.8: Create Consent API Route (45 min)

**Explanation:** GDPR requires explicit, informed consent. We're creating an API endpoint that records user consent choices (analytics, marketing) and stores them with IP address and user agent for proof of consent.

**Subtasks:**
1. Create `app/src/app/api/consent/route.ts`
2. Import dependencies
3. Implement POST handler:
   - Get userId from Clerk auth
   - Parse request body for analytics and marketing booleans
   - If userId is null (anonymous user):
     - Get IP from x-forwarded-for header (or x-real-ip)
     - Get user agent from user-agent header
     - Insert consent record with userId=null, consentType='essential', granted=true, method='implicit'
     - Return NextResponse.json({ success: true })
   - If userId exists (authenticated user):
     - Get current timestamp
     - Insert consent record for analytics (explicit_opt_in)
     - Insert consent record for marketing (explicit_opt_in)
     - Return success response with timestamp
   - Log to console for debugging
4. Wrap in try/catch with error handling

**Deliverables:**
- `app/src/app/api/consent/route.ts` created
- Handles anonymous consent (records IP + user agent)
- Handles authenticated consent (records user preferences)
- Stores consent version for tracking

**Verification:**
Review code logic for both authenticated and anonymous cases.

---

## Agent 2 Completion Checklist

- [ ] Database schema updated with 3 new tables
- [ ] SQL migration file created
- [ ] Staging database set up in Neon
- [ ] Migration applied to staging
- [ ] Tables verified in staging database
- [ ] Access request API created
- [ ] Deletion request API created with active order check
- [ ] Portability request API created with CSV/JSON/XML support
- [ ] Consent API created
- [ ] All 8 tasks completed
- [ ] Branch ready for review and merge
