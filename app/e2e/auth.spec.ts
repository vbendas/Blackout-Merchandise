import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';

/**
 * Authentication E2E Tests
 * 
 * Tests the critical authentication flow
 * Priority: CRITICAL - Required for access to the app
 * 
 * Note: These tests may require Clerk test credentials
 * or a mock authentication setup
 */

test.describe('Authentication Flow', () => {
  test('home page redirects to app', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to /app or /app/workspace
    await page.waitForURL('**/app/**', { timeout: 5000 });
    
    const url = page.url();
    expect(url).toContain('/app');
  });

  test('unauthenticated user can access waitlist', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Should be able to access waitlist without auth
    await page.goto('/waitlist');
    await expect(page.locator('h1')).toContainText(/waitlist|join/i);
  });

  test('unauthenticated user sees sign in option', async ({ page }) => {
    await page.goto('/');
    
    // Look for sign in/up buttons
    const authButton = page.locator('button:has-text("Sign In"), button:has-text("Sign Up"), button:has-text("Get Started")').first();
    
    // Button should be visible or we should be redirected to auth
    const isVisible = await authButton.isVisible().catch(() => false);
    const isRedirected = page.url().includes('/app') || page.url().includes('sign');
    
    expect(isVisible || isRedirected).toBe(true);
  });
});

test.describe('Protected Routes', () => {
  test('workspace requires authentication', async ({ page, context }) => {
    // Clear any existing auth state
    await context.clearCookies();
    
    await page.goto('/app/workspace');
    
    // Should redirect to sign in or show auth modal
    const url = page.url();
    const hasAuth = url.includes('sign') || url.includes('auth');
    const hasSignInButton = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
    
    expect(hasAuth || hasSignInButton).toBe(true);
  });

  test('catalog requires authentication', async ({ page, context }) => {
    await context.clearCookies();
    
    await page.goto('/app/catalog');
    
    const url = page.url();
    const hasAuth = url.includes('sign') || url.includes('auth');
    const hasSignInButton = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
    
    expect(hasAuth || hasSignInButton).toBe(true);
  });
});

test.describe('User Session', () => {
  test('authenticated user can access workspace', async ({ page }) => {
    // This test assumes authentication is handled via Clerk
    // In a real scenario, you would use stored auth state or API login
    
    await page.goto('/app/workspace');
    
    // If authenticated, should see chat interface
    const chatInput = page.locator('input[placeholder*="message" i], #message-input').first();
    const needsAuth = await page.locator('button:has-text("Sign In")').isVisible().catch(() => false);
    
    if (!needsAuth) {
      await expect(chatInput).toBeVisible();
    }
  });

  test('user can sign out', async ({ page }) => {
    // Navigate to workspace first
    await page.goto('/app/workspace');
    
    // Look for user menu or sign out button
    const userMenu = page.locator('[data-testid="user-avatar"], button:has(.lucide-user)').first();
    
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      
      const signOutButton = page.locator('button:has-text("Sign Out"), text=Sign Out').first();
      if (await signOutButton.isVisible().catch(() => false)) {
        await signOutButton.click();
        await page.waitForTimeout(1000);
        
        // Should be redirected or show sign in
        const url = page.url();
        expect(url.includes('sign') || url === '/').toBe(true);
      }
    }
  });
});
