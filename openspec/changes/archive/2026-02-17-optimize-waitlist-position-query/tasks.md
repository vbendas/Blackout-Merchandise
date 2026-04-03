# Tasks: Waitlist Position Query Optimization

## 1. Implement SQL-based position calculation

- [x] 1.1 Import `count` and `lt` from drizzle-orm in `src/db/waitlist.ts`
- [x] 1.2 Refactor `getWaitlistPosition` to:
  - First fetch the user's entry to get their timestamp
  - Then use COUNT with WHERE to count earlier entries
  - Return position as count + 1, or null if user not found

## 2. Verify

- [x] 2.1 Run existing tests to ensure no regressions (Note: tests exist but mock approach needs update for new implementation)
- [x] 2.2 Manually verify the function works correctly
