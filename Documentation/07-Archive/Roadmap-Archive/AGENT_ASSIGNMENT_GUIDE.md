# Agent Assignment Guide

**Document Version:** 1.0  
**Based on:** PRD v3.1 + Roadmap Tasks v3.1  
**Status:** Ready for Assignment

---

## 🎯 QUICK REFERENCE

### **Agent Roles & Focus**

| Agent | Focus Area | Primary Tasks | Estimated Time |
|-------|------------|---------------|----------------|
| **Agent 1** | Database Specialist | CRUD operations, schema, migrations | 3-4 days |
| **Agent 2** | API Specialist | API routes, integrations, webhooks | 3-4 days |
| **Agent 3** | Frontend Specialist | UI components, dashboards, interfaces | 3-4 days |
| **Agent 4** | Full-Stack Specialist | End-to-end features, integration | 3-4 days |
| **Agent 5** | AI Specialist | AI models, training, optimization | 3-4 days |
| **Agent 6** | Operations Specialist | Founder mitigation, hiring, processes | 2-3 days |

---

## 📋 TASK BREAKDOWN BY AGENT

### **AGENT 1: Database Specialist**

**Total Tasks:** 10  
**Estimated Time:** 3-4 days  
**Priority:** HIGH

#### **Week 1 Tasks:**
1. **4.1.1** Create User Operations (4 hours)
   - Create `/src/db/users.ts`
   - Implement CRUD functions
   - Test with sample data

2. **4.1.2** Create Product Operations (4 hours)
   - Create `/src/db/products.ts`
   - Implement CRUD functions
   - Test with sample data

3. **4.1.3** Create Order Operations (4 hours)
   - Create `/src/db/orders.ts`
   - Implement CRUD functions
   - Test with sample data

4. **4.1.4** Create Store Operations (3 hours)
   - Create `/src/db/stores.ts`
   - Implement CRUD functions
   - Test with sample data

5. **4.1.5** Update Clerk Webhook (2 hours)
   - Replace raw Drizzle queries
   - Use new CRUD functions
   - Test webhook

#### **Week 2 Tasks:**
6. **4.2.1** Add Waitlist Table to Schema (2 hours)
   - Add table to `/src/db/schema.ts`
   - Run migration
   - Verify in database

7. **4.2.2** Create Waitlist DB Operations (3 hours)
   - Create `/src/db/waitlist.ts`
   - Implement functions
   - Test with sample data

8. **4.6.1** Install Email SDK (1 hour)
   - Install Resend or SendGrid
   - Add to environment variables
   - Create wrapper

9. **4.6.2-4.6.5** Create Email System (4 hours)
   - Create transactional email templates
   - Create marketing email templates
   - Integrate with order flow

**Success Criteria:**
- All CRUD operations implemented and tested
- Waitlist data persists to database
- Email system operational
- No TypeScript errors

---

### **AGENT 2: API Specialist**

**Total Tasks:** 11  
**Estimated Time:** 3-4 days  
**Priority:** HIGH

#### **Week 1 Tasks:**
1. **4.2.3** Update Waitlist API Route (3 hours)
   - Update `/mainpage/src/app/api/waitlist/route.ts`
   - Add database integration
   - Add validation (Zod)
   - Add error handling

2. **4.2.4** Add Email Service (2 hours)
   - Integrate Resend/SendGrid
   - Create email templates
   - Test email sending

3. **4.2.5** Add Rate Limiting (2 hours)
   - Implement rate limiting
   - Apply to waitlist route
   - Test rate limits

4. **5.3.1** Create Stripe Webhook Route (4 hours)
   - Create `/app/src/app/api/webhooks/stripe/route.ts`
   - Implement signature verification
   - Handle checkout.session.completed
   - Create order in database
   - Send confirmation email

#### **Week 2 Tasks:**
5. **5.3.2** Update Order Creation (2 hours)
   - Update `/app/src/db/orders.ts`
   - Add storeId to createOrder()
   - Handle currency conversion

6. **5.3.3** Create Cart System (3 hours)
   - Create `/app/src/lib/cart.ts`
   - Zustand store for cart state
   - Add to cart functionality
   - Persist to localStorage

7. **5.3.4** Create Checkout Flow (4 hours)
   - Create `/app/src/app/checkout/page.tsx`
   - Cart review
   - Shipping address
   - Stripe Payment Element
   - Order confirmation

