# Roadmap: Crowdfunding-First Strategy

> **Version**: 1.0  
> **Last Updated**: May 8, 2026  
> **Platform**: Indiegogo (Flexible Funding — keep what you raise)  
> **Strategy Shift**: From "build production backend first" to "build polished demo → crowdfund → build production with validated demand"

---

## The New Strategy

**Old path**: Build backend → build AI → build commerce → launch → crowdfund → pitch investors  
**New path**: Build **polished, near-production demo** → **crowdfund with working features** → use funds + traction data → pitch investors → build production

**Why this works better:**
- A working AI chat + design generation in the video is infinitely more compelling than mockups
- 458 paying backers = proven demand, not theoretical
- MRCH token promise adds ownership narrative to the campaign
- Real traction metrics (waitlist, social buzz, backer count) de-risk the investor pitch
- Crowdfunding validates the "artists will pay" assumption before building commerce

**Why Indiegogo:**
- **Flexible Funding**: Keep whatever you raise, even if you don't hit the goal
- **InDemand**: Continue raising after campaign ends (critical for momentum)
- **Lower fees**: 5% vs Kickstarter's 5% + payment processing
- **Less rigid**: Can adjust tiers mid-campaign, add stretch goals dynamically
- **Better for ongoing campaigns**: Perfect for our "keep building post-campaign" narrative

---

## Success Criteria for the Crowdfunding Video

The video must make viewers think: *"This already exists and it's amazing. I need to back this."*

### Must Show (Working Features)

| # | Feature | Why It Matters |
|---|---------|---------------|
| 1 | **Leopoldo greets you by name** | Personalization = "this is real AI" |
| 2 | **Switch between 3 agents** | Shows depth, not just one chatbot |
| 3 | **Voice mode: "Talk to Francisca"** | The "wow" moment. No competitor has this |
| 4 | **Francisca generates a t-shirt design** | The core value proposition in 30 seconds |
| 5 | **Design refinement loop** | "Make it darker" → new design. Shows iteration |
| 6 | **Artist storefront preview** | The end goal: "Your art. Your store." |
| 7 | **Production quality specs** | Justifies premium pricing |
| 8 | **MRCH token + ownership** | "You're not just buying merch, you're buying into the platform" |

### Can Be Scripted/Mocked
- Specific AI responses (use demo mode)
- Design outputs (pre-generate 20 designs, cycle through them)
- Store transactions (static checkout flow)
- Real-time generation speed (show progress animation)

---

## Phase Overview

| Phase | Name | Duration | Goal |
|-------|------|----------|------|
| **P0** | Demo Hardening | May 9 → May 25 (2.5 weeks) | Working AI chat, voice, design gen, storefront |
| **P1** | Visual Polish | May 26 → June 8 (2 weeks) | Animations, transitions, "wow" moments, mobile perfection |
| **P2** | Video Production | June 9 → June 15 (1 week) | Shoot, edit, render final video |
| **P3** | Campaign Prep | June 9 → June 22 (2 weeks parallel) | /invest page, email sequences, influencer outreach |
| **P4** | Pre-Launch Warmup | June 23 → June 29 (1 week) | Waitlist activation, social tease, press outreach |
| **P5** | Campaign Live | June 30 → July 30 (30 days) | Indiegogo live, InDemand post-campaign |
| **P6** | Post-Campaign | Aug → Sep (6 weeks) | Fulfill rewards, investor deck, facility prep |
| **P7** | Investor Pitch | Sep → Oct (4 weeks) | Pitch with crowdfunding data |

**Total to campaign launch**: ~7 weeks (May 9 → June 30)  
**Campaign duration**: 30 days  
**Platform**: Indiegogo (Flexible Funding)  
**Target**: €50,000 stretch goal

---

## P0: Demo Hardening (May 9 → May 25)

**Goal**: Every feature that appears in the crowdfunding video works end-to-end.

---

### Week 1 (May 9 → May 15): AI Chat Core

**Focus**: Agent routing, switching, avatar state sync, real LLM calls, chat history.

#### Day 1 — Friday, May 9
**Sprint**: Agent Router Foundation  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up intent classification module using Mistral Small 4 | 3h | Can classify 5 test messages into correct agent (Leopoldo/Francisca/Antonia) with >80% accuracy |
| 2 | Create agent routing middleware (`/api/chat/route.ts`) | 2h | Route incoming messages to correct agent handler |
| 3 | Write 10 test cases for intent classification | 1h | Cover: onboarding, design request, order tracking, general chat, billing |

**End of day**: Run tests, verify routing works, commit.

---

#### Day 2 — Saturday, May 10
**Sprint**: Agent Switcher UI + Avatar States  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build Agent Switcher component (sidebar or dropdown) | 2.5h | Click agent name → avatar changes, chat context switches, welcome message from new agent |
| 2 | Create Avatar component with expression states | 2h | States: neutral, thinking, speaking, happy. Smooth transitions between states |
| 3 | Integrate avatar state with message lifecycle | 1.5h | When agent generates response: thinking → speaking → happy. When idle: neutral |

