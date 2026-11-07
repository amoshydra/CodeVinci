import { test, expect, type Page } from '@playwright/test';

test.use({ launchOptions: { args: ['--enable-features=WebMCP'] } });

interface WebMcpToolLike {
  name: string;
}

interface WebMcpModelContextLike {
  getTools: () => Promise<WebMcpToolLike[]>;
  executeTool: (tool: WebMcpToolLike, input: unknown) => Promise<unknown>;
  registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>;
}

interface ToolResult {
  ok?: boolean;
  error?: { code?: string; message?: string; retryable?: boolean; nextAction?: string };
  [key: string]: unknown;
}

const getToolNames = (page: Page) =>
  page.evaluate(async () => {
    const modelContext =
      (document as Document & { modelContext?: WebMcpModelContextLike }).modelContext ??
      (navigator as Navigator & { modelContext?: WebMcpModelContextLike }).modelContext;
    if (!modelContext) return [];
    return (await modelContext.getTools()).map((tool) => tool.name);
  });

const callTool = (
  page: Page,
  name: string,
  args: Record<string, unknown> = {},
) =>
  page.evaluate(async ({ name, args }) => {
    const modelContext =
      (document as Document & { modelContext?: WebMcpModelContextLike }).modelContext ??
      (navigator as Navigator & { modelContext?: WebMcpModelContextLike }).modelContext;
    if (!modelContext) throw new Error('WebMCP is not available.');

    const tools = await modelContext.getTools();
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Missing WebMCP tool: ${name}`);

    let output: unknown;
    try {
      output = await modelContext.executeTool(tool, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Chrome 151 took a JSON string; Chrome 159 takes an object.
      if (!/not of type|Failed to parse/i.test(message)) throw error;
      output = await modelContext.executeTool(tool, JSON.stringify(args));
    }

    try {
      return JSON.parse(output as string) as ToolResult;
    } catch {
      return output as ToolResult;
    }
  }, { name, args });

test('agent explores, edits, runs, and verifies through the WebMCP tool surface', async ({ page }) => {
  await page.goto('/');

  const hasWebMcp = await page.evaluate(() => {
    const modelContext =
      (document as Document & { modelContext?: WebMcpModelContextLike }).modelContext ??
      (navigator as Navigator & { modelContext?: WebMcpModelContextLike }).modelContext;
    return typeof modelContext?.registerTool === 'function'
      && typeof modelContext.getTools === 'function'
      && typeof modelContext.executeTool === 'function';
  });
  test.skip(!hasWebMcp, 'WebMCP tool execution is not available in this browser build');

  await expect.poll(async () => (await getToolNames(page)).length).toBe(9);

  const freshStatus = await callTool(page, 'get_editor_status');
  expect(freshStatus).toMatchObject({
    ok: true,
    ready: false,
    consent: 'required',
    mode: expect.any(String),
    preview: { available: false, state: 'idle' },
  });
  expect(String(freshStatus.nextAction)).toContain("'Run code'");

  const locked = await callTool(page, 'set_code', { code: 'console.log("nope")' });
  expect(locked.ok).toBe(false);
  expect(locked.error?.code).toBe('consent_required');
  expect(locked.error?.retryable).toBe(true);

  await page.getByRole('button', { name: 'Run code' }).click();

  await expect.poll(async () => {
    const status = await callTool(page, 'get_editor_status');
    const preview = status.preview as { available?: boolean } | undefined;
    return Boolean(status.ready && preview?.available);
  }).toBe(true);

  const versionBefore = Number((await callTool(page, 'get_code')).version);

  const code = [
    'console.log("E2E-RUN");',
    'document.body.innerHTML = \'<h1 id="app">E2E PREVIEW</h1><button id="go">Go</button><input id="name"><button id="hidden" style="display:none">Hidden</button>\';',
    'document.getElementById("go").onclick = () => console.log("CLICKED");',
    'document.getElementById("name").oninput = (event) => console.log("INPUT", event.target.value);',
    'document.addEventListener("keydown", (event) => { if (event.code === "Space") console.log("SPACE-CODE-OK"); });',
  ].join('\n');
  const written = await callTool(page, 'set_code', { code });
  expect(written).toMatchObject({ ok: true, replaced: true, length: code.length });
  expect(Number(written.version)).toBeGreaterThan(versionBefore);

  const consoleResult = await callTool(page, 'get_console');
  expect(consoleResult.ok).toBe(true);
  expect(['settled', 'timeout']).toContain(String(consoleResult.status));
  expect(String(consoleResult.output)).toContain('E2E-RUN');
  expect(consoleResult.truncated).toBe(false);
  expect(Number(consoleResult.totalLogs)).toBeGreaterThan(0);
  expect(Number(consoleResult.shownLogs)).toBe(Number(consoleResult.totalLogs));

  const preview = await callTool(page, 'get_preview');
  expect(preview).toMatchObject({
    ok: true,
    title: 'Document',
    isEmpty: false,
    hasCanvas: false,
  });
  expect(Number(preview.elementCount)).toBeGreaterThan(0);
  expect(String(preview.text)).toContain('E2E PREVIEW');
  expect(preview.interactiveTruncated).toBe(false);
  expect(preview.targetVisible).toBe(true);
  expect(Number(preview.hiddenInteractiveCount)).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(preview.interactive)).toContain('#go');
  expect(JSON.stringify(preview.interactive)).toContain('#name');
  expect(JSON.stringify(preview.interactive)).not.toContain('#hidden');

  const styled = await callTool(page, 'get_preview', {
    selector: '#app',
    includeStyles: true,
  });
  expect(styled.ok).toBe(true);
  const styles = styled.styles as Record<string, string> | undefined;
  expect(styles).toBeTruthy();
  expect(String(styles?.display)).not.toBe('');
  expect(String(styles?.visibility)).toBe('visible');

  const hidden = await callTool(page, 'interact', {
    action: 'click',
    selector: '#hidden',
  });
  expect(hidden.ok).toBe(false);
  expect(String(hidden.error?.message)).toContain('not visible');

  const pressed = await callTool(page, 'interact', {
    action: 'press',
    selector: '#go',
    key: 'Space',
  });
  expect(pressed).toMatchObject({ ok: true, key: ' ', code: 'Space' });
  await expect.poll(async () => String((await callTool(page, 'get_console')).output))
    .toContain('SPACE-CODE-OK');

  const click = await callTool(page, 'interact', { action: 'click', selector: '#go' });
  expect(click).toMatchObject({ ok: true, action: 'click', tag: 'button', selector: '#go' });
  await expect.poll(async () => String((await callTool(page, 'get_console')).output))
    .toContain('CLICKED');

  const fill = await callTool(page, 'interact', {
    action: 'fill',
    selector: '#name',
    value: 'Ada',
  });
  expect(fill).toMatchObject({ ok: true, action: 'fill', value: 'Ada' });
  await expect.poll(async () => String((await callTool(page, 'get_console')).output))
    .toContain('INPUT Ada');

  const badEdit = await callTool(page, 'apply_edits', {
    edits: [{ search: 'text that does not exist', replace: 'x' }],
  });
  expect(badEdit.ok).toBe(false);
  expect(badEdit.error?.code).toBe('edit_failed');
  expect(String(badEdit.error?.message)).toContain('search text not found');

  const stale = await callTool(page, 'set_code', { code: 'console.log("stale")', expectedVersion: versionBefore });
  expect(stale.ok).toBe(false);
  expect(stale.error?.code).toBe('stale_code');
  expect(Number(stale.version)).toBeGreaterThan(versionBefore);

  const goodEdit = await callTool(page, 'apply_edits', {
    edits: [{ search: 'E2E PREVIEW', replace: 'E2E EDITED' }],
  });
  expect(goodEdit).toMatchObject({ ok: true, applied: 1 });

  const editedPreview = await callTool(page, 'get_preview');
  expect(String(editedPreview.text)).toContain('E2E EDITED');

  const undone = await callTool(page, 'undo');
  expect(undone).toMatchObject({ ok: true });
  const restored = await callTool(page, 'get_code');
  expect(String(restored.code)).toContain('E2E PREVIEW');

  const rerun = await callTool(page, 'run_code');
  expect(rerun.ok).toBe(true);
  await expect.poll(async () => String((await callTool(page, 'get_console')).output))
    .toContain('E2E-RUN');

  const buildFailure = await callTool(page, 'set_code', { code: 'const = ;' });
  expect(buildFailure.ok).toBe(true);
  await expect.poll(async () => String((await callTool(page, 'get_console', { waitMs: 4000 })).status))
    .toBe('failed');

  const failedPreview = await callTool(page, 'get_preview');
  expect(failedPreview.ok).toBe(false);
  expect(String(failedPreview.error?.message)).toContain('Build failed');

  const recovered = await callTool(page, 'undo');
  expect(recovered.ok).toBe(true);
});
