# MerchFrom OpenCode Skill Catalog

> **Purpose**: Quick reference for all 292 OpenCode skills available in `.opencode/skills/`  
> **Usage**: Reference these skills when working on specific tasks  
> **Last Updated**: January 30, 2026

---

## 🎯 How to Use This Catalog

When working on a task, **reference the relevant skill** by reading its SKILL.md file:

```bash
# Example: Working on database optimization
cat .opencode/skills/postgres-best-practices/SKILL.md

# Example: Setting up E2E tests  
cat .opencode/skills/e2e-testing-patterns/SKILL.md
```

---

## 📊 Database & PostgreSQL (5 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `postgres-best-practices` | Performance optimization | Query tuning, indexing, RLS |
| `postgres-schema-design` | Table design | Schema design, data types, constraints |
| `postgresql-table-design` | Table patterns | Table structure, partitioning |
| `create-database-migration` | Migration creation | Writing Drizzle migrations |
| `database-migration` | Migration patterns | Migration strategies |
| `sql-optimization-patterns` | Query optimization | Complex SQL optimization |

**Key Files:**
- `src/db/schema.ts` - Schema definition
- `src/db/*.ts` - Database operations
- `drizzle/` - Migration files

---

## ⚛️ Frontend & React (17 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `nextjs-app-router-patterns` | Next.js 14+ patterns | Server Components, routing, data fetching |
| `react-state-management` | State patterns | Zustand, Context, hooks |
| `react-modernization` | React upgrades | Migrating to React 19 |
| `react-email` | Email templates | Transactional emails |
| `frontend-code-review` | Code review | Reviewing React/Next.js code |
| `frontend-design` | Frontend patterns | Component architecture |
| `frontend-ui-ux` | UI/UX patterns | Interface design |
| `ui-design-system` | Design systems | Component libraries |
| `ui-ux-pro-max` | Advanced UI/UX | Complex interactions |
| `vercel-react-best-practices` | Vercel deployment | Production React apps |
| `component-refactoring` | Component cleanup | Refactoring legacy components |
| `cache-components` | Caching strategies | Component-level caching |
| `gaming-ui-state-management` | Game UI patterns | Complex stateful UIs |
| `senior-frontend` | Expert frontend | Advanced patterns |
| `artifacts-builder` | Build artifacts | Build optimization |
| `web-artifacts-builder` | Web builds | Production builds |

**Key Files:**
- `/app/src/components/` - React components
- `/app/src/app/` - Next.js App Router
- `/mainpage/src/components/` - Marketing site components

---

## 🧪 Testing (14 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `e2e-testing-patterns` | E2E testing | Playwright setup, patterns |
| `vitest` | Unit testing | Vitest configuration |
| `javascript-testing-patterns` | JS testing | Jest/Vitest patterns |
| `playwright` | Browser testing | Playwright automation |
| `test-driven-development` | TDD | Writing tests first |
| `test-coverage-improver` | Coverage | Improving test coverage |
| `verify-tests-fail-without-fix` | Test verification | Ensuring tests catch bugs |
| `write-e2e-tests` | E2E authoring | Writing Playwright tests |
| `write-unit-tests` | Unit test authoring | Writing Vitest tests |
| `write-tests` | General testing | Test writing patterns |
| `bats-testing-patterns` | Bash testing | Shell script testing |
| `python-testing-patterns` | Python testing | pytest patterns |
| `testing-python` | Python tests | Python test setup |
| `webapp-testing` | Web app testing | Full-stack testing |
| `web-renderer-test` | Rendering tests | Component rendering tests |

**Key Files:**
- `*.test.ts` - Unit tests
- `e2e/*.spec.ts` - E2E tests
- `vitest.config.ts` - Vitest config
- `playwright.config.ts` - Playwright config

---

## 🔧 Backend & API (8 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `api-design-principles` | API design | REST/GraphQL design |
| `api-integration-specialist` | API integration | Third-party APIs |
| `backend-dev-guidelines` | Backend patterns | Server-side development |
| `nodejs-backend-patterns` | Node.js patterns | Express/Next.js API routes |
| `fastapi-templates` | FastAPI | Python API development |
| `dotnet-backend-patterns` | .NET backend | C# API development |
| `openapi-spec-generation` | OpenAPI | API documentation |
| `senior-backend` | Expert backend | Advanced patterns |

