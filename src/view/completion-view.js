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
    if (!this.completion['import'] || this.completion.hasOtherImports) {
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
    let packageLine = -1
    let importLine = -1
    let textLines = mirror.getValue().split("\n");
    for(let i = 0; i < textLines.length; ++i) {
      let line = textLines[i]
      if (/^\s*package/.test(line)) {
        packageLine = i
      } else if (/^\s*import/.test(line)) {
        importLine = i
        break;
      } else if (!/^\s*$/.test(line)) {
        break;
      }
    }
    if (importLine !== -1) {
      let importText = "import " + this.completion['import'] + "\n";
      mirror.replaceRange(importText, {line: importLine, ch: 0})
    } else {
      let importText = "";
      if (packageLine !== -1) {
        importText += "\n";
      }
      importText += ("import " + this.completion['import'] + "\n");
      let line = ++packageLine
      let nextLine = mirror.getLine(line)
      if (!/^\s*$/.test(nextLine)) {
        importText += "\n"
      }
      mirror.replaceRange(importText, {line: line, ch: 0})
    }
  }
}

export default CompletionView