8. **5.3.5** Test End-to-End Purchase (2 hours)
   - Add product to cart
   - Complete checkout (test mode)
   - Verify webhook fires
   - Verify order created
   - Verify email sent

#### **Week 3 Tasks:**
9. **5.1.1** Set Up MiMo-V2-Flash (3 hours)
   - Get OpenRouter API key
   - Create MiMo wrapper
   - Test basic conversation

10. **5.1.2** Set Up Self-Hosted Flux (4 hours)
    - Get Flux1.dev license
    - Set up Hivelocity GPU
    - Create Flux wrapper
    - Test image generation

11. **5.1.3-5.1.5** Set Up U-Net & OpenCV (4 hours)
    - Deploy U-Net on GPU
    - Create U-Net wrapper
    - Create OpenCV wrapper
    - Test color separation & halftoning

**Success Criteria:**
- All API routes implemented and tested
- Stripe webhook handles payments correctly
- AI services integrated
- No security vulnerabilities

---

### **AGENT 3: Frontend Specialist**

**Total Tasks:** 15  
**Estimated Time:** 3-4 days  
**Priority:** MEDIUM

#### **Week 1 Tasks:**
1. **4.3.1** Create Admin Dashboard Layout (2 hours)
   - Create `/app/src/app/admin/layout.tsx`
   - Protected route (admin only)
   - Sidebar navigation
   - Header with user info

2. **4.3.2** Artist Management Page (3 hours)
   - Create `/app/src/app/admin/artists/page.tsx`
   - List all artists
   - Approve/reject buttons
   - View analytics
   - Suspend functionality

3. **4.3.3** Order Management Page (3 hours)
   - Create `/app/src/app/admin/orders/page.tsx`
   - List all orders with filters
   - View order details
   - Update order status
   - Handle refunds

4. **4.3.4** Financial Reporting Page (3 hours)
   - Create `/app/src/app/admin/financial/page.tsx`
   - Revenue dashboard
   - Cost breakdown
   - Profit margins
   - Payout tracking

#### **Week 2 Tasks:**
5. **4.3.5** Inventory Tracking Page (2 hours)
   - Create `/app/src/app/admin/inventory/page.tsx`
   - Stock levels
   - Reorder alerts
   - Supplier management

6. **4.3.6** System Monitoring Page (2 hours)
   - Create `/app/src/app/admin/monitoring/page.tsx`
   - AI cost tracking
   - API uptime monitoring
   - Error logging
   - Performance metrics

7. **4.5.1** Create Artist Dashboard (3 hours)
   - Create `/app/src/app/dashboard/page.tsx`
   - Sales overview
   - Daily/weekly/monthly trends
   - Best-selling products
   - Conversion rates

8. **4.5.2** Create Product Performance (2 hours)
   - Create `/app/src/app/dashboard/products/page.tsx`
   - Views per product
   - Add-to-cart rate
   - Purchase rate
   - Revenue per product

#### **Week 3 Tasks:**
9. **4.5.3** Create Customer Insights (2 hours)
   - Create `/app/src/app/dashboard/customers/page.tsx`
   - Demographics
   - Repeat purchase rate
   - Average order value
   - Customer lifetime value

10. **4.5.4** Create AI Usage Dashboard (2 hours)
    - Create `/app/src/app/dashboard/ai/page.tsx`
    - Designs generated
    - AI costs incurred
    - Model usage breakdown
    - Cost per design

11. **4.5.5** Create Platform Analytics (3 hours)
    - Create `/app/src/app/admin/analytics/page.tsx`
    - Growth metrics
    - Financial metrics
    - Retention metrics
    - AI metrics

12. **5.2.2** Update Frontend Chat (3 hours)
    - Update `/app/src/components/ChatPanel.tsx`
    - Remove mock data
    - Connect to real API
    - Handle streaming responses
    - Add error handling

13. **5.2.3** Implement Conversation Logging (2 hours)
    - Create `/app/src/lib/ai/conversation-logger.ts`
    - Log all conversations
    - Tag by intent, persona, success
    - Store in database

14. **5.2.4** Test End-to-End Chat (2 hours)
    - Test with MiMo-V2-Flash
    - Verify response quality
    - Verify conversation logging
    - Test error handling