**End of day**: Can switch agents mid-conversation, avatar reacts to messages.

---

#### Day 3 — Sunday, May 11
**Sprint**: Real LLM Integration + Chat History  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Integrate Mistral Large 3 API for agent responses | 2.5h | Send prompt with agent personality → receive streaming response |
| 2 | Implement streaming response display | 1.5h | Text appears word-by-word (typewriter effect), not all at once |
| 3 | Persist conversations to `chat_sessions` table via Drizzle | 2h | Each message saved with: role, content, agent_id, timestamp. Conversation loads on page refresh |

**End of day**: Real LLM responses, streaming display, persistence working.

---

#### Day 4 — Monday, May 12
**Sprint**: Typing Indicator + Message Animations  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build TypingIndicator component | 1.5h | Shows "Francisca is thinking..." with animated dots. Disappears when response arrives |
| 2 | Animate message bubbles (Framer Motion) | 2h | User messages slide in from right, agent messages from left. Smooth spring physics |
| 3 | Add timestamp and read status | 1h | Messages show time sent. Visual indicator when response is complete |
| 4 | Test full conversation flow end-to-end | 1.5h | 10-message conversation with agent switches, verify no state bugs |

**End of day**: Full chat experience feels polished and responsive.

---

#### Day 5 — Tuesday, May 13
**Sprint**: Demo Mode + Fallback Responses  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Implement Demo Mode flag (`NEXT_PUBLIC_DEMO_MODE=true`) | 2h | When enabled: responses are scripted from JSON file, not LLM API calls |
| 2 | Create demo scripts for video scenarios | 2h | 5 pre-scripted conversations: onboarding, design request, refinement, store preview, voice mode |
| 3 | Add graceful LLM fallback | 1.5h | If Mistral API fails → show friendly error + offer to retry. Never crash the UI |
| 4 | Polish: scroll to bottom, auto-focus input | 0.5h | Chat auto-scrolls to latest message. Input field focused on page load |

**End of day**: Demo mode produces predictable responses for video recording. Real LLM mode works for live demo.

---

#### Day 6 — Wednesday, May 14
**Sprint**: Polish + Mobile Chat  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Mobile-responsive chat layout | 2.5h | Chat works on iPhone 14 and Pixel 7. Input not hidden by keyboard. Scrollable message list |
| 2 | Quick-reply buttons | 1.5h | Show suggested replies below agent message: "Design a shirt", "Check my order", "Set up store" |
| 3 | Message actions (copy, retry) | 1h | Hover/long-press message → copy text or ask agent to retry response |
| 4 | Bug bash: fix any console errors, alignment issues | 1h | Zero console warnings. All messages aligned correctly |

**End of day**: Chat works flawlessly on mobile and desktop.

---

#### Day 7 — Thursday, May 15
**Sprint**: Week 1 Review + Voice Prep  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Record 5-minute demo video of chat | 1h | Screen recording showing agent switch, real LLM response, avatar animation |
| 2 | Review and list bugs/improvements | 1h | Document 5-10 polish items for next week |
| 3 | Research Deepgram vs Voxtral STT integration | 2h | Decide: Deepgram (faster setup, proven) or Voxtral (better Portuguese, single provider). Write decision rationale |
| 4 | Set up voice input component skeleton | 2h | Mic button UI, hold-to-speak gesture, audio recording blob capture |

**End of day**: Week 1 demo recorded. Voice input UI ready for STT integration.

---

### Week 2 (May 16 → May 22): Voice + Design Generation

**Focus**: Voice input/output, FLUX 2 design generation, refinement loop.

#### Day 8 — Friday, May 16
**Sprint**: Deepgram STT Integration  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up Deepgram API client | 1.5h | API key in env, basic transcription test |
| 2 | Build voice input pipeline: mic → Deepgram → text | 2.5h | Hold mic button → record audio → send to Deepgram → display transcript in chat input |
| 3 | Add voice waveform visualization | 1.5h | Show audio levels while recording. Animated bars respond to voice volume |
| 4 | Handle permissions and errors | 0.5h | If mic blocked → show instructions. If API fails → show retry button |

**End of day**: Can hold mic button, speak, and see transcribed text in chat.

---

#### Day 9 — Saturday, May 17
**Sprint**: ElevenLabs TTS Integration  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up ElevenLabs TTS API | 1.5h | API key configured, test single sentence playback |
| 2 | Integrate TTS into chat response flow | 2.5h | After agent generates text → auto-send to TTS → play audio in browser |
| 3 | Add mute/unmute toggle | 1h | User can turn voice on/off. Remember preference in localStorage |
| 4 | Handle audio overlap: stop previous TTS before new | 1h | If user sends new message while agent is speaking → interrupt and restart |

**End of day**: Agent responses spoken aloud with distinct voice.

---

