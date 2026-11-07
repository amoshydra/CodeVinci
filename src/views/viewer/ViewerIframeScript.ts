import { serialize } from '@ungap/structured-clone';
import { onErrorFunctionName } from './common';


const origin = (() => {
  const origin = [...document.scripts].find(x => x.dataset.origin)?.dataset.origin
  if (origin) {
    return origin;
  }
  return new URL(import.meta.url).origin;
})();

function send(method: string, args: unknown[]) {
  const message = {
    _id: 'codevinci',
    method,
    args: serialize(args, {
      lossy: true,
    }),
  };

  window.parent.postMessage(message, origin);
}

// Let the parent tell a fresh run from the previous one before any user code runs.
send("preview.started", []);

type CspViolation = {
  blockedURI: string;
  effectiveDirective: string;
  disposition: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
};

declare global {
  interface Window {
    __codevinciCspQueue?: CspViolation[];
    __codevinciCspNotify?: ((violation: CspViolation) => void) | null;
  }
}

const sendCspViolation = (violation: CspViolation) => {
  send("csp.violation", [violation]);
};

window.__codevinciCspNotify = sendCspViolation;
const queuedCspViolations = window.__codevinciCspQueue ?? [];
queuedCspViolations.splice(0).forEach(sendCspViolation);

Object.defineProperty(window, "console", {
  value: (
    new Proxy(console, {
      get(target, prop, receiver) {
        return function (...args: unknown[]) {
          Reflect.get(target, prop, receiver)(...args);
          send("console." + prop.toString(), args);
        }
      },
    })
  ),
  writable: false,
  configurable: false,
});
Object.defineProperty(window, onErrorFunctionName, {
  value() {
    send("console.error", [new Error("Error loading script")]);
  },
  writable: false,
  configurable: false,
});

window.addEventListener("error", function ({ error }) {
  send("console.error", [errorToObject(error)]);
});

window.addEventListener("unhandledrejection", function(promiseRejectionEvent) {
  send("console.error", [errorToObject(promiseRejectionEvent.reason)]);
});


const errorToObject = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== 'object') return { message: String(error) };
  const e = error as Record<string, unknown>;
  return {
    name: e.name,
    columnNumber: e.columnNumber,
    lineNumber: e.lineNumber,
    fileName: e.fileName,
    message: e.message,
    stack: e.stack,
  };
};

interface PreviewRequest {
  _id?: string;
  id?: string;
  method?: string;
  args?: unknown[];
}

interface InteractiveElement {
  tag: string;
  text: string;
  selector: string;
}

interface PreviewSnapshot {
  title: string;
  text: string;
  truncated: boolean;
  isEmpty: boolean;
  elementCount: number;
  hasCanvas: boolean;
  interactive: InteractiveElement[];
}

const DEFAULT_PREVIEW_CHARS = 20_000;
const MAX_PREVIEW_CHARS = 200_000;
const MAX_INTERACTIVE = 20;
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [onclick]';

const selectorFor = (element: Element): string => {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== document.body && parts.length < 5) {
    const current: Element = node;
    let part = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (parent) {
      const currentTag = current.tagName;
      const sameTag = Array.from(parent.children)
        .filter((child: Element) => child.tagName === currentTag);
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
};

const elementLabel = (element: Element): string => {
  if (!(element instanceof HTMLElement)) return '';
  const label = element.innerText
    || element.getAttribute('aria-label')
    || element.getAttribute('name')
    || element.getAttribute('placeholder')
    || '';
  return label.trim().slice(0, 80);
};

const snapshotPreview = (options: unknown): PreviewSnapshot => {
  const opts = (options && typeof options === 'object' ? options : {}) as {
    selector?: unknown;
    maxChars?: unknown;
  };
  const selector = typeof opts.selector === 'string' && opts.selector.trim()
    ? opts.selector
    : 'body';
  const maxChars = typeof opts.maxChars === 'number' && Number.isFinite(opts.maxChars)
    ? Math.min(MAX_PREVIEW_CHARS, Math.max(0, Math.floor(opts.maxChars)))
    : DEFAULT_PREVIEW_CHARS;

  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`No element matches selector: ${selector}`);
  }

  const text = target instanceof HTMLElement
    ? target.innerText
    : (target.textContent ?? '');
  const interactive = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR))
    .slice(0, MAX_INTERACTIVE)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: elementLabel(element),
      selector: selectorFor(element),
    }));

  return {
    title: document.title,
    text: text.length > maxChars ? text.slice(0, maxChars) : text,
    truncated: text.length > maxChars,
    isEmpty: text.trim().length === 0,
    elementCount: document.body.querySelectorAll('*').length,
    hasCanvas: document.querySelector('canvas') !== null,
    interactive,
  };
};

interface InteractionResult {
  action: string;
  selector: string;
  tag: string;
  text: string;
  value?: string;
}

const interactPreview = (options: unknown): InteractionResult => {
  const opts = (options && typeof options === 'object' ? options : {}) as {
    action?: unknown;
    selector?: unknown;
    value?: unknown;
    key?: unknown;
  };
  const action = opts.action;
  const selector = typeof opts.selector === 'string' ? opts.selector : '';
  if (!selector) {
    throw new Error('selector is required');
  }
  if (action !== 'click' && action !== 'fill' && action !== 'press') {
    throw new Error('action must be click, fill, or press');
  }

  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`No element matches selector: ${selector}`);
  }
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Element is not interactive: ${selector}`);
  }

  if (action === 'click') {
    target.click();
  } else if (action === 'fill') {
    if (!(target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement)) {
      throw new Error(`Element cannot be filled: ${selector}`);
    }
    const value = typeof opts.value === 'string' ? opts.value : '';
    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    const key = typeof opts.key === 'string' && opts.key ? opts.key : 'Enter';
    target.focus();
    const init = { key, bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', init));
    target.dispatchEvent(new KeyboardEvent('keypress', init));
    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  return {
    action,
    selector,
    tag: target.tagName.toLowerCase(),
    text: elementLabel(target),
    ...(action === 'fill'
      ? { value: (target as HTMLInputElement).value }
      : {}),
  };
};

const respondToPreviewRequest = (id: string, payload: Record<string, unknown>) => {
  window.parent.postMessage({
    _id: 'codevinci-response',
    id,
    ...payload,
  }, origin);
};

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  const data = event.data as PreviewRequest | null;
  if (!data || data._id !== 'codevinci-request') return;

  const id = typeof data.id === 'string' ? data.id : '';
  try {
    if (data.method === 'preview.snapshot') {
      respondToPreviewRequest(id, { ok: true, result: snapshotPreview(data.args?.[0]) });
      return;
    }
    if (data.method === 'preview.interact') {
      respondToPreviewRequest(id, { ok: true, result: interactPreview(data.args?.[0]) });
      return;
    }
  } catch (error) {
    respondToPreviewRequest(id, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
