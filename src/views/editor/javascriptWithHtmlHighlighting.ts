import { Decoration, DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';
import { parser as jsParser } from '@lezer/javascript';

const htmlStringDecoration = Decoration.mark({
  class: 'cm-html-string',
});

const insertAdjacentHTMLHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.getDecorations(view);
  }

  update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.getDecorations(update.view);
    }
  }

  getDecorations(view: EditorView): DecorationSet {
    const builder: any[] = [];
    const tree = jsParser.parse(view.state.doc.toString());
    const docContent = view.state.doc.toString();

    let chainIndex = 0;
    const chainOfEvents: ((name: string, text: string, node: { to: number, from: number}) => boolean | null)[] = [
      (name, text) => name === "ExpressionStatement" && text.startsWith(`document.body.insertAdjacentHTML(`),
      (name) => {
        if (name === "ExpressionStatement") return false;
        if (name === "ArgList") return true;
        return null;
      },
      (name) => name === "(",
      (name) => name === "String",
      (name) => name === ",",
      (_name, _text, { to, from }) => {
        builder.push(htmlStringDecoration.range(from + 1, to - 1));
        // process node, then return false to end the chain;
        return false;
      }
    ];

    tree.cursor().iterate((node) => {
      const name = node.name;
      const text = docContent.slice(node.from, node.to);

      if (name === "Script") return true;

      const runner = chainOfEvents[chainIndex];
      if (!runner) {
        chainIndex = 0;
        return false;
      }
      const result = runner(name, text, node);
      if (result === false) {
        chainIndex = 0;
        return false;
      }

      if (result === true) {
        chainIndex += 1;
      }
      return true;
    });
    return Decoration.set(builder);
  }
}, { decorations: (v) => v.decorations });

export const javascriptWithHtmlHighlighting = () => insertAdjacentHTMLHighlighter
