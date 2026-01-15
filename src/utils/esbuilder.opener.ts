import { EsbuilderOptions, esbuilderTranform } from "./esbuilder";
import { createEsbuilderHtmlTemplate } from "./esbuilder.html";


export const esbuildLaunchInNewWindow = async (code: string, settings: EsbuilderOptions) => {
  let url = "about:blank";
  try {
    await esbuilderTranform(code, settings).then(e => {
      const code = e.code;
      const html = createEsbuilderHtmlTemplate(code);
      url = URL.createObjectURL(new Blob([html], {
        type: "text/html",
      }));

      const newWindow = window.open(url, "_blank", "width=1080");
      if (newWindow) {
        function createTracker() {
          setTimeout(() => {
            if (!newWindow || newWindow.closed) {
              URL.revokeObjectURL(url);
            } else {
              newWindow.onbeforeunload = createTracker;
            }
          }, 120);
        }
        newWindow.onbeforeunload = createTracker;
      } else {
        location.href = url;
      }
      return url;
    });
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
