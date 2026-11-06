import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerWebMcpTools,
  setWebMcpConsole,
  type WebMcpBridge,
} from '../services/webmcp';

interface FakeTool {
  name: string;
  execute: (
    input: Record<string, unknown>,
    options: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const createBridge = (code: string, options?: { writeEnabled?: boolean }) => {
  let current = code;
  const setCode = vi.fn((next: string) => {
    current = next;
  });
  const bridge: WebMcpBridge = {
    getCode: () => current,
    setCode,
    isWriteEnabled: () => options?.writeEnabled ?? true,
  };
  return { bridge, setCode, getCode: () => current };
};

const installModelContext = () => {
  const modelContext = createFakeModelContext();
  Object.defineProperty(document, 'modelContext', { value: modelContext, configurable: true });
  return modelContext;
};

describe('registerWebMcpTools', () => {
  const originalModelContext = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext');

  afterEach(() => {
    if (originalModelContext) {
      Object.defineProperty(Document.prototype, 'modelContext', originalModelContext);
    } else {
      delete (document as unknown as { modelContext?: unknown }).modelContext;
    }
    setWebMcpConsole('');
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    delete (document as unknown as { modelContext?: unknown }).modelContext;
    setWebMcpConsole('');
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
      'set_code',
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

  it('returns the current code for read-only tools', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('const a = 1;');

    registerWebMcpTools(bridge);
    await flush();

    await expect(modelContext.tools.get('get_code')!.execute({}, {})).resolves.toEqual({
      code: 'const a = 1;',
    });
  });

  it('serves the latest published console text', async () => {
    const modelContext = installModelContext();
    registerWebMcpTools(createBridge('').bridge);
    await flush();

    setWebMcpConsole('[log] driven from termux\n[error] boom');

    await expect(modelContext.tools.get('get_console')!.execute({}, {})).resolves.toEqual({
      output: '[log] driven from termux\n[error] boom',
    });
  });

  it('applies exact-text edits through the bridge', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode, getCode } = createBridge('const a = 1;\nconst b = 2;');

    registerWebMcpTools(bridge);
    await flush();

    const result = await modelContext.tools.get('apply_edits')!.execute({
      edits: [{ search: 'const a = 1;', replace: 'const a = 42;' }],
    }, {});

    expect(setCode).toHaveBeenCalledWith('const a = 42;\nconst b = 2;');
    expect(getCode()).toBe('const a = 42;\nconst b = 2;');
    expect(result).toMatchObject({ applied: 1 });
  });

  it('rejects ambiguous edits with a descriptive error and leaves the code untouched', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode } = createBridge('x();\nx();');

    registerWebMcpTools(bridge);
    await flush();

    await expect(modelContext.tools.get('apply_edits')!.execute({
      edits: [{ search: 'x();', replace: 'y();' }],
    }, {})).rejects.toThrow(/matches 2 times/);
    expect(setCode).not.toHaveBeenCalled();
  });

  it('fails writes closed while the disclaimer is unaccepted, but reads still work', async () => {
    const modelContext = installModelContext();
    const { bridge, setCode } = createBridge('const a = 1;', { writeEnabled: false });

    registerWebMcpTools(bridge);
    await flush();

    await expect(modelContext.tools.get('set_code')!.execute({ code: 'x' }, {}))
      .rejects.toThrow(/has not accepted the disclaimer/i);
    await expect(modelContext.tools.get('apply_edits')!.execute({
      edits: [{ search: 'const a = 1;', replace: 'const a = 2;' }],
    }, {})).rejects.toThrow(/has not accepted the disclaimer/i);
    expect(setCode).not.toHaveBeenCalled();

    await expect(modelContext.tools.get('get_code')!.execute({}, {})).resolves.toEqual({
      code: 'const a = 1;',
    });
    await expect(modelContext.tools.get('get_editor_status')!.execute({}, {})).resolves.toEqual({
      ready: false,
      codeLength: 12,
    });
  });

  it('validates edit and code input types', async () => {
    const modelContext = installModelContext();
    const { bridge } = createBridge('');

    registerWebMcpTools(bridge);
    await flush();

    await expect(modelContext.tools.get('set_code')!.execute({ code: 42 }, {}))
      .rejects.toThrow(/must be a string/);
    await expect(modelContext.tools.get('apply_edits')!.execute({ edits: 'nope' }, {}))
      .rejects.toThrow(/must be an array/);
  });
});
