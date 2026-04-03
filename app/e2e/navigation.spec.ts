import { test, expect } from '@playwright/test';

/**
 * Navigation and Routing E2E Tests
 * 
 * Tests page navigation, routing, and responsive layout
 */

test.describe('Page Navigation', () => {
  test('can navigate to waitlist page', async ({ page }) => {
    await page.goto('/waitlist');
    
    await expect(page.locator('h1')).toContainText(/waitlist|join/i);
    expect(page.url()).toContain('/waitlist');
  });

  test('can navigate to privacy page', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.locator('h1')).toContainText(/privacy/i);
  });

  test('can navigate to data rights page', async ({ page }) => {
    await page.goto('/data-rights');
    
    await expect(page.locator('h1')).toContainText(/data|rights|gdpr/i);
  });

  test('404 page handles unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    
    // Should show 404 or not found message
    const bodyText = await page.locator('body').textContent();
    const hasNotFound = bodyText?.toLowerCase().includes('not found') || 
                        bodyText?.toLowerCase().includes('404') ||
                        bodyText?.toLowerCase().includes("doesn't exist");
    
    expect(hasNotFound).toBe(true);
  });
});

test.describe('Responsive Layout', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} viewport: waitlist page renders correctly`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/waitlist');
      
      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
      
      // Main content should be visible
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  for (const viewport of viewports) {
    test(`${viewport.name} viewport: workspace page renders correctly`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/app/workspace');
      
      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });
  }
});

test.describe('Page Load Performance', () => {
  test('waitlist page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/waitlist');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/waitlist');
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('source map') &&
      !e.includes('chrome-extension')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
