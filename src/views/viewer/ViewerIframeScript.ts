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