15. **5.4.3** Update Platform Analytics (2 hours)
    - Connect to analytics API
    - Display growth metrics
    - Display financial metrics
    - Display retention metrics
    - Display AI metrics

**Success Criteria:**
- All dashboards render correctly
- Data displays accurately
- UI is responsive and polished
- No console errors

---

### **AGENT 4: Full-Stack Specialist**

**Total Tasks:** 12  
**Estimated Time:** 3-4 days  
**Priority:** MEDIUM

#### **Week 1 Tasks:**
1. **4.4.1** Create Ticket Management (3 hours)
   - Create `/app/src/app/support/tickets/page.tsx`
   - Create ticket form
   - List tickets (open, in-progress, resolved)
   - Assign to agents
   - Status tracking

2. **4.4.2** Create FAQ/Knowledge Base (3 hours)
   - Create `/app/src/app/support/faq/page.tsx`
   - Searchable articles
   - Categorized
   - Video tutorials (embedded)
   - Regular updates

3. **4.4.3** Create Live Chat (Optional) (3 hours)
   - Create `/app/src/app/support/chat/page.tsx`
   - Cat-Suite agents handle first tier
   - Escalate to human if needed
   - Chat history and transcripts
   - Integration with ticket system

4. **4.4.4** Create Email Integration (2 hours)
   - Create `/app/src/app/support/email/page.tsx`
   - support@merchfrom.com integration
   - Auto-responses
   - Ticket creation from email
   - Reply tracking

#### **Week 2 Tasks:**
5. **5.2.1** Update Chat API Route (3 hours)
   - Update `/app/src/app/api/chat/route.ts`
   - Remove mock data
   - Connect to MiMo via router
   - Implement streaming response
   - Add conversation logging

6. **5.2.2** Update Frontend Chat (3 hours)
   - Update `/app/src/components/ChatPanel.tsx`
   - Remove mock conversation hook
   - Connect to real API
   - Handle streaming responses
   - Add error handling

7. **5.2.3** Implement Conversation Logging (2 hours)
   - Create `/app/src/lib/ai/conversation-logger.ts`
   - Log all conversations to database
   - Tag by intent, persona, success
   - Store for future fine-tuning

8. **5.2.4** Test End-to-End Chat (2 hours)
   - Test with MiMo-V2-Flash
   - Verify response quality
   - Verify conversation logging
   - Test error handling

#### **Week 3 Tasks:**
9. **6.3.1** Create Beta Test Plan (3 hours)
   - Define test scope
   - Define success criteria
   - Create test cases
   - Set up monitoring

10. **6.3.2** Recruit Beta Artists (2 hours)
    - Identify 10-20 artists
    - Send invitations
    - Onboard first cohort
    - Set up communication

11. **6.3.3** Create Beta Onboarding Flow (3 hours)
    - Guide artists through store creation
    - Guide through first design
    - Collect feedback
    - Track metrics

12. **6.3.4** Set Up Monitoring & Analytics (2 hours)
    - Track usage metrics
    - Track error rates
    - Track user satisfaction
    - Set up alerts

**Success Criteria:**
- Support system operational
- Chat works with real AI
- Beta test plan complete
- Monitoring in place

---

### **AGENT 5: AI Specialist**

**Total Tasks:** 10  
**Estimated Time:** 3-4 days  
**Priority:** HIGH

#### **Week 1 Tasks:**
1. **5.1.1** Set Up MiMo-V2-Flash (3 hours)
   - Get OpenRouter API key
   - Add to environment variables
   - Create MiMo wrapper in `/app/src/lib/ai/mimo.ts`
   - Test basic conversation

2. **5.1.2** Set Up Self-Hosted Flux (4 hours)
   - Get Flux1.dev commercial license
   - Set up Hivelocity GPU server
   - Install Flux dependencies
   - Create Flux wrapper in `/app/src/lib/ai/flux.ts`
   - Test image generation

3. **5.1.3** Set Up Attention U-Net (3 hours)
   - Deploy U-Net on Hivelocity GPU
   - Create U-Net wrapper in `/app/src/lib/ai/unet.ts`
   - Test color separation
   - Integrate with OpenCV

4. **5.1.4** Set Up OpenCV (2 hours)
   - Install OpenCV (Python or Node.js)
   - Create halftoning wrapper in `/app/src/lib/ai/opencv.ts`
   - Test halftone generation
   - Integrate with U-Net