**Key Files:**
- `/app/src/app/api/` - API routes
- `/src/db/` - Database operations
- Webhook handlers

---

## 🤖 AI & Agents (6 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `agents` | Agent patterns | Multi-agent systems |
| `agent-identifier` | Agent identification | Agent routing |
| `agent-memory` | Agent memory | Conversation persistence |
| `configured-agent` | Agent configuration | Setting up AI agents |
| `confidence-check` | Confidence assessment | Evaluating solutions |
| `concept-workflow` | Workflow design | AI workflows |

**Key Files:**
- `/app/src/lib/agent-*.ts` - Agent logic
- `/app/src/lib/openrouter.ts` - AI client
- Chat components

---

## 🎨 Design & UI/UX (8 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `ui-ux-pro-max` | Advanced UI/UX | Complex interfaces |
| `ui-ux-pro-max 2` | UI/UX patterns | Alternative patterns |
| `ui-ux-pro-max 3` | UI/UX variations | More patterns |
| `ui-ux-pro-max 4` | UI/UX advanced | Expert patterns |
| `art-style-creator` | Art direction | Visual design |
| `canvas-design` | Canvas graphics | Custom graphics |
| `design-principles` | Design theory | Design decisions |
| `marketing-demand-acquisition` | Marketing | Growth strategies |

**Key Files:**
- `/app/src/components/ui/` - UI components
- Design system documentation
- Brand guidelines

---

## 🔐 Security (5 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `auth-implementation-patterns` | Authentication | Clerk, OAuth, JWT |
| `security-requirement-extraction` | Security reqs | Compliance, GDPR |
| `attack-tree-construction` | Threat modeling | Security analysis |
| `anti-reversing-techniques` | Code protection | Obfuscation |
| `binary-analysis-patterns` | Binary security | Low-level security |

**Key Files:**
- `/app/middleware.ts` - Auth middleware
- Webhook verification
- RLS policies

---

## 🚀 DevOps & Infrastructure (12 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `analyze-ci` | CI analysis | GitHub Actions optimization |
| `deployment-pipeline-design` | Deployment | Vercel deployment |
| `cloudflare-durable-objects` | CF Workers | Edge computing |
| `bazel-build-optimization` | Bazel builds | Build optimization |
| `billing-automation` | Billing | Stripe integration |
| `cache-components` | Caching | Redis, CDN |
| `chroma` | Vector DB | AI embeddings |
| `mcp-builder` | MCP protocol | Model context protocol |
| `web-artifacts-builder` | Build artifacts | Production builds |
| `artifacts-builder` | Artifacts | Build management |
| `cache-components` | Caching | Performance |

**Key Files:**
- `.github/workflows/` - CI/CD
- `vercel.json` - Deployment config
- Infrastructure scripts

---

## 📝 Code Quality & Review (10 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `code-review` | Code review | PR reviews |
| `code-review-excellence` | Expert reviews | Thorough reviews |
| `code-reviewer` | Review automation | Automated reviews |
| `add-review-comment` | Review comments | PR feedback |
| `pr-build-status` | PR checks | Build verification |
| `changelog-automation` | Changelogs | Release notes |
| `changelog-generator` | Changelog gen | Automated logs |
| `commit-helper` | Commits | Git commits |
| `confidence-check` | Validation | Solution verification |
| `code-change-verification` | Change verification | Testing changes |

**Key Files:**
- `.github/workflows/test.yml` - CI
- `verify.sh` - Verification script
- `.husky/pre-commit` - Git hooks

---

## 🎯 Project Management (6 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `agile-product-owner` | Product ownership | Feature prioritization |
| `ceo-advisor` | Strategy | Business decisions |
| `competitive-landscape` | Competition | Market analysis |
| `architecture-decision-records` | ADRs | Architecture docs |
| `architecture-patterns` | Architecture | System design |
| `track-management` | Task tracking | Project management |

**Key Files:**
- `Documentation/` - Project docs
- `PARALLEL_EXECUTION_PLAN.md` - Planning
- Roadmap documents

---

