# Project Constraints

**Last Updated**: January 17, 2026
**Phase**: Phase 1 - MVP

Constraints that guide all decision-making for Merch-From.

---

## 💰 Financial Constraints

### Development Budget (Phase 1)
- Total: Bootstrapped (founder-funded)
- Runway: 6+ months
- External tool budget: Shared across projects

### Infrastructure Costs (Monthly)
| Service | Cost | Notes |
|---------|------|-------|
| Vercel hosting | ~$50-200 | Scales with traffic |
| Neon Database | ~$50 | Serverless PostgreSQL |
| Upstash Redis | ~$20 | Caching, sessions |
| Stripe fees | 2.9% + $0.30 | Per transaction (Phase 2) |
| Email service | TBD | Depends on volume |
| Cloudinary CDN | ~$20 | Image optimization |
| Other tools | ~$50 | Analytics, monitoring |
| **Total** | ~$200-400/month | Scales with growth |

### Marketing Budget (Phase 1)
- Landing page optimization: $0 (organic, word-of-mouth)
- Email service: Included in infrastructure
- Analytics: Free tier + paid observability

---

## 👥 Team & Resource Constraints

### Team Composition
- **Developer(s)**: 1-2 (or support from Claude)
- **Designer**: 1 (primary focus on visual design)
- **Product/Marketing**: Founder (Victor)
- **Operations**: Founder

### Skills & Expertise
**Strengths**:
- React & Next.js development
- Database design (PostgreSQL)
- UI/UX design and design systems
- Product strategy and market understanding
- AI/LLM integration experience

**External Partners**:
- Clerk (authentication as a service)
- Stripe (payments processing)
- OpenRouter (AI/LLM access)
- Deepgram (voice processing)
- Cloudinary (image hosting)

---

## ⏱️ Timeline Constraints

### Hard Deadlines
| Milestone | Target Date | Flexibility |
|-----------|------------|-------------|
| Phase 1 Launch | Feb 23, 2026 | ±1 week |
| 1,000 Signups | End of Phase 1 | ±2 weeks |
| Phase 2 Start | Mar 1, 2026 | ±1 week |

### Development Capacity
- **Sprint length**: 2 weeks
- **Dev availability**: 40-50 hours/week
- **Design availability**: 20-30 hours/week

---

## 🖥️ Technical Constraints

### Hosting & Performance
| Constraint | Target | Notes |
|-----------|--------|-------|
| Monthly bandwidth | 100GB | Scales with CDN |
| Storage (database) | 10GB | Initial phase |
| Max concurrent users | 1,000 | Phase 1 target |
| Uptime SLA | 99.5% | Acceptable downtime: 3.6 hrs/month |

### Browser & Device Support
| Platform | Support | Notes |
|----------|---------|-------|
| Desktop browsers | Chrome, Firefox, Safari, Edge | Last 2 versions |
| Mobile | iOS 12+, Android 8+ | Progressive enhancement |
| Responsive breakpoints | 640px, 1024px, 1280px | Mobile-first design |
| Accessibility | WCAG 2.1 AA | Keyboard nav, screen readers |

### Performance Standards
| Metric | Target | Hard Limit |
|--------|--------|-----------|
| Page load time | < 2s | < 3s |
| Largest Contentful Paint | < 2.5s | < 3.5s |
| First Input Delay | < 100ms | < 300ms |
| Cumulative Layout Shift | < 0.1 | < 0.25 |
| Bundle size | < 100KB gzipped | < 150KB |

---

## 📋 Data & Privacy Constraints

### Data Retention
- User emails: Keep indefinitely (for email list)
- User accounts: Keep indefinitely (for authentication)
- Analytics data: 24 months retention
- Logs: 7 days retention
- Deleted accounts: Purge after 30 days

### Privacy & Compliance
- **GDPR**: Compliant (privacy policy, consent, data deletion)
- **CCPA**: Compliant (disclosure, opt-out)
- **PCI**: Stripe handles payments (no card storage)
- **SOC 2**: Planned for Phase 3

---

## 🎨 Design & Brand Constraints

### Design System
- **Color palette**: Dark mode primary, gold accents
- **Typography**: Space Grotesk (headings), Inter (body)
- **Components**: Reusable across landing page and PWA
- **Animation**: Accessible, < 500ms duration

### Brand Guidelines
- **Tone**: Friendly, empowering, professional
- **Messaging**: Artist-centric, quality-focused
- **Visual identity**: Modern, premium, artistic
- **Approved assets**: Cat-Suite (Leopoldo, Francisca, Antonia)

---

## 🔐 Security Constraints

### Authentication
- Minimum password strength: 12 characters
- Multi-factor authentication: Optional (Phase 2)
- Session timeout: 7 days
- Password reset: Email-based

### API Security
- Rate limiting: 100 requests/minute per IP
- CORS: Restricted to known origins
- HTTPS: Required for all endpoints
- API keys: Rotate every 90 days

### Data Protection
- Database encryption: Neon default (TLS in transit)
- Sensitive data: No plain text storage
- Backups: Neon automated daily
- Audit logs: Enable for compliance

---

## 🌍 External API Constraints

### Rate Limits
| Service | Limit | Notes |
|---------|-------|-------|
| Clerk API | 600 req/min | Authentication |
| Stripe API | Varies | Payment processing |
| OpenRouter | TBD | LLM access |
| Deepgram | TBD | Speech-to-text |

### Uptime Requirements
- Email service: 99.9% uptime
- Payment service: 99.9% uptime
- Database: 99.5% uptime
- Graceful degradation for non-critical services

---

## 📚 Related Documents

- **Roadmap**: Roadmap.md - Timeline and phases
- **PRD**: PRD.md - Product requirements
- **Success Metrics**: Success-Metrics.md - KPIs and targets

---

**Owner**: Victor Bendas
**Last Updated**: January 17, 2026
**Next Review**: End of Phase 1
