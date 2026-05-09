# Orchestration Log

## Entry 1: Phase 0.1 Kickoff
**Date:** 2025-12-14
**Status:** Generating Prompt for Phase 0.1 (Project Initialization)
**Pre-requisites:** Phase 0.0.1 & 0.0.2 complete (User accounts & Local tools).

**Agent Prompt:**
You are the **Lead Infrastructure Agent** for the Merch From project. 
Your goal is to execute **Phase 0.1: Project Initialization** of the MVP Roadmap.

**Current State:**
- Phase 0.0.2 (Local Tools) is complete.
- The directory `/Users/victorbendas/Documents/GitHub/Merch-From` contains documentation and an initialized git repo, but NO source code (no `package.json`).

**Objectives:**
1.  **Verify Git Status (Phase 0.0.3/0.0.4):** 
    - Ensure the repo is correctly initialized.
    - Check if remote 'origin' is set (if not, ask user to provide repo URL or creating it).
    
2.  **Initialize Next.js App (Phase 0.1.1):**
    -   Run `bunx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --no-import-alias` in the project root.
    -   *CONSTRAINT:* Ensure this does not delete/overwrite the existing `Documentation` folder.

3.  **Install Dependencies (Phase 0.1.2):**
    -   `bun add framer-motion zustand zod @rive-app/react-canvas`
    -   `bunx shadcn@latest init` (Select: Default Style, Neutral Color, Yes to CSS variables)
    -   `bunx shadcn@latest add button card input avatar`

4.  **Configure Environment (Phase 0.1.3):**
    -   Create `.env.local` with the specific placeholders defined in Step 0.1.3 of the Roadmap.

5.  **Create Folder Structure (Phase 0.1.4):**
    -   Create directories: `src/components/ui`, `src/lib/ai`, `src/lib/demo`, `src/hooks`, `src/types`, `public/rive`, `public/mockups`.

6.  **Commit (Phase 0.1.5):**
    -   Commit all changes with message: "🎉 Initial Next.js setup with shadcn/ui".

