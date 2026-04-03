import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Waitlist Page
 * Encapsulates all interactions with the waitlist multi-step form
 */
export class WaitlistPage {
  readonly page: Page;
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  // Step 1: Welcome
  readonly welcomeHeading: Locator;
  readonly getStartedButton: Locator;

  // Step 2: Basic Info
  readonly nameInput: Locator;
  readonly emailInput: Locator;

  // Step 3: Social Proof
  readonly socialLinkInput: Locator;
  readonly followerRangeSelect: Locator;

  // Step 4: Interview
  readonly interviewQuestions: Locator;

  // Step 5: Success
  readonly successMessage: Locator;
  readonly positionDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stepIndicator = page.locator('[data-testid="step-indicator"]');
    this.nextButton = page.locator('button:has-text("Next")');
    this.backButton = page.locator('button:has-text("Back")');
    this.submitButton = page.locator('button:has-text("Submit")');

    // Step 1
    this.welcomeHeading = page.locator('h1:has-text("Join the Waitlist")');
    this.getStartedButton = page.locator('button:has-text("Get Started")');

    // Step 2
    this.nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    this.emailInput = page.locator('input[name="email"], input[type="email"]').first();

    // Step 3
    this.socialLinkInput = page.locator('input[name="socialLink"], input[placeholder*="social" i], input[placeholder*="Instagram" i]').first();
    this.followerRangeSelect = page.locator('select[name="followerRange"]').first();

    // Step 4
    this.interviewQuestions = page.locator('[data-testid="interview-question"], textarea');

    // Step 5
    this.successMessage = page.locator('text=Success, Thank you, Welcome').first();
    this.positionDisplay = page.locator('[data-testid="position"], text=/position|spot/i').first();
  }

  /**
   * Navigate to waitlist page
   */
  async goto() {
    await this.page.goto('/waitlist');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.stepIndicator).toBeVisible({ timeout: 10000 });
  }

  /**
   * Complete Step 1: Welcome
   */
  async completeStep1() {
    await expect(this.getStartedButton).toBeVisible();
    await this.getStartedButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete Step 2: Basic Info
   */
  async completeStep2(name: string, email: string) {
    await expect(this.nameInput).toBeVisible();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete Step 3: Social Proof
   */
  async completeStep3(socialLink: string, followerRange: string) {
    await expect(this.socialLinkInput).toBeVisible();
    await this.socialLinkInput.fill(socialLink);
    
    // Try to select follower range if select exists
    try {
      await this.followerRangeSelect.selectOption(followerRange);
    } catch {
      // Follower range might be radio buttons or other input
      const option = this.page.locator(`text=${followerRange}`).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      }
    }
    
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete Step 4: Interview
   */
  async completeStep4(responses: string[]) {
    const questions = await this.interviewQuestions.all();
    
    for (let i = 0; i < Math.min(responses.length, questions.length); i++) {
      await questions[i].fill(responses[i]);
    }
    
    await this.submitButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Complete the entire waitlist flow
   */
  async completeFullWaitlist(
    name: string,
    email: string,
    socialLink: string,
    followerRange: string,
    responses: string[]
  ) {
    await this.completeStep1();
    await this.completeStep2(name, email);
    await this.completeStep3(socialLink, followerRange);
    await this.completeStep4(responses);
  }

  /**
   * Verify success page is shown
   */
  async verifySuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    // Try to extract step from indicator text or active state
    const indicatorText = await this.stepIndicator.textContent().catch(() => null);
    const match = (indicatorText || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Verify validation error is shown
   */
  async expectValidationError(errorText?: string) {
    if (errorText) {
      await expect(this.page.locator(`text=${errorText}`)).toBeVisible();
    } else {
      // Generic error message
      await expect(this.page.locator('text=/error|required|invalid/i').first()).toBeVisible();
    }
  }

  /**
   * Go back to previous step
   */
  async goBack() {
    await this.backButton.click();
    await this.page.waitForTimeout(300);
  }
}