#### Day 10 — Sunday, May 18
**Sprint**: FLUX 2 API Integration  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up BFL API client (FLUX 2 Flex/Pro) | 2h | API key configured, test image generation with simple prompt |
| 2 | Build design generation endpoint (`/api/generate-design`) | 2h | Accept prompt + category → call BFL API → return image URL |
| 3 | Add generation progress UI | 1.5h | Show "Francisca is designing..." with progress bar or animated dots |
| 4 | Error handling: timeout, API failure | 0.5h | If generation >15s → show "Taking longer than expected...". If fails → show retry |

**End of day**: Can send "Design a metal band shirt" → Francisca generates image.

---

#### Day 11 — Monday, May 19
**Sprint**: Design Display + Approval Flow  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Create DesignCard component | 2h | Shows generated image, prompt used, timestamp. Large, centered, premium feel |
| 2 | Add Approve/Refine action buttons | 1.5h | Two buttons below image. Click "Refine" → opens refinement input |
| 3 | Implement design history (carousel/grid) | 2h | Show all generated designs in session. Click to view full size |
| 4 | Save designs to database | 0.5h | Store image URL, prompt, generation params in `chat_sessions` messages JSONB |

**End of day**: Generated designs are displayed beautifully with clear next actions.

---

#### Day 12 — Tuesday, May 20
**Sprint**: Design Refinement Loop  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build refinement prompt input | 1.5h | Text input with placeholder: "Make it darker, add a skull, change font..." |
| 2 | Implement img2img refinement (FLUX 2 Flex) | 2h | Send original image + refinement prompt → generate variation |
| 3 | Side-by-side comparison view | 2h | Show original vs refined. Slider to wipe between them, or stacked with labels |
| 4 | Add "Use as base for next design" option | 0.5h | Click "Iterate" on any past design → uses it as base image |

**End of day**: Can refine a design 3+ times with clear visual comparison.

---

#### Day 13 — Wednesday, May 21
**Sprint**: Pre-generate Video Assets  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Generate 20 pre-made designs for video | 2h | 5 metal, 5 indie, 5 hip-hop, 5 pop designs. Save URLs and prompts |
| 2 | Build design cycling component for demo | 1.5h | In demo mode, cycle through pre-made designs with fake progress bar |
| 3 | Test voice + design generation together | 1.5h | Speak "Design a shirt" → transcribe → generate → display. Full pipeline <15s |
| 4 | Optimize image loading (Cloudinary f_auto, q_auto) | 1h | All generated images served via Cloudinary with WebP/AVIF optimization |

**End of day**: 20 designs ready for video. Full voice→design pipeline <15s.

---

#### Day 14 — Thursday, May 22
**Sprint**: Week 2 Review + Storefront Prep  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Record 5-minute demo of voice + design | 1h | Screen recording showing: speak → transcribe → generate → refine |
| 2 | Review and fix any latency issues | 1.5h | Target: voice→transcribe <2s, generate <10s, display <1s |
| 3 | Design storefront component architecture | 1.5h | Plan: hero, product grid, artist bio, cart drawer |
| 4 | Build storefront shell (empty state) | 2h | Route `/shop/[artist-slug]` renders with layout, navigation, footer |

**End of day**: Week 2 demo recorded. Storefront route exists.

---

### Week 3 (May 23 → May 29): Storefront + Integration

**Focus**: Artist storefront, product cards, cart, demo mode integration.

#### Day 15 — Friday, May 23
**Sprint**: Storefront Hero + Artist Bio  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build StorefrontHero component | 2h | Artist banner image, name, tagline, social links. Responsive |
| 2 | Create ArtistBio section | 1.5h | Artist photo, bio text, genre tags. Collapsible on mobile |
| 3 | Add store theme customization (colors) | 1.5h | Artist can set: background color, accent color, text color. Saved in `theme_config` JSONB |
| 4 | Test with 3 mock artists | 1h | Create 3 artist profiles with different themes. Verify each looks unique |

**End of day**: Storefront hero and bio look professional and customizable.

---

#### Day 16 — Saturday, May 24
**Sprint**: Product Grid + Product Cards  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build ProductCard component | 2h | Mockup image, product name, price, "Add to Cart" button. Hover: image zoom, button highlight |
| 2 | Create ProductGrid layout | 1.5h | Responsive grid: 3 cols desktop, 2 cols tablet, 1 col mobile. Gap consistent |
| 3 | Add product filtering (category) | 1.5h | Filter buttons: All, T-Shirts, Hoodies, Posters. Active state highlighted |
| 4 | Pre-populate with 12 mock products | 1h | 3 artists × 4 products each. Use generated designs as product images |

**End of day**: Storefront shows realistic product grid with filtering.

---

#### Day 17 — Sunday, May 25
**Sprint**: Cart Drawer + Demo Mode Polish  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build CartDrawer component | 2.5h | Slide-out from right. Shows items, quantities, subtotal. "Checkout" button |
| 2 | Add cart state management (Zustand) | 1.5h | Add/remove items, update quantity, calculate total. Persist in localStorage |
| 3 | Connect storefront to demo mode | 1.5h | In demo mode: clicking "Add to Cart" shows success toast but no real transaction |
| 4 | Polish: empty cart state, loading skeletons | 0.5h | Empty cart shows "Your cart is empty" with CTA. Products show skeleton while loading |

