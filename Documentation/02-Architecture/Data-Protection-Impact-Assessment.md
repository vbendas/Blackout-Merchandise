# Data Protection Impact Assessment (DPIA)

**Date:** January 21, 2026  
**Project:** MerchFrom - AI-Powered Merchandise Platform  
**Controller:** MerchFrom Ltd, Portugal  
**Data Protection Officer:** Victor Mendes - dpo@merchfrom.com  

---

## 1. Processing Overview

### Purpose
MerchFrom is an AI-powered premium merchandise platform that enables artists, brands, and companies to design, source, and sell high-quality merchandise through AI-managed workflows with professional visual tools.

### Data Types Processed
1. **Personal Identity Data** - Name, email addresses, profile images
2. **Financial Data** - Stripe customer IDs, payment information, pricing data
3. **Behavioral Data** - User interactions with AI agents, design preferences
4. **Communication Data** - Chat sessions, support tickets, feedback
5. **Technical Data** - IP addresses, user agents, device identifiers

### Data Subjects
- **Artists/Creators** - Content creators selling merchandise
- **Customers** - End consumers purchasing products
- **Website Visitors** - Anonymous users browsing the platform

### Data Recipients
1. **Clerk** - Authentication and user management
2. **Stripe** - Payment processing and financial services
3. **OpenRouter** - AI model access for Cat-Suite agents
4. **Neon/Cloudflare** - Database hosting and CDN services

---

## 2. Necessity Assessment

### Is the processing necessary for the performance of a contract?
✅ **Yes** - Financial data and personal identity information are essential for:
- Processing payments and transactions
- Fulfilling merchandise orders
- Providing user accounts and authentication
- Delivering AI-powered design services

### Is the processing required by law?
✅ **Yes** - Legal obligations require:
- Order data retention for 7 years (tax/commercial law)
- Financial transaction records (anti-money laundering)
- User consent records (GDPR compliance)

### Is there a legitimate interest?
✅ **Yes** - Legitimate interests include:
- Platform security and fraud prevention
- Service improvement and analytics
- Direct marketing with consent
- Prompt and workflow quality improvement (no personal data is used to train AI models)

---

## 3. Risk Assessment

| Risk | Likelihood | Severity | Mitigation Strategy |
|------|------------|----------|-------------------|
| Unauthorized access to user data | Medium | High | End-to-end encryption, MFA, role-based access |
| Data breach affecting customer financial information | Low | High | PCI compliance, Stripe tokenization, encryption |
| AI model data leakage | Low | Medium | Data anonymization, secure APIs, rate limiting |
| Consent withdrawal not properly processed | Medium | Medium | Automated consent management, audit trails |
| International data transfer violations | Low | High | SCCs, adequacy decisions, encryption |
| Retention policy non-compliance | Medium | Medium | Automated deletion cron jobs, retention policies |
| User rights fulfillment delays | Medium | Medium | Automated workflows, SLAs, dedicated processes |

---

## 4. Safeguards

### Technical Safeguards
- [x] **Encryption in Transit** - TLS 1.3 for all connections
- [x] **Encryption at Rest** - AES-256 for database storage
- [x] **Access Controls** - Role-based permissions, principle of least privilege
- [x] **Authentication** - Multi-factor authentication, passkeys
- [x] **API Security** - Rate limiting, authentication tokens
- [x] **Monitoring** - Real-time threat detection, audit logging

### Organizational Safeguards
- [x] **Data Protection Officer** - Dedicated DPO (Victor Mendes)
- [x] **Staff Training** - Regular GDPR and security awareness training
- [x] **Incident Response** - Established breach notification procedures

### Legal Safeguards
- [x] **Data Processing Agreement** - Contracts with all processors
- [x] **Standard Contractual Clauses** - For international transfers
- [x] **Privacy Policy** - Transparent data use disclosure

---

## 5. Data Subject Rights

### Implemented Rights
1. **Right to Access** - `/data-rights` → Request and receive personal data within 30 days
2. **Right to Deletion** - `/data-rights` → Account deletion with automatic cleanup
3. **Right to Portability** - `/data-rights` → Export data in JSON, CSV, or XML format
4. **Right to Rectification** - Profile settings → Update personal information
5. **Right to Withdraw Consent** - Privacy settings → Real-time consent management

### Response Times
- **Standard Requests:** 30 days maximum
- **Urgent Requests:** 15 days (data deletion)
- **Export Requests:** 7 days (automated)

---

## 6. International Data Transfers

### EU to US Transfers
MerchFrom processes data through several US-based service providers:

1. **Stripe** - Payment processing
2. **OpenRouter** - AI model access
3. **Cloudflare** - CDN and security

### Transfer Safeguards
- [x] **Standard Contractual Clauses** - Commission-approved SCCs for all processors
- [x] **Adequacy Decisions** - Rely on EU-US Data Privacy Framework when applicable
- [x] **Supplementary Measures** - Encryption, contractual commitments, data localization

### Data Residency
- Primary database: EU (Neon - Frankfurt)
- Backup: EU (Neon - Ireland)
- Cache: EU (Upstash Redis - Frankfurt)

---

## 7. Breach Notification

### 72-Hour Notification Process
1. **Detection** - Automated monitoring systems detect potential breach
2. **Assessment** - DPO and security team assess impact and scope
3. **Notification** - Report to CNPD (Portuguese DPA) within 72 hours
4. **Communication** - Notify affected individuals if high risk to rights/freedoms

### Breach Notification Team
- **Primary Contact:** Victor Mendes (DPO) - dpo@merchfrom.com
- **Technical Lead:** Security Team
- **Legal Counsel:** External privacy attorney
- **Communications:** PR/Comms team

### Notification Criteria
- Unauthorized access to personal data
- Accidental or unlawful destruction of data
- Data loss, alteration, or unauthorized disclosure
- Any breach affecting data subject rights and freedoms

---

## 8. Conclusion

### Assessment Result
**Acceptable** - The identified risks are effectively mitigated through the implemented safeguards. MerchFrom's data processing activities comply with GDPR requirements while enabling the core business functions.

### Residual Risk
**Low-Medium** - Primary residual risks relate to:
- Third-party processor dependencies (mitigated by SCCs and due diligence)
- AI model data access (mitigated by anonymization and secure APIs)
- International data transfers (mitigated by multiple legal safeguards)

### Review and Monitoring
- **Reviewer:** Victor Mendes (DPO)
- **Review Date:** January 21, 2026
- **Next Review:** January 21, 2027

---

## 9. Approval

### Internal Review
- [x] **DPO Approval:** Victor Mendes - January 21, 2026
- [x] **Technical Review:** CTO/Engineering Team - January 21, 2026
- [x] **Legal Review:** External Counsel - Pending

### External Review
- [ ] **Independent Privacy Auditor** - Recommended for Q2 2026
- [ ] **DPA Consultation** - Not required for current risk level

### Implementation Status
- [x] All technical safeguards implemented
- [x] All organizational measures in place
- [x] Data subject rights functional
- [x] Monitoring systems operational

### Next Steps
1. Schedule annual review for January 2027
2. Monitor regulatory changes affecting AI data processing
3. Consider privacy certification (ISO 27701) for Q3 2026
4. Conduct penetration testing by Q2 2026

---

**Document Classification:** Internal - Restricted  
**Version:** 1.0  
**Last Updated:** January 21, 2026