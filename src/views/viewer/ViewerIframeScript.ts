import { serialize } from '@ungap/structured-clone';
import { onErrorFunctionName } from './common';

function send(method: string, args: unknown[]) {
  const message = {
    _id: 'codevinci',
    method,
    args: serialize(args, {
      lossy: true,
    }),
  };
  const { origin } = new URL(import.meta.url);
  window.parent.postMessage(message, origin);
}

const konsole = console;

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
  konsole.log(promiseRejectionEvent);
  send("console.error", [errorToObject(promiseRejectionEvent.reason)]);
});


const errorToObject = (error: any) => ({
  name: error.name,
  columnNumber: error.columnNumber,
  lineNumber: error.lineNumber,
  fileName: error.fileName,
  message: error.message,
  stack: error.stack,
});