**End of day**: Full storefront → cart flow works. Demo mode handles fake checkout.

---

#### Day 18 — Monday, May 26
**Sprint**: Integration Testing + Bug Bash  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Test full user journey: chat → design → store → cart | 2h | New user: chat with Leopoldo → switch to Francisca → generate design → view storefront → add to cart |
| 2 | Test on 3 devices: desktop, iPhone, Android | 1.5h | Each device tested for: layout, touch targets, scroll, voice input |
| 3 | Fix any P0 bugs (crashes, broken flows) | 2h | Priority: anything that prevents video recording |
| 4 | Performance audit: Lighthouse score | 0.5h | Target: >80 on mobile, >90 on desktop |

**End of day**: All core flows work on all devices. No P0 bugs.

---

#### Day 19 — Tuesday, May 27
**Sprint**: Landing Page Polish  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Polish main landing page (`/`) | 2h | Hero section, feature marquees, quality specs, CTA. All sections scroll smoothly |
| 2 | Add "Try the Demo" CTA → opens chat | 1h | Prominent button on landing page. Click → scrolls to or opens chat interface |
| 3 | Polish waitlist page (`/waitlist`) | 2h | Form validation, success state, social proof ("Join 500+ artists") |
| 4 | Test all routes: `/`, `/waitlist`, `/shop/[slug]` | 1h | Each route loads <2s, no 404s, SEO meta tags correct |

**End of day**: Landing page and waitlist page are polished and conversion-ready.

---

#### Day 20 — Wednesday, May 28
**Sprint**: End-to-End Demo Recording  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Script the 5-minute product demo | 1h | Step-by-step script: landing → chat → voice → design → store |
| 2 | Record screen capture (4K, 60fps) | 2h | Clean recording, no notifications, no cursor jitter |
| 3 | Record voiceover or use captions | 1.5h | Either record founder voiceover or add text captions |
| 4 | Export and review | 1.5h | Watch full video, note timestamps for video editing |

**End of day**: Raw demo footage recorded. Ready for video editing in Week 5.

---

#### Day 21 — Thursday, May 29
**Sprint**: Week 3 Review + Handoff to Polish Phase  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Document all features that work | 1h | List: chat, voice, design gen, refinement, storefront, cart |
| 2 | Document known limitations for video | 1h | List: demo mode used for responses, pre-generated designs, mock checkout |
| 3 | Plan Week 4-5 polish priorities | 2h | Rank: animations, mobile, voice quality, design quality |
| 4 | Set up video production folder structure | 1h | Organize: raw footage, scripts, music, graphics, exports |
| 5 | Research video editors (Fiverr/Upwork) | 1h | Shortlist 3 editors with portfolio of tech/product videos |

**End of day**: P0 complete. Handoff document written. Video production prepped.

---

## P1: Visual Polish (May 30 → June 12)

**Goal**: Every pixel feels premium. This is what makes people back the project.

---

### Week 4 (May 30 → June 5): Animation & Transitions

**Focus**: Page transitions, chat animations, scroll effects, mobile perfection.

#### Day 22 — Friday, May 30
**Sprint**: Page Transitions  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Implement Framer Motion page transitions | 2.5h | Fade between routes. Optional: slide direction based on navigation |
| 2 | Add loading states between pages | 1.5h | Branded loading spinner or skeleton, not default browser spinner |
| 3 | Polish route transitions on mobile | 1.5h | Native-app feel: swipe gestures, bottom sheet transitions |
| 4 | Test all 5 routes with transitions | 0.5h | No flash of unstyled content, no jank |

---

#### Day 23 — Saturday, May 31
**Sprint**: Chat Message Animations  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Animate message bubbles (spring physics) | 2h | Messages bounce in with spring. Different animation for user vs agent |
| 2 | Animate avatar on agent response | 1.5h | Avatar bobs/pulses when agent speaks. Expression transitions smoothly |
| 3 | Add reaction animations (emoji pop) | 1.5h | When user approves design: small confetti or sparkle near the button |
| 4 | Scroll-triggered animations | 1h | Chat history items fade in as user scrolls up |

---

#### Day 24 — Sunday, June 1
**Sprint**: Design Generation Animation  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build generation progress animation | 2.5h | Animated progress bar or step indicators: "Analyzing..." → "Sketching..." → "Rendering..." |
| 2 | Add image reveal animation | 2h | Generated image: blur → sharpen, or opacity 0→1, or scale 0.9→1 |
| 3 | Add shimmer/skeleton while generating | 1.5h | Placeholder with animated gradient. Matches final image aspect ratio |

---

