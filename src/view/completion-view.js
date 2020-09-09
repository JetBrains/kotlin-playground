const IMPORT_NAME = 'import';
const NO_LINE_NUMBER = -1;

/**
 * Class for drawing own autocompletion view
 */
class CompletionView {

  constructor(completion) {
    this.completion = completion;
  }

  /**
   * Implementation of replacing text after choosing completion.
   *
   * @param elt - node element
   * @param data
   * @param cur
   */
  render(elt, data, cur) {
    let icon = document.createElement('div');
    let text = document.createElement('div');
    let tail = document.createElement('div');
    icon.setAttribute("class", "icon " + this.completion.icon);
    text.setAttribute("class", "name");
    tail.setAttribute("class", "tail");
    text.textContent = this.completion.displayText;
    tail.textContent = this.completion.tail;
    elt.appendChild(icon);
    elt.appendChild(text);
    elt.appendChild(tail);
  }

  /**
   * Render own styles when autocomplete displays.
   *
   * @param mirror - codemirror instance
   * @param self
   * @param data
   */
  hint(mirror, self, data) {
    if (!this.completion[IMPORT_NAME] || this.completion.hasOtherImports) {
      this.completeText(mirror)
    } else {
      this.addImport(mirror)
    }
  }

  completeText(mirror) {
    let cur = mirror.getCursor();
    let token = mirror.getTokenAt(cur);
    let from = {line: cur.line, ch: token.start};
    let to = {line: cur.line, ch: token.end};
    const currentSymbol = token.string.trim();
    if ([".", "", "(", ":"].includes(currentSymbol)) {
      mirror.replaceRange(this.completion.text, to)
    } else {
      /*
      Replace string with $ in string in case=>
      val world = "world"
      println("Hello $world)

      Plain string => cursorInStringIndex = -1
      completionText will be equals result.text
       */
      let cursorInStringIndex = cur.ch - token.start;
      let sentence$index = currentSymbol.substring(0, cursorInStringIndex).lastIndexOf('$');
      let firstSentence = currentSymbol.substring(0, sentence$index + 1);
      let completionText = firstSentence + this.completion.text + currentSymbol.substring(cursorInStringIndex, token.string.length);
      mirror.replaceRange(completionText, from, to);
      mirror.setCursor(cur.line, token.start + sentence$index + this.completion.text.length + 1);
      if (completionText.endsWith('(')) {
        mirror.replaceRange(")", {line: cur.line, ch: token.start + this.completion.text.length});
        mirror.execCommand("goCharLeft")
      }
    }
  }

  addImport(mirror) {
    const {packageLine, importLine} = this.findPackageLineAndFirstImportLine(mirror);
    let importText = "import " + this.completion[IMPORT_NAME] + "\n";

    // if there are other imports => insert before them
    if (importLine !== NO_LINE_NUMBER) {
      mirror.replaceRange(importText, {line: importLine, ch: 0});
      return;
    }

    if (packageLine !== NO_LINE_NUMBER) {
      importText = "\n" + importText;
    }
    let nextPackageLine = packageLine + 1;
    if (!this.lineIsEmpty(mirror, nextPackageLine)) {
      importText += "\n";
    }
    mirror.replaceRange(importText, {line: nextPackageLine, ch: 0});
  }

  lineIsEmpty(mirror, lineNumber) {
    let line = mirror.getLine(lineNumber);
    return /^\s*$/.test(line);
  }

  findPackageLineAndFirstImportLine(mirror) {
    let packageLine = NO_LINE_NUMBER;
    let importLine = NO_LINE_NUMBER;
    let textLines = mirror.getValue().split("\n");
    for(let i = 0; i < textLines.length; ++i) {
      let line = textLines[i];
      if (/^\s*package /.test(line)) {
        packageLine = i;
      } else if (/^\s*import /.test(line)) {
        importLine = i;
        break;
      } else if (!/^\s*$/.test(line)) {
        break;
      }
    }
    return {packageLine: packageLine, importLine: importLine};
  }
}

export default CompletionView
