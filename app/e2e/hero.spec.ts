import { test, expect } from '@playwright/test';

test.describe('Hero Empty State', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the workspace home (empty state)
    await page.goto('/app/workspace');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('hero renders with agent avatar, greeting, and prompt input', async ({ page }) => {
    // Avatar should be visible
    const avatar = page.locator('[alt*="neutral"]').first();
    await expect(avatar).toBeVisible();

    // Greeting should be visible
    const greeting = page.locator('text=/Ready to create something stunning|Hey there!/i').first();
    await expect(greeting).toBeVisible();

    // Prompt input should be visible
    const promptInput = page.locator('textarea[placeholder*="Ask"]').first();
    await expect(promptInput).toBeVisible();

    // Send button should be disabled when empty
    const sendButton = page.locator('button:has([icon="lucide:arrow-up"])').first();
    await expect(sendButton).toBeDisabled();
  });

  test('suggestion pills are visible and clickable', async ({ page }) => {
    // Wait for pills to animate in
    await page.waitForTimeout(500);

    // Should have suggestion pills
    const pills = page.locator('button:has-text("Show me")');
    await expect(pills.first()).toBeVisible();

    // Count should be 5-6
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('clicking suggestion opens chat takeover', async ({ page }) => {
    // Wait for pills to animate in
    await page.waitForTimeout(500);

    // Click a suggestion pill
    const pill = page.locator('button:has-text("Show me")').first();
    await pill.click();

    // Chat takeover should appear
    const takeover = page.locator('text=/is typing|How can I help/i').first();
    await expect(takeover).toBeVisible({ timeout: 3000 });

    // Minimize button should be visible
    const minimizeButton = page.locator('button[aria-label="Minimize chat"]').first();
    await expect(minimizeButton).toBeVisible();
  });

  test('floating chat widget is hidden on workspace home', async ({ page }) => {
    // The floating avatar button should NOT be visible
    const floatingAvatar = page.locator('button:has([alt*="Leopoldo"])').last();
    // Wait a bit for any animations
    await page.waitForTimeout(1000);
    await expect(floatingAvatar).not.toBeVisible();
  });

  test('typing in prompt input enables send button', async ({ page }) => {
    const promptInput = page.locator('textarea[placeholder*="Ask"]').first();
    const sendButton = page.locator('button:has([icon="lucide:arrow-up"])').first();

    // Initially disabled
    await expect(sendButton).toBeDisabled();

    // Type something
    await promptInput.fill('Hello, test message');

    // Should be enabled
    await expect(sendButton).toBeEnabled();
  });
});
