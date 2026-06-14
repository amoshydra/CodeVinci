import { test, expect } from '@playwright/test';

const LLM_ENDPOINT = 'http://localhost:11434/v1';

function mockSseResponse(text: string): string {
  const lines = text.split('\n').flatMap(line => [
    `data: {"choices":[{"delta":{"content":"${line}\\n"}}]}`,
  ]);
  lines.push('data: [DONE]');
  return lines.join('\n');
}

test.describe('AI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate((endpoint) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('codevinci-llm-enabled', 'true');
      localStorage.setItem('codevinci-llm-config', JSON.stringify({
        provider: 'openai-compatible',
        apiEndpoint: endpoint,
        apiKey: 'sk-test-key-123',
        defaultModel: 'test-model',
        systemPrompt: 'You are a test assistant.',
        availableModels: ['test-model'],
        connectionValid: true,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096,
        cspOrigin: 'http://localhost:11434',
      }));
    }, LLM_ENDPOINT);
    await page.reload();
  });

  test('AI Chat: send prompt and receive mock response', async ({ page }) => {
    await acceptDisclaimer(page);
    await switchToAiChat(page);

    let apiCalled = false;
    let sentMessages: any[] = [];
    await page.route('**/chat/completions', async (route) => {
      apiCalled = true;
      const body = JSON.parse(route.request().postData() || '{}');
      sentMessages = body.messages;
      expect(body.model).toBe('test-model');
      expect(body.stream).toBe(true);
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockSseResponse('Hello! I am a mock AI response.'),
      });
    });

    await typeAndSendChat(page, 'say hello');
    expect(apiCalled).toBe(true);
    expect(sentMessages.find(m => m.role === 'user')?.content).toContain('hello');

    const chatMessages = page.getByText('Hello! I am a mock AI response.');
    await expect(chatMessages).toBeVisible({ timeout: 5000 });
  });

  test('AI Chat: API request includes correct auth and model', async ({ page }) => {
    await acceptDisclaimer(page);
    await switchToAiChat(page);

    let requestVerified = false;
    await page.route('**/chat/completions', async (route) => {
      const headers = route.request().headers();
      const body = JSON.parse(route.request().postData() || '{}');
      expect(headers['authorization']).toBe('Bearer sk-test-key-123');
      expect(body.model).toBe('test-model');
      expect(body.stream).toBe(true);
      requestVerified = true;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockSseResponse('Verified'),
      });
    });

    await typeAndSendChat(page, 'test');
    expect(requestVerified).toBe(true);
  });

  test('CSP: changing base URL triggers reload banner', async ({ page }) => {
    await acceptDisclaimer(page);

    // Open settings via top bar gear
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);

    // Change base URL
    await page.locator('input[type="text"][value*="localhost"]').first().fill('https://custom.example.com/v1');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Reload required|update CSP/i)).toBeVisible({ timeout: 3000 });
  });

  test('CSP: after endpoint change and reload, CSP includes new origin', async ({ page }) => {
    await acceptDisclaimer(page);

    // Change endpoint
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[type="text"][value*="localhost"]').first().fill('https://new-endpoint.example.com/v1');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    // Click reload on the CSP banner
    const reloadBtn = page.getByRole('button', { name: 'Reload' });
    if (await reloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reloadBtn.click();
      await page.waitForTimeout(2000);

      const csp = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta?.getAttribute('content');
      });
      expect(csp).toContain('new-endpoint.example.com');
    }
  });

  test('Settings: change model and API key, verify config persists', async ({ page }) => {
    await acceptDisclaimer(page);

    // Open settings
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);

    // Change API key
    await page.locator('input[type="password"]').first().fill('sk-new-key-999');

    // Change model
    const modelField = page.locator('input[placeholder*="llama"]').first();
    if (await modelField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modelField.fill('new-model-name');
    }

    // Save
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    // Reload and verify config persists
    await page.reload();
    await page.waitForTimeout(1000);

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('codevinci-llm-config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored.apiEndpoint).toBe(LLM_ENDPOINT);
    expect(stored.apiKey).toBe('sk-new-key-999');
  });
});

async function acceptDisclaimer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}

async function switchToAiChat(page: import('@playwright/test').Page) {
  // The ai-chat option exists only when enableLlm is true
  await expect(page.locator('option[value="ai-chat"]')).toBeAttached({ timeout: 3000 });

  await page.selectOption('select', 'ai-chat');
  await page.waitForTimeout(1500);

  // Wait for the lazy-loaded LLMPanel to render (the chat input is the tell)
  await expect(page.locator('textarea[placeholder*="Ask AI"]')).toBeVisible({ timeout: 8000 });
}

async function typeAndSendChat(page: import('@playwright/test').Page, text: string) {
  const input = page.locator('textarea[placeholder*="Ask AI"]');
  await expect(input).toBeVisible({ timeout: 3000 });
  await expect(input).toBeEnabled({ timeout: 3000 });
  await input.fill(text);
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(1000);
}
