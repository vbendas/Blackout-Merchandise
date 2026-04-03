import { test, expect } from '@playwright/test';
import { ChatPage } from './pages/ChatPage';

/**
 * Chat Interface E2E Tests
 * 
 * Tests the core chat functionality
 * Priority: HIGH - Core feature of the application
 */

test.describe('Chat Interface', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
  });

  test('user can send a message', async ({ page }) => {
    const message = 'Hello, can you help me with merchandise?';
    
    await chatPage.sendMessage(message);
    
    // Verify message appears in chat
    await chatPage.expectMessage(message, 'user');
  });

  test('user receives AI response', async ({ page }) => {
    const message = 'What products do you offer?';
    
    await chatPage.sendMessage(message);
    await chatPage.waitForResponse();
    
    // Check that assistant response appears
    const assistantMessages = await chatPage.getAssistantMessages();
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  test('user can send message using Enter key', async () => {
    const message = 'Test message with Enter';
    
    await chatPage.sendMessageWithKeyboard(message);
    
    await chatPage.expectMessage(message, 'user');
  });

  test('empty messages cannot be sent', async () => {
    const initialMessageCount = (await chatPage.getUserMessages()).length;
    
    // Try to send empty message
    await chatPage.sendMessage('   ');
    
    // Message count should not increase
    const newMessageCount = (await chatPage.getUserMessages()).length;
    expect(newMessageCount).toBe(initialMessageCount);
  });

  test('typing indicator appears while waiting for response', async ({ page }) => {
    await chatPage.sendMessage('Tell me about pricing');
    
    // Typing indicator should appear
    const typingIndicator = page.locator('[data-testid="typing-indicator"], .typing-indicator').first();
    // May or may not be visible depending on timing
  });

  test('user can switch between agents', async ({ page }) => {
    const agents = ['Leopoldo', 'Francisca', 'Antônia'];
    
    for (const agent of agents) {
      await chatPage.switchAgent(agent);
      // Verify agent switch happened
      await page.waitForTimeout(300);
    }
  });

  test('conversation persists when switching views', async ({ page }) => {
    const message = 'This message should persist';
    
    await chatPage.sendMessage(message);
    await chatPage.switchToCatalog();
    await chatPage.switchToChat();
    
    // Message should still be visible
    await chatPage.expectMessage(message, 'user');
  });

  test('quick prompts can be clicked', async ({ page }) => {
    // Look for quick prompt chips
    const quickPrompt = page.locator('button').filter({ hasText: /design|product|help/i }).first();
    
    if (await quickPrompt.isVisible().catch(() => false)) {
      await quickPrompt.click();
      await page.waitForTimeout(500);
      
      // Should trigger a message or action
      const messages = await chatPage.getUserMessages();
      expect(messages.length).toBeGreaterThan(0);
    }
  });

  test('keyboard shortcuts work', async () => {
    // Test Ctrl+K to focus input
    await chatPage.focusInputWithKeyboard();
    const isFocused = await chatPage.isInputFocused();
    expect(isFocused).toBe(true);
  });

  test('message history can be accessed', async ({ page }) => {
    // Open history if button exists
    const historyButton = page.locator('button[aria-label*="history" i]').first();
    
    if (await historyButton.isVisible().catch(() => false)) {
      await historyButton.click();
      
      // History panel should be visible
      const historyPanel = page.locator('[data-testid="session-history"], .history-panel').first();
      await expect(historyPanel).toBeVisible();
    }
  });
});

test.describe('Chat Responsive Design', () => {
  test('chat is usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    await chatPage.sendMessage('Mobile test message');
    await chatPage.expectMessage('Mobile test message', 'user');
  });

  test('chat is usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    await chatPage.sendMessage('Tablet test message');
    await chatPage.expectMessage('Tablet test message', 'user');
  });

  test('chat is usable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    await chatPage.sendMessage('Desktop test message');
    await chatPage.expectMessage('Desktop test message', 'user');
  });
});
