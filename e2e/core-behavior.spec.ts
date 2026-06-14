import { test, expect } from '@playwright/test';

test.describe('Core app behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('launching the app for the first time shows disclaimer warning', async ({ page }) => {
    await expect(page.getByText('Warning!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run code' })).toBeVisible();
  });

  test('accepting disclaimer, then refreshing, does not show warning again', async ({ page }) => {
    await page.getByRole('button', { name: 'Run code' }).click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.getByText('Warning!')).not.toBeVisible();
  });

  test('after accepting disclaimer, preview viewer is rendered', async ({ page }) => {
    await disclaimerAcceptAndWait(page);
    const iframe = page.locator('iframe[sandbox="allow-scripts"]');
    await expect(iframe).toBeAttached({ timeout: 3000 });
  });

  test('editing code updates the preview viewer', async ({ page }) => {
    await disclaimerAcceptAndWait(page);
    await focusAndClearEditor(page);
    await page.keyboard.type('document.title = "updated"', { delay: 20 });
    await page.waitForTimeout(2000);

    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();
    const title = await frame!.evaluate(() => document.title);
    expect(title).toBe('updated');
  });

  test('import from external module (module.local) renders content into DOM', async ({ page }) => {
    await disclaimerAcceptAndWait(page);

    let moduleRequested = false;
    await page.route('**/module.local/**', (route) => {
      moduleRequested = true;
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'export const greeting = "Hello from external module!";',
      });
    });

    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    const result = await frame!.evaluate(async () => {
      try {
        const mod = await import('https://module.local/greeting');
        document.body.textContent = (mod as any).greeting;
        return { success: true, rendered: document.body.textContent };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    });

    expect(moduleRequested).toBe(true);
    expect(result.success).toBe(true);
    expect(result.rendered).toBe('Hello from external module!');
  });

  test.describe('View mode switching', () => {
    test.beforeEach(async ({ page }) => {
      await disclaimerAcceptAndWait(page);
    });

    test('default mode is view-edit (both editor and iframe visible)', async ({ page }) => {
      await expect(page.locator('.cm-editor').first()).toBeVisible({ timeout: 3000 });
      await expect(page.locator('iframe')).toBeAttached({ timeout: 3000 });
    });

    test('switch to view only mode hides the editor', async ({ page }) => {
      await page.selectOption('select', 'view');
      await page.waitForTimeout(500);
      await expect(page.locator('.cm-editor').first()).not.toBeVisible();
      await expect(page.locator('iframe')).toBeAttached();
    });

    test('switch to edit only mode hides the viewer iframe', async ({ page }) => {
      await page.selectOption('select', 'edit');
      await page.waitForTimeout(500);
      await expect(page.locator('.cm-editor').first()).toBeVisible({ timeout: 3000 });
      // In edit mode, the iframe should not exist in the DOM
      expect(page.locator('iframe')).toHaveCount(0);
    });

    test('switch to view, refresh, mode persists', async ({ page }) => {
      await page.selectOption('select', 'view');
      await page.waitForTimeout(300);
      expect(page.url()).toContain('mode=view');
      await page.reload();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('mode=view');
      await expect(page.locator('.cm-editor').first()).not.toBeVisible();
    });
  });

  test.describe('Code execution output', () => {
    test.beforeEach(async ({ page }) => {
      await disclaimerAcceptAndWait(page);
    });

    test('console.log output appears in bottom bar logger', async ({ page }) => {
      await focusAndClearEditor(page);
      await page.keyboard.type('console.log("hello world")', { delay: 20 });
      await page.waitForTimeout(2000);

      // Open the logger panel
      await page.locator('[data-grid-area="button"]').click();
      await page.waitForTimeout(500);

      // The logger renders JSON.stringify results: "hello world" → '"hello world"'
      await expect(page.getByText('hello world').first()).toBeVisible({ timeout: 3000 });
    });

    test('error in code shows in logger', async ({ page }) => {
      await focusAndClearEditor(page);
      await page.keyboard.type('throw new Error("test error 123")', { delay: 20 });
      await page.waitForTimeout(2000);

      // Open the logger
      await page.locator('[data-grid-area="button"]').click();
      await page.waitForTimeout(500);

      // Error objects are rendered as JSON.stringify({name,message})
      await expect(page.locator('text=test error 123').first()).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Share dialog', () => {
    test.beforeEach(async ({ page }) => {
      await disclaimerAcceptAndWait(page);
    });

    test('opens with a URL', async ({ page }) => {
      await page.locator('button', { hasText: 'Share' }).first().click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: 'Share' })).toBeVisible({ timeout: 3000 });
      await expect(page.locator('textarea[aria-label="url"]')).toHaveValue(/http/);
    });

    test('renders QR code canvas', async ({ page }) => {
      await page.locator('button', { hasText: 'Share' }).first().click();
      await page.waitForTimeout(1000);

      // QR code is always rendered (no longer gated behind Web Share)
      const canvas = page.locator('canvas');
      await expect(canvas).toBeAttached({ timeout: 5000 });
    });

    test('shows error when content is too large for QR code', async ({ page }) => {
      // Create a long URL hash to exceed QR code capacity (~2953 bytes for level L)
      await page.evaluate(() => {
        history.replaceState(null, '', '#v=' + 'a'.repeat(4000));
      });
      await page.waitForTimeout(300);

      await page.locator('button', { hasText: 'Share' }).first().click();
      await page.waitForTimeout(1500);

      // QR code generation should fail due to data exceeding capacity
      await expect(page.getByText(/Failed to generate QR|too long|too large|input string/i)).toBeVisible({ timeout: 5000 });
    });
  });
});

async function disclaimerAcceptAndWait(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(1000);
}

async function focusAndClearEditor(page: import('@playwright/test').Page) {
  const editor = page.locator('.cm-content').first();
  await expect(editor).toBeVisible({ timeout: 3000 });
  await editor.click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(100);
}
