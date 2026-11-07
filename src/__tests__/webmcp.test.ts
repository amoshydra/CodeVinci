import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerWebMcpTools,
  type WebMcpBridge,
} from '../services/webmcp';
import {
  beginRun,
  markPreviewFailed,
  markPreviewStarted,
  publishConsole,
  resetWebMcpRuntime,
  setInteractionHandler,
  setPreviewHandler,
  setRerunHandler,
} from '../services/webmcpRuntime';

interface FakeTool {
  name: string;
  execute: (
    input: Record<string, unknown>,
    options: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
}

interface ToolResult {
  ok: boolean;
  error?: { code: string; message: string; retryable?: boolean; nextAction?: string };
  [key: string]: unknown;
}

const createFakeModelContext = () => {
  const tools = new Map<string, FakeTool>();
  const signals: AbortSignal[] = [];
  return {
    tools,
    signals,
    registerTool: vi.fn(async (tool: FakeTool, options?: { signal?: AbortSignal }) => {
      tools.set(tool.name, tool);
      if (options?.signal) signals.push(options.signal);
    }),
  };
};

type FakeModelContext = ReturnType<typeof createFakeModelContext>;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface BridgeOptions {
  writeEnabled?: boolean;
  mode?: string;
  version?: number;
  undoResult?: { code: string; version: number } | null;
}

const createBridge = (code: string, options: BridgeOptions = {}) => {
  let current = code;
  let version = options.version ?? 1;
  const setCode = vi.fn((next: string) => {
    current = next;
    version += 1;
    return version;
  });
  const undo = vi.fn(() => options.undoResult ?? null);
  const bridge: WebMcpBridge = {
    getCode: () => current,
    setCode,
    isWriteEnabled: () => options.writeEnabled ?? true,
    getMode: () => options.mode ?? 'view-edit',
    getVersion: () => version,
    undo,
  };
  return { bridge, setCode, undo, getCode: () => current, getVersion: () => version };
};

const installModelContext = () => {
  const modelContext = createFakeModelContext();
  Object.defineProperty(document, 'modelContext', { value: modelContext, configurable: true });
  return modelContext;
};

const executeTool = async (
  modelContext: FakeModelContext,
  name: string,
  input: Record<string, unknown> = {},
): Promise<ToolResult> => {
  const tool = modelContext.tools.get(name);
  if (!tool) throw new Error(`missing tool: ${name}`);
  const result = await tool.execute(input, {});
  return result as ToolResult;
};

const emptySnapshot = {
  title: '',
  text: '',
  truncated: false,
  isEmpty: true,
  elementCount: 0,
  hasCanvas: false,
  interactive: [],
};

const attachPreview = () => setPreviewHandler(async () => emptySnapshot);

describe('registerWebMcpTools', () => {
  const originalModelContext = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext');

  afterEach(() => {
    vi.useRealTimers();
    resetWebMcpRuntime();
    if (originalModelContext) {
      Object.defineProperty(Document.prototype, 'modelContext', originalModelContext);
    } else {
      delete (document as unknown as { modelContext?: unknown }).modelContext;
    }
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    delete (document as unknown as { modelContext?: unknown }).modelContext;
    resetWebMcpRuntime();
  });

  it('does nothing when the browser has no WebMCP support', async () => {
    const cleanup = registerWebMcpTools(createBridge('').bridge);
    await expect(async () => cleanup()).not.toThrow();
  });

  it('registers the editor tool surface as one batch', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('document.body.textContent = "hi";');

    const cleanup = registerWebMcpTools(bridge);
    await flush();

    expect([...modelContext.tools.keys()].sort()).toEqual([
      'apply_edits',
      'get_code',
      'get_console',
      'get_editor_status',
      'get_preview',
      'interact',
      'run_code',
      'set_code',
      'undo',
    ]);

    cleanup();
    expect(modelContext.signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('does not register when unmounted in the same tick (StrictMode)', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('');

    const cleanup = registerWebMcpTools(bridge);
    cleanup();
    await flush();

    expect(modelContext.registerTool).not.toHaveBeenCalled();
  });

  it('returns the current code and version', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('const a = 1;', { version: 4 });

    registerWebMcpTools(bridge);
    await flush();

    await expect(executeTool(modelContext, 'get_code')).resolves.toEqual({
      ok: true,
      code: 'const a = 1;',
      version: 4,
    });
  });

  it('reports orientation, consent, mode, and preview state', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('const a = 1;', {
      writeEnabled: false,
      mode: 'edit',
      version: 3,
    });

    registerWebMcpTools(bridge);
    await flush();

    const status = await executeTool(modelContext, 'get_editor_status');
    expect(status).toMatchObject({
      ok: true,
      ready: false,
      consent: 'required',
      mode: 'edit',
      codeLength: 12,
      codeVersion: 3,
      preview: { available: false, state: 'idle', lastError: null },
    });
    expect(String(status.about)).toContain('CodeVinci');
    expect(String(status.guide)).toContain('get_code');
    expect(String(status.nextAction)).toContain("'Run code'");
  });

  it('serves the latest published console text and truncation metadata', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    publishConsole({
      text: '[log] driven from termux\n[error] boom',
      totalLogs: 60,
      shownLogs: 50,
    });

    await expect(executeTool(modelContext, 'get_console')).resolves.toEqual({
      ok: true,
      status: 'idle',
      output: '[log] driven from termux\n[error] boom',
      truncated: true,
      totalLogs: 60,
      waitedMs: 0,
    });
  });

