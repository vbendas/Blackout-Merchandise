import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Chat/Workspace Page
 */
export class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly micButton: Locator;
  readonly messagesContainer: Locator;
  readonly typingIndicator: Locator;

  // Agent selector
  readonly agentSelector: Locator;

  // Navigation
  readonly historyButton: Locator;
  readonly notificationsButton: Locator;
  readonly catalogButton: Locator;
  readonly chatButton: Locator;

  // Sidebar
  readonly sidebar: Locator;
  readonly sessionHistory: Locator;

  // Quick prompts
  readonly quickPrompts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.locator('#message-input, input[placeholder*="message" i]').first();
    this.sendButton = page.locator('button[aria-label="Send message"], button:has(.lucide-send)').first();
    this.micButton = page.locator('button[aria-label*="recording" i], button:has(.lucide-mic)').first();
    this.messagesContainer = page.locator('[data-testid="messages"], .messages, [role="log"]').first();
    this.typingIndicator = page.locator('[data-testid="typing-indicator"], text=/typing/i').first();

    // Agent selector
    this.agentSelector = page.locator('[data-testid="agent-selector"]').first();

    // Navigation
    this.historyButton = page.locator('button[aria-label*="history" i], button:has(.lucide-history)').first();
    this.notificationsButton = page.locator('button[aria-label*="notification" i], button:has(.lucide-bell)').first();
    this.catalogButton = page.locator('button:has-text("Catalog"), a:has-text("Catalog")').first();
    this.chatButton = page.locator('button:has-text("Chat"), a:has-text("Chat")').first();

    // Sidebar
    this.sidebar = page.locator('[data-testid="sidebar"]').first();
    this.sessionHistory = page.locator('[data-testid="session-history"]').first();

    // Quick prompts
    this.quickPrompts = page.locator('[data-testid="quick-prompt"]').first();
  }

  /**
   * Navigate to workspace page
   */
  async goto() {
    await this.page.goto('/app/workspace');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.messageInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Send a message
   */
  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendButton.click();
    // Wait for message to appear
    await this.page.waitForTimeout(500);
  }

  /**
   * Send message using keyboard shortcut
   */
  async sendMessageWithKeyboard(text: string) {
    await this.messageInput.fill(text);
    await this.messageInput.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all user messages
   */
  async getUserMessages(): Promise<Locator[]> {
    return this.page.locator('[data-testid="user-message"], .message--user').all();
  }

  /**
   * Get all assistant messages
   */
  async getAssistantMessages(): Promise<Locator[]> {
    return this.page.locator('[data-testid="assistant-message"], .message--assistant').all();
  }

  /**
   * Verify a message appears in the chat
   */
  async expectMessage(text: string, role: 'user' | 'assistant' = 'user') {
    const selector = role === 'user' 
      ? '[data-testid="user-message"], .message--user'
      : '[data-testid="assistant-message"], .message--assistant';
    
    const messages = this.page.locator(selector).filter({ hasText: text });
    await expect(messages.first()).toBeVisible();
  }

  /**
   * Wait for typing indicator to appear and disappear
   */
  async waitForResponse() {
    // Wait for typing indicator or just wait for response
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click on a quick prompt
   */
  async clickQuickPrompt(promptText: string) {
    const prompt = this.page.locator(`text=${promptText}`).first();
    await prompt.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch agent
   */
  async switchAgent(agentName: string) {
    if (await this.agentSelector.isVisible().catch(() => false)) {
      await this.agentSelector.click();
    }
    
    const agentOption = this.page.locator(`text=${agentName}`).first();
    await agentOption.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Open session history
   */
  async openHistory() {
    await this.historyButton.click();
    await expect(this.sessionHistory).toBeVisible();
  }

  /**
   * Select a session from history
   */
  async selectSession(sessionTitle: string) {
    const session = this.page.locator(`text=${sessionTitle}`).first();
    await session.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to catalog view
   */
  async switchToCatalog() {
    await this.catalogButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to chat view
   */
  async switchToChat() {
    await this.chatButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current agent name
   */
  async getCurrentAgent(): Promise<string> {
    const agentText = await this.page.locator('[data-testid="current-agent"]').textContent()
      .catch(() => null);
    return (agentText || '').trim();
  }

  /**
   * Clear input field
   */
  async clearInput() {
    await this.messageInput.clear();
  }

  /**
   * Check if message input is focused
   */
  async isInputFocused(): Promise<boolean> {
    return this.messageInput.evaluate(el => el === document.activeElement);
  }

  /**
   * Use keyboard shortcut to focus input
   */
  async focusInputWithKeyboard() {
    await this.page.keyboard.press('Control+k');
    await this.page.waitForTimeout(200);
  }
}
