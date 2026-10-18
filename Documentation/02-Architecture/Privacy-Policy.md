# Privacy Implementation Guide

**Project:** Blackout Merchandise - AI-Powered Merchandise Platform  
**Framework:** GDPR Compliance Implementation  
**Last Updated:** January 21, 2026  

---

## Overview

Blackout Merchandise implements comprehensive GDPR compliance across all platform operations. This guide provides developers with implementation details, testing procedures, and maintenance requirements for privacy features.

### Platform Purpose
AI-powered merchandise platform enabling artists, brands, and companies to design, source, and sell premium quality merchandise through AI-managed workflows with professional visual tools.

---

## Data Subject Rights Implementation

### 1. Right to Access
**Route:** `/data-rights` → Request data access  
**Implementation:** `app/src/app/api/data-rights/route.ts`

**Features:**
- Users can request complete personal data export
- Automated data collection from all database tables
- Response within 30 days (typically 24-48 hours)
- Support for JSON, CSV, and XML formats

**API Endpoint:**
```typescript
POST /api/data-rights
{
  "requestType": "access",
  "format": "json" | "csv" | "xml"
}
```

### 2. Right to Deletion
**Route:** `/data-rights` → Delete account  
**Implementation:** `app/src/app/api/data-rights/route.ts`

**Features:**
- Complete account deletion
- Automatic cleanup of all related data
- Consents, orders, chat sessions deleted
- Stripe customer data archived per legal requirements

**API Endpoint:**
```typescript
POST /api/data-rights
{
  "requestType": "deletion"
}
```

### 3. Right to Portability
**Route:** `/data-rights` → Export data  
**Implementation:** Same as access right with format options

**Features:**
- Machine-readable formats
- Complete data history
- Structured data export
- Download link with expiration

---

## Consent Management

### Consent Banner Implementation
**Component:** `app/src/components/privacy/ConsentFooterBanner.tsx`  
**Layout:** Integrated in `app/src/app/layout.tsx`

**Consent Categories:**
1. **Essential** - Required for platform operation
2. **Analytics** - Usage statistics, performance monitoring
3. **Marketing** - Promotional communications, recommendations

### Consent Storage
**Table:** `consents` (schema.ts)  
**Fields:** consentType, granted, grantedAt, withdrawnAt, ipAddress, userAgent

**Implementation:**
```typescript
// Record consent grant
await db.insert(consents).values({
  userId,
  consentType: 'analytics',
  granted: true,
  grantedAt: new Date(),
  method: 'explicit_opt_in',
  ipAddress,
  userAgent,
});

// Withdraw consent
await db.update(consents)
  .set({
    granted: false,
    withdrawnAt: new Date(),
    method: 'withdrawn'
  })
  .where(eq(consents.userId, userId));
```

### Consent Management UI
**Route:** `/settings/privacy`  
**Features:**
- Real-time consent status
- Granular control by category
- Withdraw any consent type
- View consent history

---

## Data Retention Policies

### Automated Retention
**Cron Job:** `app/src/app/cron/retention/route.ts`  
**Schedule:** Daily at 2 AM UTC  
**Configuration:** `vercel.json`

### Retention Periods

| Data Type | Retention Period | Legal Basis | Automated Cleanup |
|-----------|------------------|-------------|-------------------|
| User Accounts | 2 years from last activity | Data minimization | ✅ Daily cron |
| Order Data | 7 years from creation | Tax/Commercial law | ❌ Legal requirement |
| Consents | Until withdrawn + 30 days | GDPR accountability | ✅ Daily cron |
| Analytics Data | 26 months then anonymize | Legitimate interest | ⏸️ Future feature |
| Chat Sessions | 1 year from last activity | Service improvement | ⏸️ Future feature |

### Deletion Logic
```typescript
// Delete inactive customers (2+ years)
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

await db.delete(users)
  .where(and(
    eq(users.role, 'customer'),
    lt(users.updatedAt, twoYearsAgo)
  ));

// Delete withdrawn consents (30+ days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

await db.delete(consents)
  .where(and(
    eq(consents.granted, false),
    lt(consents.withdrawnAt, thirtyDaysAgo)
  ));
```

---

## Data Protection Officer

### Contact Information
**Name:** Victor Mendes  
**Title:** Data Protection Officer  
**Email:** dpo@blackoutmerch.example  
**Location:** Portugal  

### Responsibilities
- GDPR compliance oversight
- Data subject request coordination
- Breach notification management
- Regulatory authority liaison
- Privacy impact assessments

### Escalation Procedures
1. **Standard Issues:** Contact dpo@blackoutmerch.example
2. **Urgent Matters:** Mark email "URGENT - GDPR"
3. **Breach Reporting:** Immediately notify within 24 hours
4. **Regulatory Inquiries:** Forward to DPO immediately

---

## Security Implementation

### Encryption
- **In Transit:** TLS 1.3 for all connections
- **At Rest:** AES-256 database encryption
- **API Keys:** Encrypted environment variables
- **User Data:** Encrypted fields where applicable

### Access Controls
- **Authentication:** Clerk with MFA
- **Authorization:** Role-based access control
- **Database:** Connection pooling, read replicas
- **APIs:** Rate limiting, authentication tokens

### Monitoring
- **Real-time:** Security event logging
- **Automated:** Threat detection alerts
- **Regular:** Security scans, penetration testing
- **Compliance:** Monthly GDPR compliance reports

---

## Testing Procedures

### Consent Flow Testing

#### Test Scenario 1: First-Time User
1. Clear browser data
2. Visit homepage
3. Verify consent banner appears
4. Grant analytics consent
5. Check database for consent record
6. Verify cookie preferences saved

