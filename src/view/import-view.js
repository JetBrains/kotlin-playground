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
    console.log("Hello from import")
    let importText = "import " + this.completion.tail + "\n"
    mirror.replaceRange(importText, {line: 0, ch: 0})
  }
}

export default ImportView
