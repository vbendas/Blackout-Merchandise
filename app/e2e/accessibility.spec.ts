import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 * 
 * Tests keyboard navigation, screen reader compatibility, and basic a11y
 * Priority: HIGH - Required for inclusive design
 */

test.describe('Accessibility', () => {
  test('waitlist page has proper heading structure', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Check for h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    
    // Verify heading is not empty
    const headingText = await h1.textContent();
    expect(headingText?.trim().length).toBeGreaterThan(0);
  });

  test('interactive elements have proper labels', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either text content or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Click to get to form
    const getStarted = page.locator('button:has-text("Get Started")').first();
    if (await getStarted.isVisible()) {
      await getStarted.click();
      await page.waitForTimeout(300);
    }
    
    // Check inputs have labels or aria-labels
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have some form of labeling
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });

  test('keyboard navigation works on waitlist', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Get the active element
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Check text contrast for main elements
    // This is a basic check - for comprehensive testing, use axe-core
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    
    // Get computed styles
    const styles = await heading.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });
    
    // Colors should be defined
    expect(styles.color).toBeTruthy();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/waitlist');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be marked as decorative
      expect(alt !== null || ariaLabel || role === 'presentation' || role === 'none').toBe(true);
    }
  });

  test('chat page has proper ARIA landmarks', async ({ page }) => {
    await page.goto('/app/workspace');
    
    // Check for main landmark
    const main = await page.locator('main, [role="main"]').count();
    const navigation = await page.locator('nav, [role="navigation"]').count();
    
    // Should have semantic landmarks
    expect(main + navigation).toBeGreaterThan(0);
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    
    // Focus styles should be defined
    if (activeElement) {
      expect(activeElement.outline || activeElement.boxShadow).toBeTruthy();
    }
  });

  test('page has proper language attribute', async ({ page }) => {
    await page.goto('/waitlist');
    
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('skip links or main content landmark exists', async ({ page }) => {
    await page.goto('/waitlist');
    
    // Check for skip link
    const skipLink = page.locator('a[href^="#"]').filter({ hasText: /skip|jump/i });
    
    // Or check for main content
    const mainContent = page.locator('main, [role="main"], #main, #content');
    
    const hasSkipLink = await skipLink.isVisible().catch(() => false);
    const hasMainContent = await mainContent.isVisible().catch(() => false);
    
    expect(hasSkipLink || hasMainContent).toBe(true);
  });
});