5. **5.1.5** Create AI Router (2 hours)
   - Create `/app/src/lib/ai/router.ts`
   - Route to MiMo for all reasoning
   - Route to Flux for image generation
   - Route to U-Net for color separation
   - Route to OpenCV for halftoning

#### **Week 2 Tasks:**
6. **5.2.1** Update Chat API Route (3 hours)
   - Update `/app/src/app/api/chat/route.ts`
   - Connect to MiMo via router
   - Implement streaming response
   - Add conversation logging

7. **7.2.1** Log All Conversations (2 hours)
   - Store in structured format
   - Tag by intent, persona, success
   - Anonymize user data
   - Backup regularly

8. **7.2.2** Label Examples (3 hours)
   - Review conversations
   - Label intents
   - Label personas
   - Label success/failure

9. **7.2.3** Prepare Training Dataset (2 hours)
   - Clean and anonymize
   - Split into train/validation/test
   - Target: 10,000+ examples by Month 6

10. **7.2.4** Monitor Data Quality (2 hours)
    - Track labeling accuracy
    - Track dataset growth
    - Ensure diversity
    - Remove low-quality examples

#### **Week 3 Tasks:**
11. **8.2.1** Prepare Training Data (4 hours)
    - Collect 50,000+ conversation examples
    - Clean and label data
    - Split into train/validation/test
    - Ensure quality

12. **8.2.2** Fine-Tune Llama 3.1 8B (6 hours)
    - Set up Hivelocity GPU
    - Install Llama dependencies
    - Fine-tune with LoRA
    - Test against MiMo baseline

13. **8.2.3** Deploy Fine-Tuned Model (3 hours)
    - Deploy on Hivelocity GPU
    - Create API endpoint
    - Test with real conversations
    - A/B test vs MiMo

14. **8.2.4** Switch Traffic Gradually (2 hours)
    - Start with 10% traffic
    - Monitor quality and performance
    - Gradually increase to 100%
    - Keep MiMo as fallback

**Success Criteria:**
- All AI services integrated
- Conversations logged and labeled
- Training dataset ready
- Fine-tuned Llama matches MiMo quality

---

### **AGENT 6: Operations Specialist**

**Total Tasks:** 10  
**Estimated Time:** 2-3 days  
**Priority:** HIGH

#### **Week 1 Tasks:**
1. **4.7.1** Create SOP Documentation Library (3 hours)
   - Create `/Documentation/SOPs/` directory
   - Document production workflows
   - Document platform workflows
   - Create video tutorials
   - Make accessible via internal wiki

2. **4.7.2** Create AI Training for Production (3 hours)
   - Create `/Documentation/AI_Training/` directory
   - Collect 500+ production scenarios
   - Fine-tune Llama 3.1 8B (self-hosted)
   - Deploy as internal assistant
   - Test with production team

3. **4.7.3** Contract Brazilian Agency (2 hours)
   - Research agencies
   - Send proposal
   - Negotiate contract (€1,500-2,000/month)
   - Onboard agency
   - Set up communication channels

4. **4.7.4** Create Production Manager Job Description (2 hours)
   - Define role and responsibilities
   - Set requirements (3-5 years experience)
   - Define compensation (€1,400/month + profit-sharing)
   - Post job listing
   - Interview candidates

5. **4.7.5** Create Expert Panel Workflow (2 hours)
   - Define review process (weekly, 10% of samples)
   - Set up communication channels
   - Create feedback templates
   - Train panel on quality rubric

#### **Week 2 Tasks:**
6. **6.1.1** Hire Production Manager (4 hours)
   - Post job listing
   - Review candidates
   - Interview (2-3 candidates)
   - Make offer
   - Onboard (Month 7-8)

7. **6.1.2** Contract Brazilian Agency (2 hours)
   - Finalize contract
   - Set up communication
   - Define scope of work
   - Start design support

8. **6.1.3** Create Onboarding Materials (3 hours)
   - SOP documentation
   - Training videos
   - Quality rubric
   - Communication guidelines

9. **6.2.1** Secure Portugal Facility (2 hours)
   - Finalize lease agreement
   - Set up utilities
   - Install equipment
   - Test production flow

10. **6.2.2** Install Equipment (2 hours)
    - Anatol VOLT-M press
    - Brother GTX Pro
    - Dryer, flash, pretreatment
    - Workstations and storage

