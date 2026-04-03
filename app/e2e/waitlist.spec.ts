import { test, expect } from '@playwright/test';
import { WaitlistPage } from './pages/WaitlistPage';

/**
 * Waitlist E2E Tests
 * 
 * Tests the critical conversion path: waitlist signup flow
 * Priority: CRITICAL - This is the main conversion funnel
 */

test.describe('Waitlist Flow', () => {
  let waitlistPage: WaitlistPage;

  test.beforeEach(async ({ page }) => {
    waitlistPage = new WaitlistPage(page);
    await waitlistPage.goto();
  });

  test('user can complete full waitlist signup flow', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    
    await waitlistPage.completeFullWaitlist(
      'Test User',
      uniqueEmail,
      'https://instagram.com/testuser',
      '10k-50k',
      ['I want to sell merchandise to my fans', 'Digital art']
    );

    await waitlistPage.verifySuccess();
  });

  test('user can navigate between steps', async () => {
    // Go to step 2
    await waitlistPage.completeStep1();
    
    // Fill step 2
    await waitlistPage.nameInput.fill('Test User');
    await waitlistPage.emailInput.fill('test@example.com');
    await waitlistPage.nextButton.click();
    
    // Go back to step 2
    await waitlistPage.goBack();
    
    // Verify we're back on step 2 and data is preserved
    await expect(waitlistPage.nameInput).toHaveValue('Test User');
    await expect(waitlistPage.emailInput).toHaveValue('test@example.com');
  });

  test('validation prevents submission without required fields', async () => {
    await waitlistPage.completeStep1();
    
    // Try to proceed without filling anything
    await waitlistPage.nextButton.click();
    
    // Should still be on step 2
    await expect(waitlistPage.nameInput).toBeVisible();
  });

  test('validation prevents invalid email', async () => {
    await waitlistPage.completeStep1();
    
    await waitlistPage.nameInput.fill('Test User');
    await waitlistPage.emailInput.fill('invalid-email');
    await waitlistPage.nextButton.click();
    
    // Should show error or stay on step 2
    await expect(waitlistPage.emailInput).toBeVisible();
  });

  test('duplicate email shows error', async ({ page }) => {
    const existingEmail = 'existing@example.com';
    
    // First submission
    await waitlistPage.completeFullWaitlist(
      'First User',
      existingEmail,
      'https://instagram.com/first',
      '1k-5k',
      ['Response 1', 'Response 2']
    );
    
    // Try second submission with same email
    await waitlistPage.goto();
    await waitlistPage.completeStep1();
    await waitlistPage.completeStep2('Second User', existingEmail);
    
    // Should show error
    const errorMessage = page.locator('text=/already|exists|registered/i').first();
    await expect(errorMessage).toBeVisible();
  });

  test('step indicator shows correct progress', async () => {
    // Check initial step
    const initialStep = await waitlistPage.getCurrentStep();
    expect(initialStep).toBe(1);
    
    // Move through steps and verify indicator
    await waitlistPage.completeStep1();
    await waitlistPage.completeStep2('Test', 'test@example.com');
    
    // Step indicator should reflect progress
    await expect(waitlistPage.stepIndicator).toContainText('2');
  });

  test('social link field accepts various platform URLs', async () => {
    const platforms = [
      'https://instagram.com/testuser',
      'https://twitter.com/testuser',
      'https://tiktok.com/@testuser',
      'https://youtube.com/c/testuser',
    ];

    await waitlistPage.completeStep1();
    await waitlistPage.completeStep2('Test User', `test-${Date.now()}@example.com`);

    for (const url of platforms) {
      await waitlistPage.socialLinkInput.fill(url);
      await expect(waitlistPage.socialLinkInput).toHaveValue(url);
      // Clear for next test
      await waitlistPage.socialLinkInput.clear();
    }
  });
});

test.describe('Waitlist Responsive Design', () => {
  test('form is usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const waitlistPage = new WaitlistPage(page);
    await waitlistPage.goto();
    
    // All steps should be accessible on mobile
    await waitlistPage.completeStep1();
    await expect(waitlistPage.nameInput).toBeVisible();
    
    await waitlistPage.completeStep2('Mobile User', `mobile-${Date.now()}@example.com`);
    await expect(waitlistPage.socialLinkInput).toBeVisible();
  });

  test('form is usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const waitlistPage = new WaitlistPage(page);
    await waitlistPage.goto();
    
    await waitlistPage.completeStep1();
    await expect(waitlistPage.nameInput).toBeVisible();
  });

  test('form is usable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const waitlistPage = new WaitlistPage(page);
    await waitlistPage.goto();
    
    await waitlistPage.completeStep1();
    await expect(waitlistPage.nameInput).toBeVisible();
  });
});