## 🔄 Migration & Modernization (5 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `angular-migration` | Angular migration | Framework migration |
| `react-modernization` | React upgrades | Version upgrades |
| `component-refactoring` | Component cleanup | Legacy code |
| `backport-pr-assistant` | Backporting | Cherry-picking |
| `database-migration` | DB migrations | Schema changes |

**Key Files:**
- Migration scripts
- Refactoring tasks

---

## 💼 Business & Marketing (4 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `competitive-ads-extractor` | Ad analysis | Marketing research |
| `competitive-landscape` | Competition | Market analysis |
| `marketing-demand-acquisition` | Growth | User acquisition |
| `ceo-advisor` | Strategy | Business decisions |

**Key Files:**
- Marketing documentation
- Crowdfunding strategy

---

## 🔍 Search & Discovery (3 skills)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `skill-lookup` | Skill discovery | Finding skills |
| `configured-agent` | Agent setup | AI configuration |
| `connect` | Connections | Integration |

---

## 🛠️ Specialized Skills (20+ skills)

| Category | Skills |
|----------|--------|
| **Python** | `python-testing-patterns`, `testing-python`, `fastapi-templates` |
| **Clojure** | `clojure-review` |
| **Web3** | `web3-testing` |
| **Bash** | `bash-defensive-patterns` |
| **Browser** | `browser-extension-developer` |
| **State** | `react-state-management`, `gaming-ui-state-management` |
| **Email** | `react-email` |
| **Commands** | `command-development`, `command-name` |

---

## 📋 Quick Reference by Task

### Building a New Feature
1. `nextjs-app-router-patterns` - Structure
2. `react-state-management` - State
3. `frontend-ui-ux` - Design
4. `e2e-testing-patterns` - Testing

### Database Work
1. `postgres-schema-design` - Design
2. `postgres-best-practices` - Optimize
3. `create-database-migration` - Migrate
4. `sql-optimization-patterns` - Tune

### API Development
1. `api-design-principles` - Design
2. `nodejs-backend-patterns` - Implement
3. `auth-implementation-patterns` - Secure
4. `api-integration-specialist` - Integrate

### Testing
1. `e2e-testing-patterns` - E2E setup
2. `javascript-testing-patterns` - Unit tests
3. `test-coverage-improver` - Coverage
4. `verify-tests-fail-without-fix` - Verify

### Code Review
1. `code-review` - Review
2. `confidence-check` - Validate
3. `code-change-verification` - Test changes

### Deployment
1. `deployment-pipeline-design` - Pipeline
2. `vercel-react-best-practices` - Vercel
3. `analyze-ci` - CI optimization

---

## 🎯 Top 20 Most Used Skills for MerchFrom

Based on your tech stack, these skills will be most valuable:

1. `postgres-best-practices` - Database optimization
2. `nextjs-app-router-patterns` - Next.js patterns
3. `e2e-testing-patterns` - Playwright testing
4. `api-design-principles` - API design
5. `react-state-management` - State management
6. `auth-implementation-patterns` - Authentication
7. `frontend-ui-ux` - UI design
8. `backend-dev-guidelines` - Backend patterns
9. `vercel-react-best-practices` - Deployment
10. `code-review` - Code quality
11. `postgres-schema-design` - Database design
12. `test-driven-development` - Testing approach
13. `agent-memory` - AI conversation persistence
14. `confidence-check` - Solution validation
15. `deployment-pipeline-design` - CI/CD
16. `api-integration-specialist` - Third-party APIs
17. `javascript-testing-patterns` - Unit testing
18. `ui-design-system` - Component design
19. `security-requirement-extraction` - Compliance
20. `architecture-decision-records` - Documentation

---

## 📝 Usage Example

When starting a task, read the relevant skill:

```typescript
// Task: Optimize slow database query
// Read: cat .opencode/skills/postgres-best-practices/SKILL.md

// Task: Set up Playwright tests
// Read: cat .opencode/skills/e2e-testing-patterns/SKILL.md

// Task: Design new API endpoint
// Read: cat .opencode/skills/api-design-principles/SKILL.md
```

---

**Total Skills Available**: 292  
**Location**: `.opencode/skills/`  
**Format**: YAML frontmatter + Markdown content

For any task, check this catalog first to see if a skill exists that can guide the implementation!
