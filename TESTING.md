# Testing Guide

This document outlines the testing infrastructure and best practices for the Merch From project.

## Overview

We have a comprehensive testing setup that includes:

- **Unit Tests**: Vitest for testing database operations, utilities, and API routes
- **E2E Tests**: Playwright for testing critical user journeys
- **CI/CD**: GitHub Actions for automated testing on every PR

## Quick Start

```bash
# Install dependencies
bun install

# Run all tests
bun run test

# Run unit tests only
bun run test:unit

# Run unit tests in watch mode
bun run test:unit:watch

# Run unit tests with coverage
bun run test:unit:coverage

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI mode (for debugging)
bun run test:e2e:ui

# Run E2E tests in headed mode (see browser)
bun run test:e2e:headed
```

## Test Structure

### Unit Tests

Located in `app/src/**/*.test.ts`:

- `src/db/*.test.ts` - Database operations
- `src/lib/*.test.ts` - Utility functions
- `src/app/api/*/route.test.ts` - API routes

### E2E Tests

Located in `app/e2e/*.spec.ts`:

- `waitlist.spec.ts` - Waitlist signup flow
- `chat.spec.ts` - Chat interface
- `auth.spec.ts` - Authentication flow
- `accessibility.spec.ts` - Accessibility tests
- `navigation.spec.ts` - Navigation and routing

### Page Objects

Located in `app/e2e/pages/*.ts`:

- `WaitlistPage.ts` - Waitlist page interactions
- `ChatPage.ts` - Chat/workspace page interactions
- `LoginPage.ts` - Authentication page interactions

## Testing Philosophy

### Unit Tests

1. **Test behavior, not implementation** - Tests should survive refactors
2. **One assertion per test** - Clear failure messages
3. **Mock external dependencies** - Don't hit real APIs in tests
4. **Fast feedback** - Unit tests should run in <10 seconds

### E2E Tests

1. **Test what matters**:
   - Critical user journeys (login, checkout, signup)
   - Complex interactions (multi-step forms)
   - Cross-browser compatibility

2. **What NOT to test**:
   - Unit-level logic (use unit tests)
   - API contracts (use integration tests)
   - Edge cases (too slow for E2E)

3. **Best Practices**:
   - Test user behavior, not implementation
   - Keep tests independent
   - Make tests deterministic
   - Use data-testid, not CSS selectors

## Database Testing

Database tests use mocked connections. Never connect to production databases in tests.

```typescript
// Mock example
vi.mock('./index', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  eq: vi.fn(),
}));
```

## E2E Testing Tips

### Running Specific Tests

```bash
# Run a specific test file
bun run test:e2e waitlist.spec.ts

# Run a specific test
bun run test:e2e -- -g "user can complete full waitlist signup flow"

# Run tests in a specific project (browser)
bun run test:e2e -- --project=chromium
```

### Debugging E2E Tests

```bash
# Run with UI mode for step-by-step debugging
bun run test:e2e:ui

# Run in headed mode to see the browser
bun run test:e2e:headed

# Run a specific test with debugging
bun run test:e2e:debug waitlist.spec.ts
```

### Updating Snapshots

```bash
# Update all snapshots
bun run test:e2e -- --update-snapshots
```

## CI/CD Integration

Tests run automatically on:

1. Every push to `main` or `develop`
2. Every pull request to `main` or `develop`

The CI pipeline includes:

1. Type checking
2. Linting
3. Unit tests with coverage
4. E2E tests
5. Build verification

### Coverage Requirements

- Minimum 80% coverage for database operations
- Minimum 60% coverage for utilities
- E2E tests cover all critical paths

## Environment Setup for Testing

### Local Development

1. Copy `.env.test.example` to `.env.test.local`
2. Fill in your test credentials
3. Ensure you're using test databases and API keys only!

### Test Database

Set up a separate test database branch in Neon:

```bash
# Use the test environment
cp .env.test .env.test.local
# Edit .env.test.local with your test database URL
```

### Clerk Testing

For E2E tests with real authentication:

1. Create a test user in Clerk Dashboard
2. Use the test credentials in your `.env.test.local`
3. Or use Clerk's test mode with test email addresses

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
- Run `bun install` to ensure all dependencies are installed
- Check that your import paths are correct

**E2E tests timeout**
- Increase timeout in `playwright.config.ts`
- Ensure the dev server is running: `bun run dev`
- Check that ports are not in use

**Database tests fail**
- Ensure you're mocking the database correctly
- Don't connect to real databases in unit tests

**Playwright browsers not installed**
```bash
bunx playwright install
```

### Getting Help

1. Check the Vitest documentation: https://vitest.dev/
2. Check the Playwright documentation: https://playwright.dev/
3. Review existing tests for patterns and examples

## Adding New Tests

### Adding a Unit Test

1. Create a file named `[module].test.ts` next to the module
2. Import the module and write tests using `describe` and `it`
3. Mock external dependencies
4. Run with `bun run test:unit`

### Adding an E2E Test

1. Create a file in `e2e/[feature].spec.ts`
2. Use Page Object Models for maintainability
3. Focus on critical user journeys
4. Run with `bun run test:e2e`

### Adding a Page Object

1. Create a file in `e2e/pages/[PageName].ts`
2. Define locators for key elements
3. Add methods for common interactions
4. Use in E2E tests

## Best Practices Checklist

- [ ] Tests are independent and can run in any order
- [ ] Tests clean up after themselves
- [ ] Mock external APIs and services
- [ ] Use descriptive test names
- [ ] One assertion per test (where possible)
- [ ] E2E tests use data-testid attributes
- [ ] Page Objects encapsulate page logic
- [ ] Tests are deterministic (no random failures)
- [ ] Coverage is maintained or improved

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