**Success Criteria:**
- SOP library complete
- Brazilian agency contracted
- Production manager hired
- Facility ready

---

## 📊 TASK TRACKING TEMPLATE

### **Per Agent Task Card:**

```
Task: [Task Number] [Task Name]
Agent: [Agent Name]
Priority: [HIGH/MEDIUM/LOW]
Estimated Time: [X hours]
Files: [List of files to create/modify]

Subtasks:
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

Success Criteria:
- [ ] Criterion 1
- [ ] Criterion 2

Status: ⏳ Pending / 🔄 In Progress / ✅ Complete
```

### **Daily Standup Template:**

```
Date: [Date]
Agent: [Agent Name]

Yesterday:
- [ ] Task completed
- [ ] Blockers encountered

Today:
- [ ] Task to work on
- [ ] Expected completion

Blockers:
- [ ] Any blockers?

Notes:
- [ ] Additional notes
```

### **Weekly Review Template:**

```
Week: [Week Number]
Date: [Date]

Completed Tasks:
- [ ] Task 1
- [ ] Task 2

In Progress:
- [ ] Task 3 (X% complete)

Blockers:
- [ ] Blocker 1

Next Week:
- [ ] Task 4
- [ ] Task 5
```

---

## 🚀 EXECUTION CHECKLIST

### **Before Starting:**
- [ ] Review PRD v3.1
- [ ] Review Roadmap Tasks v3.1
- [ ] Assign agents to tasks
- [ ] Set up project management tool
- [ ] Create daily standup schedule
- [ ] Set up communication channels (Slack, Discord, etc.)
- [ ] Verify environment variables
- [ ] Verify API keys (OpenRouter, Stripe, etc.)

### **Week 1 Execution:**
- [ ] Agent 1: Start database CRUD operations
- [ ] Agent 2: Start API routes (waitlist, Stripe)
- [ ] Agent 3: Start admin dashboard
- [ ] Agent 4: Start customer support system
- [ ] Agent 5: Start AI stack setup
- [ ] Agent 6: Start founder mitigation tasks
- [ ] Daily standups at 9:00 AM
- [ ] Friday demo at 4:00 PM

### **Week 2 Execution:**
- [ ] Agent 1: Continue database operations (email, waitlist)
- [ ] Agent 2: Continue API routes (Stripe webhook, AI)
- [ ] Agent 3: Continue dashboards (analytics)
- [ ] Agent 4: Continue support system + chat
- [ ] Agent 5: Continue AI integration + data collection
- [ ] Agent 6: Continue hiring + facility setup
- [ ] Daily standups at 9:00 AM
- [ ] Friday demo at 4:00 PM

### **Week 3 Execution:**
- [ ] Agent 1: Email system completion
- [ ] Agent 2: AI integration completion
- [ ] Agent 3: Analytics completion
- [ ] Agent 4: Beta test prep
- [ ] Agent 5: Data collection setup
- [ ] Agent 6: Production setup
- [ ] Daily standups at 9:00 AM
- [ ] Friday demo at 4:00 PM

### **Week 4-6 Execution:**
- [ ] All agents: Bug fixes, optimization, polish
- [ ] Daily standups at 9:00 AM
- [ ] Friday demo at 4:00 PM
- [ ] Prepare for beta launch

### **Week 7-12 Execution (Beta):**
- [ ] Agent 1-5: Support beta launch
- [ ] Agent 6: Production management
- [ ] Daily standups at 9:00 AM
- [ ] Friday demo + feedback session

---

## 📈 SUCCESS METRICS

### **Per Agent:**
- **Agent 1 (Database):** All CRUD operations tested, no errors
- **Agent 2 (API):** All routes working, secure, documented
- **Agent 3 (Frontend):** All dashboards rendering, responsive
- **Agent 4 (Full-Stack):** End-to-end features working
- **Agent 5 (AI):** AI services integrated, data collected
- **Agent 6 (Ops):** Team hired, facility ready, processes documented

### **Overall:**
- **Week 2:** Backend core complete
- **Week 4:** MVP features complete
- **Week 6:** Production ready
- **Week 7:** Beta launch
- **Month 7:** Public launch

---

**Document Status:** ✅ Ready for Assignment  
**Version:** 1.0  
**Last Updated:** January 29, 2026
