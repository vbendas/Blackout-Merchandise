# Waitlist Landing Page

**Status**: 🔄 In Progress
**Phase**: Phase 1 - MVP
**Timeline**: Complete by Jan 26, 2026

---

## 📋 Overview

The waitlist landing page is the primary funnel for collecting email signups and building initial audience before full product launch.

### Key Metrics (Phase 1)
- Target signups: 1,000
- Conversion rate: 5-10%
- Mobile conversion: 4-8%
- Page load time: < 2 seconds
- Email open rate: > 30%

---

## 🎯 Key Features

### 1. Hero Section ✅
- Strong value proposition
- Hero image or video
- Primary CTA button
- Status: Complete

### 2. Feature Showcase ✅
- 3-5 key features with icons
- Brief descriptions
- Visual emphasis
- Status: Complete

### 3. Social Proof ✅
- Avatar trio (Leopoldo, Francisca, Antonia)
- Team information
- Platform benefits
- Status: Complete

### 4. Waitlist CTA Section ✅
- Email signup form
- Compelling copy
- Submit button
- Success messaging
- Status: Complete (needs email integration)

### 5. Footer ✅
- Navigation links
- Company info
- Social media links
- Status: Complete

---

## 📝 Copy & Messaging

### Hero Headline
"Premium Merch For Artists Who Give a Damn"

### Hero Subheadline
"Design, produce, and sell premium merchandise with zero commission. Leopoldo, Francisca, and Antonia handle the hard parts."

### Key Value Props
1. **Zero Commission** - Keep 100% of profits
2. **Premium Quality** - Vegan, fair-trade, eco-friendly
3. **Expert Guidance** - Your dedicated team handles design, sourcing, and logistics
4. **No Upfront Cost** - For qualified creators
5. **In-House Production** - Every piece produced in our Portugal facility

---

## 📊 Forms & Data Collection

### Waitlist Form Fields
- **Email** (required)
- **Name** (optional)
- **Creator/Artist** (checkbox)
- **GDPR Consent** (checkbox)

### Form Validation
- Email: Valid format
- Name: Min 2 chars (if provided)
- Consent: Must be checked
- Spam protection: TBD (CAPTCHA or rate limiting)

### Success Message
"You're on the list! Check your email for a special welcome from our cat crew."

---

## 🎨 Design Elements

### Brand Colors
- Background: #000000 (pure black)
- Text: #FFFFFF
- Accents: Gold gradient (#D4AF37, #F5E6A3)
- Error: #ef4444

### Typography
- Heading: Space Grotesk (bold, uppercase for emphasis)
- Body: Inter (clean, readable)
- CTA: Bold, 18px+

### Animations
- Fade-in on scroll (Framer Motion)
- Hover effects on CTAs
- Floating elements (optional)

---

## 📱 Responsive Design

### Mobile (< 640px)
- Single column layout
- Large touch targets (44px minimum)
- Readable font sizes
- Optimized for vertical scrolling

### Tablet (640px - 1024px)
- 2-column grid where appropriate
- Balanced whitespace
- Medium font sizes

### Desktop (> 1024px)
- Full-width layout
- 3+ column grids
- Optimal reading line length
- Maximum 1200px container width

---

## 🚀 Email Integration

### Email Service (TBD)
Options: Mailgun, SendGrid, Brevo, Loops

### Email Sequences
1. **Welcome Email** (immediate)
   - Thank you for joining
   - Introduce Cat-Suite
   - Link to Discord (when ready)

2. **Day 1 Email**
   - Sneak peek of platform
   - What to expect

3. **Day 7 Email**
   - Feature highlight
   - Exclusive offer or preview

### Success Criteria
- 95%+ deliverability
- 30%+ open rate
- 5%+ click rate

---

## 📊 Analytics Setup

### Events to Track
- Page view
- Form view
- Form submission (success/failure)
- Form abandonment (by field)
- Email click (in email template)

### Platforms
- Google Analytics 4
- Email service dashboard
- Sentry (error tracking)

---

## ✅ Launch Checklist

### Before Launch
- [ ] Email service integrated
- [ ] Form validation working
- [ ] Error handling in place
- [ ] Success message displays
- [ ] Mobile responsive verified
- [ ] Page load < 2s
- [ ] Core Web Vitals green
- [ ] Analytics configured
- [ ] Spam protection active
- [ ] Copy proofread

### Post-Launch
- [ ] Monitor signup rate daily
- [ ] Check email deliverability
- [ ] Monitor error logs
- [ ] A/B test copy (if low conversion)
- [ ] Adjust based on user feedback

---

## 🔗 Related Documents

- **Design System**: ../../05-Shared/Design-System.md
- **Website**: ../02-Website/
- **Success Metrics**: ../../00-PRD-Roadmap/Success-Metrics.md

---

**Owner**: Victor Bendas
**Last Updated**: January 17, 2026
**Status**: 80% Complete
