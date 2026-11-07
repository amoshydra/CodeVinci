/**
 * Shared state for the WebMCP tool surface and the preview iframe.
 *
 * The tools are registered above the disclaimer gate, while the preview only
 * exists inside the editor. This module is the meeting point: React publishes
 * run/console state here, and the tools read it without needing React context.
 */
export type PreviewState = 'idle' | 'building' | 'started' | 'failed';

export type SettleStatus = 'settled' | 'timeout' | 'failed';

export interface PreviewStatus {
  state: PreviewState;
  lastActivityAt: number;
  /** True when an iframe is mounted and answering requests. */
  available: boolean;
  lastError: string | null;
}

export interface SettleOptions {
  quietMs?: number;
  timeoutMs?: number;
}

export interface SettleResult {
  status: SettleStatus;
  waitedMs: number;
}

export interface ConsoleSnapshot {
  text: string;
  totalLogs: number;
  shownLogs: number;
  truncated: boolean;
}

export type ConsoleSnapshotInput = Omit<ConsoleSnapshot, 'truncated'>;

export interface PreviewRequestOptions {
  selector?: string;
  maxChars?: number;
  includeStyles?: boolean;
}

export interface InteractiveElement {
  tag: string;
  text: string;
  selector: string;
  disabled: boolean;
}

export interface PreviewSnapshot {
  title: string;
  text: string;
  truncated: boolean;
  isEmpty: boolean;
  elementCount: number;
  hasCanvas: boolean;
  interactive: InteractiveElement[];
  interactiveTruncated: boolean;
  hiddenInteractiveCount: number;
  targetVisible: boolean;
  styles?: Record<string, string>;
}

export type InteractionAction = 'click' | 'fill' | 'press';

export interface InteractionRequest {
  action: InteractionAction;
  selector: string;
  value?: string;
  key?: string;
}

export interface InteractionResult {
  action: InteractionAction;
  selector: string;
  tag: string;
  text: string;
  value?: string;
  key?: string;
  code?: string;
}

const DEFAULT_QUIET_MS = 150;
const DEFAULT_TIMEOUT_MS = 2000;

let previewState: PreviewState = 'idle';
let lastActivityAt = 0;
let lastError: string | null = null;
let consoleText = '';
let totalLogs = 0;
let shownLogs = 0;
let rerunHandler: (() => void) | null = null;
let previewHandler: ((options: PreviewRequestOptions) => Promise<PreviewSnapshot>) | null = null;
let interactionHandler: ((request: InteractionRequest) => Promise<InteractionResult>) | null = null;

const touch = (): void => {
  lastActivityAt = Date.now();
};

/** A new preview run was requested; its output is no longer current. */
export const beginRun = (): void => {
  previewState = 'building';
  consoleText = '';
  totalLogs = 0;
  shownLogs = 0;
  lastError = null;
  touch();
};

/** The iframe finished loading and started executing the current run. */
export const markPreviewStarted = (): void => {
  previewState = 'started';
  touch();
};

/** The build failed; there is no iframe for this run. */
export const markPreviewFailed = (message: string): void => {
  previewState = 'failed';
  lastError = message;
  touch();
};

/** The editor published fresh console text for the current run. */
export const publishConsole = (snapshot: ConsoleSnapshotInput): void => {
  consoleText = snapshot.text;
  totalLogs = snapshot.totalLogs;
  shownLogs = snapshot.shownLogs;
  touch();
};

export const getConsoleSnapshot = (): ConsoleSnapshot => ({
  text: consoleText,
  totalLogs,
  shownLogs,
  truncated: totalLogs > shownLogs,
});

export const getPreviewStatus = (): PreviewStatus => ({
  state: previewState,
  lastActivityAt,
  available: previewHandler !== null,
  lastError,
});

export const setRerunHandler = (handler: (() => void) | null): (() => void) => {
  rerunHandler = handler;
  return () => {
    if (rerunHandler === handler) rerunHandler = null;
  };
};

/** Re-executes the preview without changing the editor contents. */
export const requestRerun = (): boolean => {
  if (!rerunHandler) return false;
  beginRun();
  rerunHandler();
  return true;
};

export const setPreviewHandler = (
  handler: ((options: PreviewRequestOptions) => Promise<PreviewSnapshot>) | null,
): (() => void) => {
  previewHandler = handler;
  return () => {
    if (previewHandler === handler) previewHandler = null;
  };
};

export const requestPreviewSnapshot = async (
  options: PreviewRequestOptions = {},
): Promise<PreviewSnapshot> => {
  if (!previewHandler) {
    throw new Error('The preview is not available yet.');
  }
  return previewHandler(options);
};

export const setInteractionHandler = (
  handler: ((request: InteractionRequest) => Promise<InteractionResult>) | null,
): (() => void) => {
  interactionHandler = handler;
  return () => {
    if (interactionHandler === handler) interactionHandler = null;
  };
};

export const requestPreviewInteraction = async (
  request: InteractionRequest,
): Promise<InteractionResult> => {
  if (!interactionHandler) {
    throw new Error('The preview is not available yet.');
  }
  return interactionHandler(request);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves after the current run started and its output went quiet. A failed
 * build resolves immediately. This is a heuristic: async logs that arrive
 * after the quiet window are missed.
 */
export const whenSettled = async (options: SettleOptions = {}): Promise<SettleResult> => {
  const quietMs = Math.max(0, options.quietMs ?? DEFAULT_QUIET_MS);
  const timeoutMs = Math.max(0, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const start = Date.now();

  if (previewState === 'failed') {
    return { status: 'failed', waitedMs: 0 };
  }

  if (previewState === 'idle') {
    return { status: 'timeout', waitedMs: 0 };
  }

  const deadline = start + timeoutMs;
  while (true) {
    const state = previewState as PreviewState;
    if (state === 'failed') {
      return { status: 'failed', waitedMs: Date.now() - start };
    }
    if (state === 'started' && Date.now() - lastActivityAt >= quietMs) {
      return { status: 'settled', waitedMs: Date.now() - start };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return { status: 'timeout', waitedMs: Date.now() - start };
    }
    await sleep(Math.min(25, remaining));
  }
};

/** Clears module state; used by tests and when the app tears down. */
export const resetWebMcpRuntime = (): void => {
  previewState = 'idle';
  lastActivityAt = 0;
  lastError = null;
  consoleText = '';
  totalLogs = 0;
  shownLogs = 0;
  rerunHandler = null;
  previewHandler = null;
  interactionHandler = null;
};
