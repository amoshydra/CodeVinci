import { Decoration, DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';
import { parser as jsParser } from '@lezer/javascript';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';

const htmlStringDecoration = Decoration.mark({
  class: 'cm-html-string',
});

const htmlTagNameDecoration = Decoration.mark({
  class: 'cm-tag-name',
});

const htmlAttributeNameDecoration = Decoration.mark({
  class: 'cm-attribute-name',
});

const htmlAttributeValueDecoration = Decoration.mark({
  class: 'cm-attribute-value',
});

const htmlBracketDecoration = Decoration.mark({
  class: 'cm-bracket',
});

const cssSelectorDecoration = Decoration.mark({
  class: 'cm-selector',
});

const cssPropertyNameDecoration = Decoration.mark({
  class: 'cm-property-name',
});

const cssPropertyValueDecoration = Decoration.mark({
  class: 'cm-property-value',
});

const cssCommentDecoration = Decoration.mark({
  class: 'cm-comment',
});

const cssImportantDecoration = Decoration.mark({
  class: 'cm-keyword',
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
    const builder: { from: number; to: number; value: Decoration }[] = [];
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
        const htmlContent = docContent.slice(from + 1, to - 1);
        builder.push(htmlStringDecoration.range(from + 1, to - 1));

        const htmlTree = htmlParser.parse(htmlContent);
        const cursor = htmlTree.cursor();

        const processHtmlNode = (nodeName: string, nodeFrom: number, nodeTo: number) => {
          const htmlFrom = from + 1 + nodeFrom;
          const htmlTo = from + 1 + nodeTo;

          if (nodeName === "TagName") {
            builder.push(htmlTagNameDecoration.range(htmlFrom, htmlTo));
          } else if (nodeName === "AttributeName") {
            builder.push(htmlAttributeNameDecoration.range(htmlFrom, htmlTo));
          } else if (nodeName === "AttributeValue") {
            builder.push(htmlAttributeValueDecoration.range(htmlFrom, htmlTo));
          } else if (["StartTag","EndTag","CloseTag","StartCloseTag","EndTag"].includes(nodeName)) {
            builder.push(htmlBracketDecoration.range(htmlFrom, htmlTo));
          }
        };

        const processCssNode = (offset: number, nodeName: string, nodeFrom: number, nodeTo: number) => {
          const cssFrom = from + 1 + offset + nodeFrom;
          const cssTo = from + 1 + offset + nodeTo;

          if (["TagName", "ClassName", "IdName", "identifier", "VariableName", "LayerName", "KeyframeName", "FeatureName", "queryIdentifier"].includes(nodeName)) {
            builder.push(cssSelectorDecoration.range(cssFrom, cssTo));
          } else if (nodeName === "PropertyName") {
            builder.push(cssPropertyNameDecoration.range(cssFrom, cssTo));
          } else if (["ValueName", "ColorLiteral", "NumberLiteral", "StringLiteral", "CallLiteral"].includes(nodeName)) {
            builder.push(cssPropertyValueDecoration.range(cssFrom, cssTo));
          } else if (nodeName === "Comment") {
            builder.push(cssCommentDecoration.range(cssFrom, cssTo));
          } else if (["Important", "AtKeyword"].includes(nodeName)) {
            builder.push(cssImportantDecoration.range(cssFrom, cssTo));
          }
        };

        const traverseHtml = () => {
          const currentCursor = cursor;

          while (currentCursor.next()) {
            const nodeText = htmlContent.slice(currentCursor.from, currentCursor.to);
            processHtmlNode(currentCursor.name, currentCursor.from, currentCursor.to);

            if (currentCursor.name === "StyleText") {
              const cssTree = cssParser.parse(nodeText);
              const cssCursor = cssTree.cursor();
              while (cssCursor.next()) {
                processCssNode(currentCursor.from, cssCursor.name, cssCursor.from, cssCursor.to);
              }
            }
          }
        };

        traverseHtml();
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
