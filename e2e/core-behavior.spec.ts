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
    await page.getByRole('button', { name: 'Run code' }).click();
    await page.waitForTimeout(500);

    const iframe = page.locator('iframe[sandbox="allow-scripts"]');
    await expect(iframe).toBeAttached({ timeout: 3000 });
  });

  test('editing code updates the preview viewer', async ({ page }) => {
    await page.getByRole('button', { name: 'Run code' }).click();
    await page.waitForTimeout(1000);

    // Focus the CodeMirror editor
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible({ timeout: 3000 });
    await editor.click();
    await page.waitForTimeout(200);

    // Clear and type new code
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
    await page.keyboard.type('document.title = "updated"', { delay: 20 });

    // Wait for srcdoc to reload the iframe with new code
    await page.waitForTimeout(2000);

    // Re-acquire frame reference (stale after srcdoc reload)
    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    const title = await frame!.evaluate(() => document.title);
    expect(title).toBe('updated');
  });

  test('import from external module (module.local) renders content into DOM', async ({ page }) => {
    await page.getByRole('button', { name: 'Run code' }).click();
    await page.waitForTimeout(1000);

    let moduleRequested = false;
    await page.route('**/module.local/**', (route) => {
      moduleRequested = true;
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'export const greeting = "Hello from external module!";',
      });
    });

    // Execute dynamic import from the mock module inside the iframe and render it
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
});