#### Day 25 — Monday, June 2
**Sprint**: Scroll Animations + Landing Page Effects  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Add scroll-triggered fade-ins (landing page) | 2h | Each section fades in + slides up as it enters viewport |
| 2 | Add parallax to hero section | 2h | Background moves slower than foreground. Subtle, not dizzying |
| 3 | Add counter animation ("500+ artists") | 1h | Numbers count up from 0 when scrolled into view |
| 4 | Test on mobile: no scroll jank | 1h | 60fps on iPhone 14. Use `will-change` sparingly |

---

#### Day 26 — Tuesday, June 3
**Sprint**: Micro-interactions  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Button hover states (all buttons) | 1.5h | Scale 1.02, glow effect, or color shift. Consistent across app |
| 2 | Input focus states | 1h | Border color change, subtle shadow. Accessible (keyboard navigation) |
| 3 | Toast notifications | 1.5h | Success, error, info toasts. Slide in from top-right, auto-dismiss |
| 4 | Loading spinners (branded) | 1h | Custom spinner using brand colors (gold/rose), not default browser |
| 5 | Cursor effects (landing page) | 1h | Optional: custom cursor with gold glow trail on desktop |

---

#### Day 27 — Wednesday, June 4
**Sprint**: Mobile Polish — Part 1  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Test on iPhone 14: full user journey | 2h | All features work: chat, voice, design, store, cart |
| 2 | Fix touch target sizes (min 44px) | 1h | All buttons, links, inputs are easy to tap |
| 3 | Fix keyboard handling (input focus) | 1.5h | Chat input visible when keyboard opens. Page doesn't scroll weirdly |
| 4 | Optimize images for mobile | 1h | Cloudinary serves smaller images on mobile (`w_600` vs `w_1200`) |

---

#### Day 28 — Thursday, June 5
**Sprint**: Mobile Polish — Part 2 + Performance  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Test on Android Pixel 7: full journey | 2h | Same as iPhone test. Note any Android-specific issues |
| 2 | Fix Android-specific bugs | 1.5h | Common: font rendering, touch delays, scroll behavior |
| 3 | Run Lighthouse audit, fix issues | 1.5h | Target: Performance >80, Accessibility >90, Best Practices >90, SEO >90 |
| 4 | Optimize bundle size | 1h | Lazy load heavy components. Code split routes. Target: <200KB initial JS |

---

### Week 5 (June 6 → June 12): The "Wow" Moments

**Focus**: Signature animations and effects that make the video unforgettable.

#### Day 29 — Friday, June 6
**Sprint**: Agent Entrance Animation  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build Leopoldo entrance animation | 3h | Leopoldo "walks in" from side, waves, takes position. Played on first visit |
| 2 | Add sound effect on entrance | 1.5h | Subtle "whoosh" or soft musical note. Not annoying |
| 3 | Make entrance skippable | 1h | Click to skip. Don't show again on repeat visits (localStorage) |
| 4 | Test entrance on mobile | 0.5h | Animation smooth, doesn't block interaction |

---

#### Day 30 — Saturday, June 7
**Sprint**: Voice Waveform + Design Comparison  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build voice waveform visualization | 2.5h | Animated bars that respond to microphone input. Gold/rose gradient |
| 2 | Build design comparison slider | 2.5h | Drag slider to wipe between original and refined design. Smooth, responsive |
| 3 | Add "before/after" labels | 1h | Clear labels: "Original" / "Refined". Animated on first view |

---

#### Day 31 — Sunday, June 8
**Sprint**: Confetti + Loading Screens  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Add confetti on design approval | 2h | Small burst of gold/rose confetti when user clicks "Approve". Not overwhelming |
| 2 | Build branded loading screen | 2h | Full-screen loading with Cat-Suite logo, progress bar, fun tip text |
| 3 | Add easter egg: secret agent mode | 1.5h | Konami code or hidden button → all agents wear sunglasses. Fun for video |
| 4 | Test all "wow" moments | 0.5h | Each triggers correctly, no performance issues |

---

#### Day 32 — Monday, June 9
**Sprint**: Video Production — Day 1  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up recording environment | 1h | Clean browser (no bookmarks bar, no extensions showing). Dark room for screen recording |
| 2 | Record all screen capture segments | 3h | Landing page, chat, voice, design gen, refinement, storefront. 4K, 60fps |
| 3 | Record founder talking to camera | 1.5h | 2-3 takes. Authentic, not over-rehearsed. Good lighting |
| 4 | Organize footage | 0.5h | Label each clip: "01_landing", "02_chat", "03_voice", etc. |

---

#### Day 33 — Tuesday, June 10
**Sprint**: Video Production — Day 2  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Record additional B-roll | 2h | Close-ups of: typing, mouse clicks, phone screen, design generating |
| 2 | Record voiceover (if using) | 1.5h | Read script clearly. Match timing to screen captures |
| 3 | Source music | 1h | Find 2-3 royalty-free tracks. Epic but not corporate. Test with footage |
| 4 | Create rough cut (first assembly) | 1.5h | Place clips in order, no transitions yet. Check timing |

