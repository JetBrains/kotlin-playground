class ImportView {

  constructor(completion) {
    this.completion = completion;
  }

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

  hint(mirror, self, data) {
    let packageLine = -1
    let textLines = mirror.getValue().split("\n");
    for(let i = 0; i < textLines.length; ++i) {
      let line = textLines[i]
      if (/package/.test(line)) {
        packageLine = i
        break;
      } else if (!/^\s*$/.test(line)) {
        break;
      }
    }
    let line = ++packageLine;
    let importText = "import " + this.completion.tail + "\n";
    mirror.replaceRange(importText, {line: line, ch: 0})
  }
}

export default ImportView