#### Test Scenario 2: Consent Withdrawal
1. Log in with existing account
2. Navigate to `/settings/privacy`
3. Withdraw marketing consent
4. Verify consent record updated
5. Check withdrawnAt timestamp
6. Verify marketing emails stop

#### Test Scenario 3: Consent Banner Rejection
1. Clear browser data
2. Visit homepage
3. Reject all optional consents
4. Verify essential features still work
5. Check analytics tracking disabled
6. Verify no marketing cookies set

### Data Rights API Testing

#### Test Scenario 1: Data Access Request
```bash
curl -X POST http://localhost:3000/api/data-rights \
  -H "Content-Type: application/json" \
  -d '{"requestType": "access", "format": "json"}' \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response:**
- Status: 200
- Response: Download link
- Timeline: Within 30 minutes
- Format: Valid JSON

#### Test Scenario 2: Deletion Request
```bash
curl -X POST http://localhost:3000/api/data-rights \
  -H "Content-Type: application/json" \
  -d '{"requestType": "deletion"}' \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response:**
- Status: 200
- Response: Confirmation message
- Action: Account marked for deletion
- Timeline: Within 24 hours

#### Test Scenario 3: Portability Request
```bash
curl -X POST http://localhost:3000/api/data-rights \
  -H "Content-Type: application/json" \
  -d '{"requestType": "portability", "format": "csv"}' \
  -H "Authorization: Bearer <user-token>"
```

**Expected Response:**
- Status: 200
- Response: Download link
- Format: Valid CSV
- Content: Complete user data

### Retention Policy Testing

#### Test Scenario 1: Inactive User Cleanup
1. Create test user with role='customer'
2. Set updatedAt to 2+ years ago
3. Run retention cron manually
4. Verify user deleted
5. Verify related data cleaned up

#### Test Scenario 2: Consent Expiration
1. Create withdrawn consent record
2. Set withdrawnAt to 30+ days ago
3. Run retention cron manually
4. Verify consent deleted
5. Check logs for deletion count

---

## Webhook Integration

### Clerk Webhook Events
**Endpoint:** `app/src/app/api/webhooks/clerk/route.ts`

**Handled Events:**
- `user.created` - Create user record
- `user.updated` - Update user information  
- `user.deleted` - **CRITICAL** - Cleanup all GDPR data

### User Deletion Flow
1. Clerk sends `user.deleted` event
2. Webhook extracts clerkUserId
3. Find user in database
4. Delete consents (cascade)
5. Delete data subject requests
6. Log cleanup completion

### Testing Webhooks
```bash
# Use Clerk webhook testing tool
# Send test user.deleted event
# Verify cleanup in database
# Check logs for completion
```

---

## Environment Variables

### Required for Privacy Features
```bash
# Cron Job Security
CRON_SECRET=REDACTED

# Clerk Integration
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Database (for data operations)
DATABASE_URL=postgresql://...

# Logging/Monitoring
LOG_LEVEL=info
PRIVACY_LOG_RETENTION=90d
```

### Security Notes
- Never commit secrets to repository
- Use Vercel environment variables
- Rotate secrets quarterly
- Monitor for unauthorized access

---

## Monitoring and Alerts

### Key Metrics
- Data subject request response times
- Consent grant/withdrawal rates
- Data deletion completion rates
- Security incident counts

### Alert Triggers
- Failed deletion operations
- Unusual data access patterns
- Webhook delivery failures
- Retention policy violations

### Dashboard Integration
- Privacy metrics in admin dashboard
- Real-time consent analytics
- GDPR compliance score
- Incident response tracker

---

## Maintenance Schedule

### Monthly
- Review data subject request backlog
- Update consent banner copy
- Verify webhook functionality
- Check retention policy compliance

### Quarterly
- Full GDPR compliance audit
- Security penetration testing
- DPIA review and updates
- Staff training refreshers

### Annually
- Complete privacy impact assessment
- External audit (recommended)
- Policy and procedure updates
- Regulatory compliance review

---

## Incident Response

### Data Breach Procedure
1. **Detection** - Automated monitoring alerts
2. **Assessment** - DPO and security team evaluate (within 4 hours)
3. **Containment** - Secure systems, prevent further loss
4. **Notification** - Report to DPA within 72 hours
5. **Communication** - Notify affected individuals if high risk

### Contact Information
- **DPO:** Victor Mendes - dpo@blackoutmerch.example
- **Security Team:** security@blackoutmerch.example
- **Legal Counsel:** legal@blackoutmerch.example

---

## Documentation Updates

### Required Updates
- Any new data processing activities
- Changes to data retention policies
- New service provider integrations
- Regulatory requirement changes

### Review Schedule
- **Document Review:** Quarterly
- **Technical Review:** Monthly
- **Legal Review:** Annually
- **External Audit:** Biennially

---

## Compliance Verification

### Self-Assessment Checklist
- [ ] All consent mechanisms functional
- [ ] Data subject rights implemented
- [ ] Retention policies automated
- [ ] Webhook handlers working
- [ ] Security measures in place
- [ ] Documentation current
- [ ] Staff trained
- [ ] Monitoring operational

### External Validation
- [ ] ISO 27701 certification (planned Q3 2026)
- [ ] Third-party privacy audit
- [ ] Regulatory inspection readiness
- [ ] Customer trust marks

---

**Document Status:** Active  
**Next Review:** April 21, 2026  
**Maintained By:** Victor Mendes (DPO)  
**Distribution:** Engineering Team, Legal Team, Management