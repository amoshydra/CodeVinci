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

  test('import from external URL via esm.sh is allowed by CSP', async ({ page }) => {
    await page.getByRole('button', { name: 'Run code' }).click();
    await page.waitForTimeout(1000);

    let esmRequested = false;
    await page.route('**/esm.sh/**', (route) => {
      esmRequested = true;
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'export default { name: "mock-module" }',
      });
    });

    // Execute dynamic import from esm.sh inside the iframe
    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    expect(frame).toBeDefined();

    const result = await frame!.evaluate(async () => {
      try {
        const mod = await import('https://esm.sh/react');
        return { success: true, name: (mod as any).default?.name };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    });

    expect(esmRequested).toBe(true);
    expect(result.success).toBe(true);
  });
});
