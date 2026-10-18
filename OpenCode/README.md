# 🤖 P0 Agent Instructions

**All 5 agent files ready for parallel execution in `/Opencode` directory**

---

## 📋 Available Agents

| Agent | File | Focus | Time |
|-------|------|-------|------|
| **Agent 1** | `agent-1-code-verification.md` | Code verification stack (Biome, oxlint, tsgo, secretlint, Husky) | 4h |
| **Agent 2** | `agent-2-gdpr-database-api.md` | GDPR database & API (schema, migrations, data rights routes) | 4h |
| **Agent 3** | `agent-3-gdpr-frontend.md` | GDPR frontend (consent banner, privacy policy, data rights portal) | 4h |
| **Agent 4** | `agent-4-gdpr-automation-docs.md` | GDPR automation (cron job, webhooks, layout, documentation) | 3.5h |
| **Agent 5** | `agent-5-quick-wins.md` | Quick wins (confidence, tracking, planning workflows) | 2.5h |

**Total:** 18 hours P0 work

---

## 🚀 How to Start

### Step 1: Create Feature Branches

For each agent, create a separate branch:

```bash
git checkout -b main
git checkout -b feature/agent-1-code-verification

git checkout -b main
git checkout -b feature/agent-2-gdpr-database-api

git checkout -b main
git checkout -b feature/agent-3-gdpr-frontend

git checkout -b main
git checkout -b feature/agent-4-gdpr-automation-docs

git checkout -b main
git checkout -b feature/agent-5-quick-wins
```

### Step 2: Paste Agent Instructions

Open the agent file you want to work on:

```bash
cat /path/to/blackout-merchandise/Opencode/agent-1-code-verification.md
# OR
cat /path/to/blackout-merchandise/Opencode/agent-2-gdpr-database-api.md
# etc.
```

### Step 3: Follow Task List

Follow the task breakdown from top to bottom. Mark tasks complete as you finish them with `[x]`.

### Step 4: Test Locally

Run verification or test functionality:
- Agent 1: `./verify.sh`
- Agent 2: Test GDPR APIs
- Agent 3: Test frontend components
- Agent 4: Test cron jobs
- Agent 5: Test documentation flows

### Step 5: Commit Progress

Frequent commits with descriptive messages:
```bash
git commit -m "Install verification tools" # After Task 1.1
git commit -m "Create config files" # After Task 1.2
git push origin feature/agent-1-code-verification
```

### Step 6: Create Pull Request

When branch is ready:

```bash
git checkout -b main
git push origin feature/agent-1-code-verification
# Then create PR on GitHub
```

### Step 7: Merge to Main

After Victor reviews and approves all 5 branches:

```bash
git checkout -b main
git merge feature/agent-1-code-verification
git merge feature/agent-2-gdpr-database-api
git merge feature/agent-3-gdpr-frontend
git merge feature/agent-4-gdpr-automation-docs
git merge feature/agent-5-quick-wins
git push origin main
```

---

## 📊 Execution Order (Recommended)

### Phase 1: Independent Work (can start anytime)
1. **Agent 1** (4h) - Code Verification Stack
2. **Agent 5** (2.5h) - Quick Wins

### Phase 2: Database Foundation (depends on Agent 2)
3. **Agent 3** (4h) - GDPR Frontend

### Phase 3: Automation & Integration (depends on Agents 2, 3, 4)
4. **Agent 4** (3.5h) - GDPR Automation

---

## ✅ Ready!

All 5 agents have detailed instructions. Open 5 terminal sessions and start parallel development!

Good luck with P0 implementation! 🚀