---

#### Day 34 — Wednesday, June 11
**Sprint**: Video Production — Day 3  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Edit transitions and motion graphics | 2.5h | Smooth cuts, text animations, logo reveals. Match brand aesthetic |
| 2 | Add color grading | 1h | Consistent dark theme. Gold highlights pop. Not over-saturated |
| 3 | Add subtitles/captions | 1.5h | All spoken text has captions. SRT file for accessibility |
| 4 | Render test versions (16:9, 9:16, 1:1) | 1h | Main video 16:9. Social clips in vertical and square |

---

#### Day 35 — Thursday, June 12
**Sprint**: Video Finalization + /invest Page  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Final video review + export | 1.5h | Watch full video. Note any final tweaks. Export 4K master |
| 2 | Create social clip versions | 1h | 15-sec Instagram/TikTok clips from best moments |
| 3 | Build `/invest` landing page | 2.5h | Hero video, tier cards, FAQ, countdown timer. Responsive |
| 4 | Add Indiegogo integration (preview) | 1h | Embed Indiegogo widget or link. Show "Coming June 30" |

---

## P3: Campaign Prep (June 13 → June 26)

**Goal**: Everything ready to flip the switch on June 30.

---

### Week 6 (June 13 → June 19): Campaign Assets

#### Day 36 — Friday, June 13
**Sprint**: Campaign Page Copy  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Write headline and subheadline | 1.5h | "Your Art. Your Merch Empire. Zero Upfront Costs." — test 3 variations |
| 2 | Write campaign body copy | 2h | Problem, solution, founder story, production quality, ethical mission |
| 3 | Write reward tier descriptions | 1.5h | Each tier: what's included, why it's valuable, who it's for |
| 4 | Write FAQ section | 1h | 10 questions: shipping, refunds, timeline, Merch Coins, MRCH tokens |

---

#### Day 37 — Saturday, June 14
**Sprint**: Email Sequences  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Write pre-launch email sequence (5 emails) | 3h | Tease → Introduce agents → Problem agitation → Tier breakdown → Final countdown |
| 2 | Set up email automation (Resend/Loops) | 2h | Drip sequence triggered on waitlist signup. Scheduled sends |
| 3 | Write post-campaign thank-you email | 1h | Personal, transparent, next steps |

---

#### Day 38 — Sunday, June 15
**Sprint**: Social Media Kit  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Create 10 Instagram graphics | 2.5h | Agent portraits, design showcases, quote cards, countdown graphics |
| 2 | Create 5 TikTok/Reels scripts | 1.5h | 15-60 sec scripts: voice demo, design gen, founder story, MRCH explainer |
| 3 | Create Twitter/X thread content | 1h | 10-tweet thread: problem → solution → token → CTA |
| 4 | Design social profile banners | 1h | Cover photos for Instagram, Twitter, Discord. Consistent branding |

---

#### Day 39 — Monday, June 16
**Sprint**: MRCH Token Page  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Build `/tokens` explainer page | 2.5h | What is MRCH, governance rights, profit sharing, Stellar blockchain |
| 2 | Add tier allocation table | 1.5h | Show how many MRCH tokens each crowdfunding tier receives |
| 3 | Create wallet setup guide | 1.5h | Step-by-step: download LOBSTR, create wallet, add trustline. Screenshots |
| 4 | Add legal disclaimer | 0.5h | "MRCH is a utility token, not a security." Simple, clear |

---

#### Day 40 — Tuesday, June 17
**Sprint**: Press Kit + Influencer Outreach  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Write press release | 2h | 500 words. Hook: "AI-powered ethical merch platform launches crowdfunding" |
| 2 | Create press kit folder | 1.5h | Founder bio, fact sheet, high-res images, video download link |
| 3 | Identify and contact 10 micro-influencers | 1.5h | Music/art space. 10K-100K followers. Personalized pitch |
| 4 | Set up media tracking spreadsheet | 1h | Track: outlet, contact, status, publish date, link |

---

#### Day 41 — Wednesday, June 18
**Sprint**: Waitlist Activation  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Send "something big is coming" email | 1h | Tease video, no details. Build curiosity |
| 2 | Post teaser on all social channels | 1.5h | Cryptic post: "June 30. Your art deserves better." |
| 3 | Engage with waitlist community on Discord | 1.5h | Answer questions, share behind-the-scenes, build hype |
| 4 | Set up countdown timer on landing page | 1h | Large, prominent countdown to June 30, 10 AM CET |
| 5 | Test email deliverability | 0.5h | Check spam scores, test with Mail-Tester.com |

---

#### Day 42 — Thursday, June 19
**Sprint**: Final Campaign Review  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Review all campaign assets | 2h | Video, copy, graphics, emails, social kit. Check for errors |
| 2 | Test Indiegogo page (draft mode) | 1.5h | All tiers correct, images load, checkout flow works |
| 3 | Schedule all pre-launch emails | 1h | Set dates: June 23, 25, 27, 29, 30 |
| 4 | Create launch day checklist | 1h | Hour-by-hour schedule for June 30. Who does what |
| 5 | Backup all assets | 0.5h | Cloud backup of video, graphics, copy. Share with 1 trusted person |

