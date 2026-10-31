import { applyEdits, type TextEdit } from './llm/applyEdits';

/**
 * Minimal WebMCP typings. The API is a W3C Community Group draft and is not in
 * TypeScript's DOM lib yet. Spec: https://webmachinelearning.github.io/webmcp/
 */
interface WebMcpAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
  debugging?: boolean;
}

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMcpAnnotations;
  execute: (
    input: Record<string, unknown>,
    options: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
}

interface WebMcpModelContext {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
}

declare global {
  interface Document {
    /** WebMCP currently lives on `Document`; older builds exposed it on `Navigator`. */
    modelContext?: WebMcpModelContext;
  }
}

export interface WebMcpBridge {
  getCode: () => string;
  setCode: (code: string) => void;
  getLogs: () => string;
}

const getModelContext = (): WebMcpModelContext | undefined => {
  const fromDocument = document.modelContext;
  if (fromDocument) return fromDocument;

  const legacy = (navigator as Navigator & { modelContext?: WebMcpModelContext }).modelContext;
  return legacy;
};

export const isWebMcpAvailable = (): boolean =>
  typeof getModelContext()?.registerTool === 'function';

const readCode = (bridge: WebMcpBridge): WebMcpTool => ({
  name: 'get_code',
  description: 'Read the JavaScript currently loaded in the editor.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  execute: async () => ({ code: bridge.getCode() }),
});

const readConsole = (bridge: WebMcpBridge): WebMcpTool => ({
  name: 'get_console',
  description:
    'Read recent console output from the preview, including errors and warnings. Use it after changing code to check whether the preview still runs.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: async () => ({ output: bridge.getLogs() }),
});

const writeCode = (bridge: WebMcpBridge): WebMcpTool => ({
  name: 'set_code',
  description:
    'Replace the entire editor contents with new code. Use for new code or changes that span most of the file.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The complete new code.' },
    },
    required: ['code'],
  },
  annotations: { readOnlyHint: false, consequentialHint: false },
  execute: async (input) => {
    const code = input.code;
    if (typeof code !== 'string') {
      throw new Error('set_code: "code" must be a string.');
    }
    bridge.setCode(code);
    return { replaced: true, length: code.length };
  },
});

const editCode = (bridge: WebMcpBridge): WebMcpTool => ({
  name: 'apply_edits',
  description:
    'Make small, targeted changes by replacing exact text. Prefer this over set_code for a few lines. Each search must match exactly once.',
  inputSchema: {
    type: 'object',
    properties: {
      edits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description:
                'Exact text to find. Must appear exactly once. Include surrounding context.',
            },
            replace: { type: 'string', description: 'Text to replace it with.' },
          },
          required: ['search', 'replace'],
        },
      },
    },
    required: ['edits'],
  },
  annotations: { readOnlyHint: false, consequentialHint: false },
  execute: async (input) => {
    const edits = parseEdits(input.edits);
    const { result, error } = applyEdits(bridge.getCode(), edits);
    if (error) {
      // Surface the descriptive error so the agent can self-correct.
      throw new Error(error);
    }
    bridge.setCode(result);
    return { applied: edits.length, code: result };
  },
});

const parseEdits = (value: unknown): TextEdit[] => {
  if (!Array.isArray(value)) {
    throw new Error('apply_edits: "edits" must be an array.');
  }
  return value.map((item, index) => {
    const edit = item as Partial<TextEdit> | null;
    if (typeof edit?.search !== 'string' || typeof edit.replace !== 'string') {
      throw new Error(
        `apply_edits: edit ${index + 1} needs string "search" and "replace" fields.`,
      );
    }
    return { search: edit.search, replace: edit.replace };
  });
};

const buildTools = (bridge: WebMcpBridge): WebMcpTool[] => [
  readCode(bridge),
  writeCode(bridge),
  editCode(bridge),
  readConsole(bridge),
];

/**
 * Exposes editor actions to a browser agent (WebMCP / "site tools").
 * Returns a cleanup function. No-op when the browser has no WebMCP support.
 */
export function registerWebMcpTools(bridge: WebMcpBridge): () => void {
  const modelContext = getModelContext();
  if (typeof modelContext?.registerTool !== 'function') {
    return () => {};
  }

  const controller = new AbortController();
  const tools = buildTools(bridge);

  // Register as a batch: a partial tool surface is worse than none.
  Promise.all(
    tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal })),
  )
    .then(() => {
      if (import.meta.env.DEV) {
        console.info(`[webmcp] registered ${tools.length} site tools`);
      }
    })
    .catch((error) => {
      console.warn('[webmcp] registration failed, tools disabled', error);
      controller.abort();
    });

  return () => controller.abort();
}
