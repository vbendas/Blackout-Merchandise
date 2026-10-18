# 🤖 Agent 1: Code Verification Stack

**Branch:** `feature/code-verification`
**Time Estimate:** 4 hours
**Agent Role:** Establish code quality infrastructure (formatting, linting, type checking, secret scanning)

---

## Task Breakdown

### Task 1.1: Install Verification Tools (30 min)

**Explanation:** Before setting up verification, we need to install the actual tools. We're adding Biome (formatter + linter), oxlint (fast JS/Linter), tsgo (TypeScript type checking), secretlint (secret detection), and Husky (git hooks). These are standard industry tools with proven reliability.

**Subtasks:**
1. Navigate to `/app` directory
2. Install dev dependencies with Bun:
   ```bash
   bun add -D @biomejs/biome oxlint tsgo secretlint husky
   ```
3. Navigate to `/mainpage` directory
4. Install dev dependencies with npm:
   ```bash
   npm install -D @biomejs/biome oxlint tsgo secretlint husky
   ```
5. Verify installation by checking `package.json` in both projects

**Deliverables:**
- `app/package.json` updated with 5 new dev dependencies
- `mainpage/package.json` updated with 5 new dev dependencies
- All tools installed in `node_modules` for both projects

**Verification:**
Run `bunx biome --version` and `npx biome --version` to confirm installations succeed.

---

### Task 1.2: Create Configuration Files (45 min)

**Explanation:** Each tool needs configuration files to know what rules to enforce. We're creating 10 configuration files total (5 per project) with rules that match project's existing conventions (2 spaces, 120 char width, zinc color palette).

**Subtasks:**
1. Create `app/biome.json` with formatting rules:
   - 2-space indentation
   - 120 character line width
   - Single quotes for strings
   - Proper trailing commas and semicolons
2. Create `app/.oxlintrc.json` with lint rules:
   - No console.log (warn)
   - No debugger (error)
   - No unused variables (error)
   - No empty code (error)