---

## P4: Pre-Launch Warmup (June 20 → June 29)

**Goal**: Build anticipation so Day 1 explodes.

---

### Week 7 (June 20 → June 26): Warmup + Final Push

#### Day 43 — Friday, June 20
**Sprint**: Email #2 — "Meet the Cat-Suite"  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Send email introducing Leopoldo, Francisca, Antonia | 1.5h | Each agent has a paragraph + GIF/animation. Personality shines |
| 2 | Post agent intros on Instagram (carousel) | 1.5h | 3 slides: one per agent. Animated expressions |
| 3 | Post TikTok: "Meet Francisca, your AI art director" | 1h | 15-sec clip of design generation |
| 4 | Engage with comments/replies | 1h | Reply to every comment. Quote-tweet positive replies |
| 5 | Monitor waitlist signups | 1h | Track daily signups. Goal: +20/day during warmup |

---

#### Day 44 — Saturday, June 21
**Sprint**: Email #3 — "Your Art Deserves Better Merch"  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Send problem-agitation email | 1.5h | "Tired of cheap drop-shipping? So are we." Emotional hook |
| 2 | Post comparison graphic: cheap vs premium | 1.5h | Side-by-side: generic DTG vs our screen print. Quality difference obvious |
| 3 | Share founder story video clip | 1h | 30-sec: Victor in workshop, talking about 9 years of printing |
| 4 | Reach out to 5 music blogs | 1.5h | Personalized pitch with press kit. Offer exclusive preview |
| 5 | Update Discord with daily progress | 0.5h | Screenshot of campaign prep, ask for feedback |

---

#### Day 45 — Sunday, June 22
**Sprint**: Email #4 — "Here's Exactly What You Get"  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Send tier breakdown email | 1.5h | Visual tier cards. Highlight Early Bird pricing (limited spots) |
| 2 | Post tier carousel on Instagram | 1.5h | Each tier as a slide. Swipe to see rewards |
| 3 | Create "MRCH token explained" thread | 1h | Twitter thread: 5 tweets explaining ownership model |
| 4 | Final Indiegogo page review | 1.5h | Last check of all copy, images, tiers. Submit for review |
| 5 | Schedule Day 1 social posts | 0.5h | Buffer/schedule posts for launch morning |

---

#### Day 46 — Monday, June 23
**Sprint**: Email #5 — "24 Hours Left" + Press Push  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Send final countdown email | 1h | Urgency: "Tomorrow at 10 AM. Early Bird ends in 48 hours." |
| 2 | Push press outreach (final attempt) | 1.5h | Follow up with 10 outlets. Offer exclusive interview |
| 3 | Activate influencer partners | 1.5h | Send them video + talking points. Ask to post on launch day |
| 4 | Post "tomorrow" teaser on all channels | 1h | Countdown graphic: "1 day. Are you ready?" |
| 5 | Test all links: /invest, /waitlist, /tokens | 1h | Every link works, loads fast, no 404s |

---

#### Day 47 — Tuesday, June 24
**Sprint**: Launch Day Minus 1  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Final systems check | 1.5h | Website up, email ready, social scheduled, Indiegogo live link works |
| 2 | Prepare launch day communication | 1.5h | Draft: launch announcement post, email, Discord message |
| 3 | Set up tracking (UTM codes, analytics) | 1h | Every link has UTM. Can track: email, social, direct, referral |
| 4 | Prepare responses to common questions | 1h | Copy-paste answers for: shipping, timeline, token setup, refunds |
| 5 | Sleep early | 1h | Launch day is tomorrow. Be rested |

---

## P5: Campaign Live (June 30 → July 30)

**Goal**: €50,000 stretch goal on Indiegogo.

---

### Launch Day — Monday, June 30
**Hours**: 8+ (this is the big day)

| Time | Action |
|------|--------|
| 8:00 AM | Final website check. All systems green. |
| 9:00 AM | Post "We're LIVE" on all social channels. Video first. |
| 9:30 AM | Send launch email to full waitlist (500+ people). |
| 10:00 AM | **FLIP THE SWITCH.** Indiegogo goes live. |
| 10:15 AM | Monitor first 15 minutes. Respond to every comment. |
| 11:00 AM | Post Instagram Story: "First backer! 🎉" |
| 12:00 PM | Lunch. But keep phone nearby. |
| 2:00 PM | Check funding progress. Post update. |
| 4:00 PM | Reach out to 5 more influencers with real-time data. |
| 6:00 PM | Post TikTok: "We just launched! Here's what we're building." |
| 8:00 PM | Discord AMA: 30-minute Q&A with founder. |
| 10:00 PM | Final check of Day 1. Document everything. |

### Week 8-11 (July 1 → July 30): Campaign Maintenance

