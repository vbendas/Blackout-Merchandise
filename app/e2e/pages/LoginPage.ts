import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Authentication/Login Page
 * Handles Clerk authentication interactions
 */
export class LoginPage {
  readonly page: Page;
  readonly signInButton: Locator;
  readonly signUpButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly continueButton: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
    this.signUpButton = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up"), button:has-text("Get Started")').first();
    this.emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first();
    this.passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    this.continueButton = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    this.verifyButton = page.locator('button:has-text("Verify")').first();
  }

  /**
   * Navigate to home page
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Click sign in button to open auth modal
   */
  async openSignIn() {
    await this.signInButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click sign up button to open auth modal
   */
  async openSignUp() {
    await this.signUpButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    await this.openSignIn();
    await this.emailInput.fill(email);
    await this.continueButton.click();
    await this.page.waitForTimeout(300);
    
    await this.passwordInput.fill(password);
    await this.continueButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, firstName?: string, lastName?: string) {
    await this.openSignUp();
    
    // Fill name fields if provided
    if (firstName) {
      const firstNameInput = this.page.locator('input[name="firstName"], input[placeholder*="first" i]').first();
      await firstNameInput.fill(firstName);
    }
    
    if (lastName) {
      const lastNameInput = this.page.locator('input[name="lastName"], input[placeholder*="last" i]').first();
      await lastNameInput.fill(lastName);
    }
    
    await this.emailInput.fill(email);
    await this.continueButton.click();
    await this.page.waitForTimeout(300);
    
    await this.passwordInput.fill(password);
    await this.continueButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    // Look for user avatar or sign out button
    const userIndicator = this.page.locator('[data-testid="user-avatar"], button:has-text("Sign Out")').first();
    return userIndicator.isVisible().catch(() => false);
  }

  /**
   * Sign out
   */
  async signOut() {
    const signOutButton = this.page.locator('button:has-text("Sign Out")').first();
    if (await signOutButton.isVisible().catch(() => false)) {
      await signOutButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Wait for redirect after login
   */
  async waitForRedirect(expectedPath?: string) {
    if (expectedPath) {
      await this.page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
    } else {
      // Wait for any navigation
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Get current URL path
   */
  async getCurrentPath(): Promise<string> {
    const url = new URL(this.page.url());
    return url.pathname;
  }
}
