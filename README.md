# Kotlin Run Code

Self-contained component to embed in websites for running Kotlin code. It converts 
HTML code blocks to editable and runnable editor.

## Usage

### Quickly from CDN

Insert `<script>` tag into the page and specify code blocks selector to attach.

```html
<script src="https://unpkg.com/kotlin-runcode/runcode.min.js" data-selector="code"></script>
```

By default selector "code" is used.

### Manually from NPM

Install KotlinRunCode as dependency.

```bash
npm install kotlin-runcode -S
```

Use it in your code.

```js
// ES5
var runcode = require('kotlin-runcode');

document.addEventListener('DOMContentLoaded', function() {
  runcode('code'); // attach to all <code> elements
});


// ES6
import runcode from 'kotlin-runcode';

document.addEventListener('DOMContentLoaded', () => {
  runcode('code'); // attach to all <code> elements
});
```

### Configuration

TODO

### Configure specific code block

Following HTML attributes are supported.
- `data-min-compiler-version`. Minimal target Kotlin compiler version:
  ```html
  <code data-min-compiler-version="1.1">
  fun main(name: String) {
     println("Hello $name")
  }
  </code>
  ```

  To see all available versions please visit https://try.kotlinlang.org/kotlinServer?type=getKotlinVersions.

**Make editable only part of the code**

If you want to highlight a specific area to focus on a specific sample, use `//sampleStart` and `//sampleEnd` markers:

```html
<code>
fun main(name: String) {
   println("Hello $name")
}

//sampleStart
fun sum(a: Int, b: Int): Int {
  return a + b
}
//sampleEnd
</code>
```

## Development

1. Fork & clone a repository ([how to](https://help.github.com/articles/fork-a-repo)).
2. Install dependencies `npm install`.
3. Following commands are available:
   - `npm start` to run a local development server at http://localhost:9000.
   - `npm run build` to build a production bundle.