**Daily rhythm** (2-3 hours/day):
- Morning: Check funding progress, respond to overnight comments
- Midday: Post update (milestone, artist spotlight, behind-the-scenes)
- Evening: Engage with community, answer DMs, Discord check-in

**Weekly rhythm**:
- Monday: Weekly update email to backers
- Wednesday: Artist spotlight (interview, design showcase)
- Friday: Milestone celebration ("We're 50% funded!" + stretch goal tease)
- Sunday: Plan next week's content

**Key milestones to announce:**
- 25% funded → "Thank you! Here's what's next."
- 50% funded → "Halfway there! Unlocking stretch goal..."
- 75% funded → "Almost there! Early Bird ending soon..."
- 100% funded → "WE DID IT! Now let's hit the stretch goal..."
- Stretch goal → "€50K unlocked! Every backer gets +50 Merch Coins!"

---

## P6: Post-Campaign (August → September)

**Goal**: Convert crowdfunding success into investor-ready traction.

| Week | Focus | Key Actions |
|------|-------|-------------|
| Aug 1-2 | Fulfillment | Credit backer accounts with Merch Coins. Send wallet setup guide. |
| Aug 3-4 | Community | Create "Founding Artists" Discord channel. Weekly updates. |
| Aug 5-6 | Operations | Begin Castelo Branco facility setup. Apply for Portugal 2030 grant. |
| Aug 7-8 | Inventory | Order initial blanks, inks, screens. Test production workflow. |
| Sep 1-2 | Data | Compile crowdfunding metrics: backers, demographics, social reach, press. |
| Sep 3-4 | Deck | Build investor deck with real traction data. |
| Sep 5-6 | Outreach | Identify 20 seed-stage investors in EU. Warm intros via network. |

---

## P7: Investor Pitch (September → October)

**Goal**: €230K seed round.

### The Pitch

**Opening**: "We raised €50K from 458 backers in 30 days with zero paid ads. We have 500+ artists pre-committed. Our facility is operational. Our AI works. We're not asking you to bet on an idea — we're asking you to fund growth."

**Slides**:
1. Traction: crowdfunding data, backer map, social metrics
2. Product: 2-minute demo video
3. Market: €12B SAM, validated demand
4. Business model: Unit economics, projected revenue
5. Team: Victor's 9-year track record
6. Moats: proprietary dataset, EU AI stack, owned facility
7. Ask: €230K for 16-18%, 24 months to profitability
8. Use of funds: growth, not validation

---

## What Gets Cut (Deferred to Post-Crowdfunding)

| Feature | Why Deferred | When It Returns |
|---------|-------------|-----------------|
| Real-time payments (Stripe) | Mock checkout is enough for demo | Post-crowdfunding |
| Full order management | No real orders until post-launch | Post-crowdfunding |
| Inventory tracking | Facility not operational yet | Post-crowdfunding |
| Advanced analytics | Nice-to-have, not demo-critical | Phase 7 |
| Social commerce hub | Phase 9 feature | 2027 |
| Accessories expansion | Phase 10 feature | 2027-2028 |
| Self-hosting AI models | API-only is fine at this scale | When >200K images/month |
| Full Merch Coins redemption | Platform not live yet | Post-crowdfunding |

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AI generation too slow for video | Medium | Pre-generate 20 designs, show timelapse |
| Voice quality not good enough | Medium | ElevenLabs fallback, or skip voice in video |
| Campaign doesn't hit goal | Low | **Indiegogo Flexible Funding** — keep whatever you raise |
| Video looks amateur | Low | Hire editor on Fiverr/Upwork if needed |
| FLUX 2 API downtime during video | Low | Have fallback images ready |

---

## Key Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Video completion rate | >60% | If they watch to the end, they convert |
| Waitlist → backer conversion | >20% | 500 waitlist → 100 backers minimum |
| Social shares per backer | >2 | Organic reach |
| Average pledge | >€100 | Higher tiers = more capital |
| Day 1 funding % | >30% | Algorithm boost + momentum |

---

## Definition of Done (Crowdfunding Demo)

The demo is ready for the video when:

- [ ] A new user can visit the site, see Leopoldo greet them, and have a 3-message conversation
- [ ] User can switch to Francisca and request a t-shirt design
- [ ] Design generates in <10 seconds and looks professional
- [ ] User can refine the design with text or voice
- [ ] User can preview an artist storefront with products
- [ ] Voice mode works: speak → transcribe → respond → speak back
- [ ] Every animation is smooth (60fps, no jank)
- [ ] Mobile experience is flawless (iPhone 14 + Pixel 7 tested)
- [ ] Demo mode produces predictable responses for video recording
- [ ] Zero console errors, zero build warnings

---

**Next Step**: Confirm this roadmap and begin Day 1 (May 9) sprint planning.

**Owner**: Victor Bendas  
**Campaign Launch Target**: June 30, 2026  
**Investor Pitch Target**: October 2026  
**Platform**: Indiegogo (Flexible Funding)