**References:**
-   [MVP Roadmap](file:///Users/victorbendas/Documents/GitHub/Merch-From/Documentation/dev/MVP%20Roadmap.md) (Strictly follow Phase 0.1 steps)

## Entry 2: Phase 0.0.3 Git Verification
**Date:** 2025-12-14
**Status:** Generating Prompt for Phase 0.0.3 (Git Check)

**Agent Prompt:**
You are the **DevOps Specialist (Git)** for the Merch From project.
Your goal is to execute **Phase 0.0.3: GitHub Repository Setup** of the MVP Roadmap.

**Objective:**
Verify git remote configuration (`https://github.com/vbendas/Merch-From.git`) and ensure the repository is clean and functional before project initialization.

**Task List:**
1. Verify `git remote -v`.
2. Verify `git status` (clean state, do not delete Documentation).
3. Verify push access (create dummy commit if needed, or just confirm configuration).

**Reference:** [MVP Roadmap Phase 0.0.3](file:///Users/victorbendas/Documents/GitHub/Merch-From/Documentation/dev/MVP%20Roadmap.md)

## Entry 3: Phase 0.0.4 Vercel Connection
**Date:** 2025-12-14
**Status:** Generating Prompt for Phase 0.0.4 (Manual Vercel Setup)

**Agent Prompt:**
You are the **Deployment Specialist**.
Your goal is to execute **Phase 0.0.4: Connect Vercel to GitHub** of the MVP Roadmap.

**Context:**
This is a **Manual Step** performed in the browser.

**Instructions (Manual):**
1.  Go to [vercel.com/new](https://vercel.com/new).
2.  Click **"Import Git Repository"**.
3.  Select the `merch-from` repository (vbendas/Merch-From).
4.  Click **Import**.
5.  **CRITICAL:** When the project settings appear, **Click "Skip for now"**.
    -   *Do NOT deploy yet.* We need to initialize the Next.js app in Phase 0.1 first.
    -   Just ensure the Vercel project is created and linked to the repo.

**Reference:** [MVP Roadmap Phase 0.0.4](file:///Users/victorbendas/Documents/GitHub/Merch-From/Documentation/dev/MVP%20Roadmap.md)

## Entry 4: Phase 0.0.4 Outcome
**Date:** 2025-12-14
**Status:** Complete (with workaround)

**Notes:**
User reported Vercel did not allow "Skip for now" and forced a deployment. 
**Workaround:** User overrode the build command with `exit 0` to pass the build and create the project shell.
**Result:** Vercel project is linked.

**Next Step:** Proceed to Phase 0.1 (Project Initialization). The prompt is available in Entry 1.

## Entry 5: Phase 0.1 Validation (Skip)
**Date:** 2025-12-14
**Status:** Skipped (Already Completed)

**Notes:**
Inspection of `GitHub/Merch-From/app` confirms Phase 0.1 is effectively complete:
- `package.json` exists with installed dependencies.
- `src/lib/ai`, `src/lib/demo` directories exist.
- `public/rive` exists.
- `shadcn/ui` components (button, card, input, avatar) are present.

**Next Step:** Proceed to Phase 0.2 (Design System Scaffold).

## Entry 6: Phase 0.2 Validation
**Date:** 2025-12-14
**Status:** Partially Completed / Validated

**Notes:**
Inspection reveals:
- Layout components (`StickyHeader`, `HeroSection`, `SplitLayout`, `FloatingDock`) exist in `src/components` (Note: Flattened structure, not `src/components/layout`).
- UI Components (`chat-bubble`, etc.) exist in `src/components/ui`.
- **Verdict:** Phase 0.2 is functionally complete.

**Next Step:** Proceed to Phase 1 (Demo MVP: Core Shell).

## Entry 7: Phase 1 Kickoff
**Date:** 2025-12-14
**Status:** Generating Prompt for Phase 1 (Demo MVP: Core Shell)

**Agent Prompt:**
You are the **Frontend Engineer**.
Your goal is to execute **Phase 1: Demo MVP – Core Shell** of the MVP Roadmap.

**Current State:**
- Working directory: `GitHub/Merch-From/app` (ALL commands must be run here).
- Phase 0.2 Design System components exist in `src/components` and `src/components/ui`.
- **Missing:** The Route Structure (`/app`) and Core Shell Components (`AvatarContainer`, `ChatPanel` integration).

**Objectives:**

1.  **Create Route Structure (Phase 1.1):**
    -   Create `src/app/app/layout.tsx` (Main App Shell - includes Header + Avatar + Chat).
    -   Create `src/app/app/page.tsx` (Redirects to /workshop or acts as Dashboard).
    -   Create `src/app/app/workshop/page.tsx` (Design Canvas).
    -   Create `src/app/app/showroom/page.tsx` (Product Gallery).
    -   Create `src/app/app/support/page.tsx` (Support View).
    -   Update `src/app/page.tsx` (Landing Page) to use `HeroSection`.

2.  **Implement Avatar Container (Phase 1.2):**
    -   Create `src/components/AvatarContainer.tsx`.
    -   Implement `useRiveAvatar` hook in `src/hooks/useRiveAvatar.ts`.
    -   *Note:* Use static placeholders from `public/rive/` if .riv files are missing.

3.  **Implement Chat UI Shell (Phase 1.3):**
    -   Create `src/components/ChatPanel.tsx` (Fixed bottom bar).
    -   Create `src/components/ChatBubbleList.tsx`.
    -   Create `src/hooks/useMockConversation.ts`.

4.  **Hero-to-Copilot Transition (Phase 1.4):**
    -   Create `src/components/TransitionLayout.tsx` (Wraps the AvatarContainer with Framer Motion LayoutGroup).
    -   Integrate this into `src/app/app/layout.tsx`.

**Reference:** [MVP Roadmap Phase 1](file:///Users/victorbendas/Documents/GitHub/Merch-From/Documentation/dev/MVP%20Roadmap.md)