  it('applies exact-text edits and returns the new version', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode, getCode } = createBridge('const a = 1;\nconst b = 2;');

    registerWebMcpTools(bridge);
    await flush();

    const result = await executeTool(modelContext, 'apply_edits', {
      edits: [{ search: 'const a = 1;', replace: 'const a = 42;' }],
    });

    expect(setCode).toHaveBeenCalledWith('const a = 42;\nconst b = 2;');
    expect(getCode()).toBe('const a = 42;\nconst b = 2;');
    expect(result).toMatchObject({ ok: true, applied: 1, version: 2 });
  });

  it('returns a descriptive edit_failed result with line numbers', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode } = createBridge('x();\nx();');

    registerWebMcpTools(bridge);
    await flush();

    const result = await executeTool(modelContext, 'apply_edits', {
      edits: [{ search: 'x();', replace: 'y();' }],
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('edit_failed');
    expect(result.error?.message).toMatch(/matches 2 times/);
    expect(result.error?.message).toMatch(/line 1/);
    expect(setCode).not.toHaveBeenCalled();
  });

  it('fails writes closed while the disclaimer is unaccepted, but reads still work', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode, undo } = createBridge('const a = 1;', { writeEnabled: false });

    registerWebMcpTools(bridge);
    await flush();

    for (const [name, input] of [
      ['set_code', { code: 'x' }],
      ['apply_edits', { edits: [{ search: 'const a = 1;', replace: 'const a = 2;' }] }],
      ['run_code', {}],
      ['undo', {}],
      ['interact', { action: 'click', selector: '#go' }],
    ] as const) {
      const result = await executeTool(modelContext, name, input);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('consent_required');
      expect(result.error?.retryable).toBe(true);
    }
    expect(setCode).not.toHaveBeenCalled();
    expect(undo).not.toHaveBeenCalled();

    await expect(executeTool(modelContext, 'get_code')).resolves.toMatchObject({
      ok: true,
      code: 'const a = 1;',
    });
  });

  it('validates edit, code, and version input types', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('');

    registerWebMcpTools(bridge);
    await flush();

    const badCode = await executeTool(modelContext, 'set_code', { code: 42 });
    expect(badCode.ok).toBe(false);
    expect(badCode.error?.code).toBe('invalid_input');

    const badEdits = await executeTool(modelContext, 'apply_edits', { edits: 'nope' });
    expect(badEdits.ok).toBe(false);
    expect(badEdits.error?.code).toBe('invalid_input');

    const badVersion = await executeTool(modelContext, 'set_code', {
      code: 'x',
      expectedVersion: 'one',
    });
    expect(badVersion.ok).toBe(false);
    expect(badVersion.error?.code).toBe('invalid_input');
  });

  it('rejects writes against a stale code version', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode } = createBridge('const a = 1;', { version: 7 });

    registerWebMcpTools(bridge);
    await flush();

    const result = await executeTool(modelContext, 'set_code', {
      code: 'const a = 2;',
      expectedVersion: 6,
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('stale_code');
    expect(result.code).toBe('const a = 1;');
    expect(result.version).toBe(7);
    expect(setCode).not.toHaveBeenCalled();
  });

  it('waits for the preview to start and settle when waitMs is set', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    vi.useFakeTimers();
    beginRun();

    const pending = executeTool(modelContext, 'get_console', { waitMs: 1000 });
    await vi.advanceTimersByTimeAsync(100);
    markPreviewStarted();
    publishConsole({ text: '[log] hello', totalLogs: 1, shownLogs: 1 });
    await vi.advanceTimersByTimeAsync(200);

    await expect(pending).resolves.toMatchObject({
      ok: true,
      status: 'settled',
      output: '[log] hello',
      truncated: false,
      totalLogs: 1,
    });
  });

  it('auto-waits when a run is building and waitMs is omitted', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    vi.useFakeTimers();
    beginRun();

    const pending = executeTool(modelContext, 'get_console');
    await vi.advanceTimersByTimeAsync(100);
    markPreviewStarted();
    publishConsole({ text: '[log] auto', totalLogs: 1, shownLogs: 1 });
    await vi.advanceTimersByTimeAsync(300);

    await expect(pending).resolves.toMatchObject({
      ok: true,
      status: 'settled',
      output: '[log] auto',
      truncated: false,
      totalLogs: 1,
    });
  });

  it('reports a timeout when the preview never starts', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    vi.useFakeTimers();
    beginRun();

    const pending = executeTool(modelContext, 'get_console', { waitMs: 100 });
    await vi.advanceTimersByTimeAsync(150);

    await expect(pending).resolves.toMatchObject({
      ok: true,
      status: 'timeout',
      waitedMs: expect.any(Number),
    });
  });

  it('reports a failed build without waiting', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    beginRun();
    markPreviewFailed('Unexpected token <');

    const status = await executeTool(modelContext, 'get_editor_status');
    expect(status).toMatchObject({
      ok: true,
      preview: { state: 'failed', lastError: 'Unexpected token <' },
    });

    const consoleResult = await executeTool(modelContext, 'get_console', { waitMs: 5000 });
    expect(consoleResult).toMatchObject({
      ok: true,
      status: 'failed',
      waitedMs: 0,
      lastError: 'Unexpected token <',
    });

    const preview = await executeTool(modelContext, 'get_preview');
    expect(preview.ok).toBe(false);
    expect(preview.error?.code).toBe('preview_unavailable');
    expect(preview.error?.message).toContain('Build failed');
  });

  it('returns a preview snapshot with metadata and interactive elements', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();

    setPreviewHandler(async (options) => ({
      title: 'Preview',
      text: `sel:${options.selector ?? 'body'}`,
      truncated: false,
      isEmpty: false,
      elementCount: 3,
      hasCanvas: true,
      interactive: [{ tag: 'button', text: 'Go', selector: '#go' }],
    }));

    await expect(executeTool(modelContext, 'get_preview', { selector: '#app' })).resolves.toMatchObject({
      ok: true,
      status: 'idle',
      title: 'Preview',
      text: 'sel:#app',
      truncated: false,
      isEmpty: false,
      elementCount: 3,
      hasCanvas: true,
      interactive: [{ tag: 'button', text: 'Go', selector: '#go' }],
    });
  });

  it('fails get_preview with a mode-aware message when the preview is missing', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('', { mode: 'edit' }).bridge);
    await flush();

    const result = await executeTool(modelContext, 'get_preview');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('preview_unavailable');
    expect(result.error?.message).toContain('Edit mode');
  });

  it('re-runs the preview through the registered handler', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    const rerun = vi.fn();
    setRerunHandler(rerun);

    await expect(executeTool(modelContext, 'run_code')).resolves.toEqual({ ok: true });
    expect(rerun).toHaveBeenCalledTimes(1);
  });

  it('fails run_code when the preview is not attached', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();

    const result = await executeTool(modelContext, 'run_code');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('preview_unavailable');
  });

  it('undoes the last snapshot and returns the restored code', async () => {
    const modelContext = installModelContext();
    const { bridge, undo } = createBridge('current', {
      undoResult: { code: 'previous', version: 9 },
    });

    registerWebMcpTools(bridge);
    await flush();

    await expect(executeTool(modelContext, 'undo')).resolves.toEqual({
      ok: true,
      code: 'previous',
      version: 9,
    });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('reports nothing_to_undo when the history is empty', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('current').bridge);
    await flush();

    const result = await executeTool(modelContext, 'undo');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('nothing_to_undo');
  });

  it('clicks, fills, and presses through the registered interaction handler', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();
    attachPreview();

    const interact = vi.fn(async (request) => ({
      action: request.action,
      selector: request.selector,
      tag: 'button',
      text: 'Go',
      ...(request.action === 'fill' ? { value: request.value } : {}),
    }));
    setInteractionHandler(interact);

    await expect(executeTool(modelContext, 'interact', {
      action: 'click',
      selector: '#go',
    })).resolves.toMatchObject({ ok: true, action: 'click', selector: '#go' });

    await expect(executeTool(modelContext, 'interact', {
      action: 'fill',
      selector: '#name',
      value: 'Ada',
    })).resolves.toMatchObject({ ok: true, action: 'fill', value: 'Ada' });

    expect(interact).toHaveBeenCalledTimes(2);
  });

  it('fails interact when the preview is missing', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();

    const result = await executeTool(modelContext, 'interact', {
      action: 'click',
      selector: '#go',
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('preview_unavailable');
  });
});