3. Create `app/.secretlintrc.json` with secret detection patterns:
   - AWS Access Keys (AKIA[0-9A-Z]{16}")
   - Stripe live keys (sk_live_[0-9a-zA-Z]{24,}")
   - Clerk live keys (sk_live_[0-9a-zA-Z]{24,}")
   - Generic API keys (sk_(or-v1|test|live)[0-9a-zA-Z_-]{20,}")
   - Database URLs with passwords
   - Allowlist: .env.example, .env.staging, README.md, test files
4. Copy all 3 config files from `/app` to `/mainpage` with identical content
5. Verify no syntax errors in all JSON files

**Deliverables:**
- `app/biome.json` created
- `app/.oxlintrc.json` created
- `app/.secretlintrc.json` created
- `mainpage/biome.json` created (identical to app)
- `mainpage/.oxlintrc.json` created (identical to app)
- `mainpage/.secretlintrc.json` created (identical to app)
- All JSON files valid with proper syntax

**Verification:**
Run `cat app/biome.json` to verify content created correctly.

---

### Task 1.3: Create Unified Verification Script (1 hour)

**Explanation:** We need a single script that runs all verification checks in correct order (format → lint → type check → secrets) for both projects. This script will be executable and provide clear colored output showing pass/fail status for each check.

**Subtasks:**
1. Create `verify.sh` in project root (`/blackout-merchandise`)
2. Implement `verify_project()` function that:
   - Takes project directory, package manager, and project name as arguments
   - Changes to project directory
   - Runs Biome formatting check
   - Runs oxlint linting
   - Runs tsgo type checking
   - Runs secretlint scanning
   - Tracks error count across all checks
   - Returns appropriate exit code
3. Implement colored output constants (RED, GREEN, YELLOW, NC)
4. Script calls `verify_project()` for `/app` with `bunx` package manager
5. Script calls `verify_project()` for `/mainpage` with `npx` package manager
6. Script outputs final summary (all passed or show which failed)
7. Make script executable: `chmod +x verify.sh`

**Deliverables:**
- `verify.sh` created in project root
- Script is executable (`ls -la verify.sh` shows `-rwxr-xr-x`)
- Script runs verification for both apps

**Verification:**
Run `./verify.sh` and verify both projects are checked.

---

### Task 1.4: Update package.json Scripts (30 min)

**Explanation:** Both projects need convenience scripts so developers can run individual checks or full verification easily. We're adding format, oxlint, typecheck, secrets, and verify scripts to each project's package.json.

**Subtasks:**
1. Edit `app/package.json` - add to "scripts" section:
   - `"format": "biome check --write src/"`
   - `"oxlint": "oxlint src/"`
   - `"typecheck": "tsgo --noEmit src/"`
   - `"secrets": "secretlint \"src/**/*.{ts,tsx,js,jsx}\""`
   - `"verify": "chmod +x ../verify.sh && ../verify.sh"`
   - `"pre-commit": "npm run verify"`
2. Edit `mainpage/package.json` - add identical scripts section
3. Verify JSON syntax is valid (no trailing commas, proper quotes)
4. Test that individual scripts can be run

**Deliverables:**
- `app/package.json` updated with 6 new scripts
- `mainpage/package.json` updated with 6 new scripts
- Both JSON files syntactically valid

**Verification:**
Run `cd app && bun run format` and `cd mainpage && npm run format` to test.

---

### Task 1.5: Setup Git Pre-commit Hooks (45 min)

**Explanation:** Husky creates `.git/hooks/pre-commit` automatically. We're configuring it so that verification runs before any commit can be created, blocking bad code from entering the repository.

**Subtasks:**
1. In `/app` directory, run:
   ```bash
   bun add -D husky && bunx husky install
   ```
2. In `/mainpage` directory, run:
   ```bash
   npm install -D husky && npx husky install
   ```
3. Verify `.husky/` directory created in both projects
4. Create shared `.husky/pre-commit` at project root:
   ```bash
   #!/bin/bash
   
   if [[ "$(pwd)" == *"/app"* ]]; then
     cd app && bun run verify
   elif [[ "$(pwd)" == *"/mainpage"* ]]; then
     cd mainpage && npm run verify
   else
     chmod +x verify.sh && ./verify.sh
   fi
   ```
5. Make `.husky/pre-commit` executable: `chmod +x .husky/pre-commit`

**Deliverables:**
- Husky installed in both projects
- `.husky/pre-commit` created at project root
- Pre-commit hook is executable

**Verification:**
Run `git commit --dry-run` and verify pre-commit hook is triggered (you should see verification output).

---

### Task 1.6: Update CLAUDE.md Documentation (30 min)

**Add section to** `Documentation/CLAUDE.md`:

```markdown
## Code Verification Workflow

### Mandatory Verification Stack
All code changes must pass **formatting, linting, type checking, and secret scanning** before commit.

### Verification Commands

```bash
# Verify all projects
./verify.sh

# Verify specific project
cd app && bun run verify      # App project
cd mainpage && npm run verify  # Mainpage project
```

### Pre-commit Hook
Pre-commit hook runs verification automatically. **Failed verification BLOCKS commit**.

To bypass (use sparingly): `git commit --no-verify`
```

### Best Practices
1. Run verification before commits
2. Fix issues immediately
3. Never commit secrets
```

**Verification:**
Open file - confirm new section is present.
```

---

### Task 1.7: Testing Phase (30 min)

**Explanation:** Before declaring this task complete, we need to verify that the entire verification stack works end-to-end. We'll run various scenarios to ensure everything functions as expected.

**Subtasks:**
1. **Test intentional lint error:** Create file with `console.log('test')` → verify oxlint catches it
2. **Test type error:** Remove type annotation from a variable → verify tsgo catches it
3. **Test secret leak:** Add `const stripeKey = 'sk_live_test123'` to a file → verify secretlint catches it
4. **Run verification on intentional bad code:** Run `./verify.sh` → should fail on at least one check
5. **Fix all intentional errors:** Remove console.log, add type annotation, remove dummy key
6. **Run verification again:** Run `./verify.sh` → should pass all checks
7. **Test pre-commit blocking:** Stage bad files, try `git commit` → verify pre-commit blocks
8. **Test pre-commit bypass:** Try `git commit --no-verify` → verify commit succeeds
9. **Clean up test files:** Remove test files created during testing
10. Document test results

**Deliverables:**
- Verification stack tested with intentional bad code
- Verification stack passes with good code
- Pre-commit hooks verified to work
- Pre-commit bypass works
- Test results documented

**Verification:**
All test scenarios should pass and be documented.

---

## Agent 1 Completion Checklist

- [ ] All 6 dev dependencies installed (app + mainpage)
- [ ] All 10 config files created (5 per project)
- [ ] verify.sh created and executable
- [ ] verify.sh runs checks for both apps
- [ ] Individual scripts work (format, oxlint, typecheck, secrets)
- [ ] Pre-commit hook blocks bad commits
- [ ] Pre-commit bypass with `--no-verify` works
- [ ] CLAUDE.md updated with verification workflow
- [ ] All 7 tasks completed
- [ ] Branch ready for review and merge
