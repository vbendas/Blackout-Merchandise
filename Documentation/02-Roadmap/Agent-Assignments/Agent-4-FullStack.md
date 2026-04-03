# Agent 4: Full-Stack Specialist

> **Focus:** End-to-end feature integration, testing, quality assurance  
> **Phase 3.5-3.6 Estimated Time:** 5-8 hours  
> **Role Lead:** Integration and testing lead

---

## Phase 3.5-3.6 Assignment Summary

**Primary Task:** Integration testing, E2E testing, cross-browser validation

| Task | Focus | Est. Time | Status |
|------|-------|-----------|--------|
| Integration | Connect all components | 2-3h | ⏳ After other agents |
| E2E Testing | Full user journeys | 2-3h | ⏳ After integration |
| Cross-browser | Chrome, Safari, Firefox | 1-2h | ⏳ Final |

---

## Integration Testing

### Audio/Chat Integration
- [ ] Mic button → Deepgram API → input field
- [ ] Voice mode toggle works
- [ ] Audio plays correctly on response
- [ ] Latency acceptable (<5s)
- [ ] Error handling for network issues

### Inline Cards Integration
- [ ] Product cards render in chat
- [ ] Mockup cards render in chat
- [ ] Design cards render in chat
- [ ] Click opens correct lightbox
- [ ] Action buttons work (Edit, Download, etc.)

### Catalog Integration
- [ ] Catalog button opens lightbox
- [ ] Filters work (category, search)
- [ ] View toggle (grid/slider) works
- [ ] Clicking product opens detail view
- [ ] "Use This Blank" adds to chat

### Waitlist Integration
- [ ] All 5 steps flow correctly
- [ ] Form data persists across steps
- [ ] API calls work (save, interview, email)
- [ ] Leopoldo avatar displays correctly
- [ ] Mobile responsive on all steps

---

## E2E Test Scenarios

### Scenario 1: Audio Chat
1. Navigate to /app/workspace
2. Click mic button
3. Say something
4. Verify transcript in input
5. Submit message
6. Verify agent responds with voice

### Scenario 2: Catalog Browse
1. Click "Browse Catalog"
2. Filter by category
3. Search for product
4. Click product card
5. View details
6. Click "Use This Blank"
7. Return to chat

### Scenario 3: Waitlist Complete
1. Navigate to /waitlist
2. Complete all 5 steps
3. Verify data saved to database
4. Check waitlist position
5. Verify email sent
6. Test referral sharing

---

## Cross-Browser Testing

**Browsers:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)

**Devices:**
- [ ] MacBook Pro (desktop)
- [ ] iPhone 15 (mobile)
- [ ] Android phone (mobile)
- [ ] iPad (tablet)

**Checklist:**
- [ ] No console errors
- [ ] Layout responsive
- [ ] Animations smooth
- [ ] Audio works
- [ ] Forms usable

---

## Performance Testing

- [ ] API responses <1 second
- [ ] Page load <3 seconds
- [ ] Animations 60 FPS
- [ ] No memory leaks

---

## Accessibility Testing

- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader compatible
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible

---

## Deliverables

- QA report with test results
- List of bugs found + fixed
- Performance metrics
- Accessibility audit

---

**Status:** READY AFTER OTHERS COMPLETE  
**Estimated Completion:** Feb 9, 2026  
**Owner:** Agent 4 (Full-Stack Specialist)
