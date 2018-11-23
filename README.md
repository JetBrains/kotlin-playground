[![official JetBrains project](http://jb.gg/badges/official-plastic.svg)](https://confluence.jetbrains.com/display/ALL/JetBrains+on+GitHub)
[![NPM version](https://img.shields.io/npm/v/kotlin-playground.svg)](https://www.npmjs.com/package/kotlin-playground)

# Kotlin Playground

Component that creates Kotlin-aware editors capable of running code from HTML block elements.

[Examples](https://jetbrains.github.io/kotlin-playground/examples/)

## Installation

### Use our CDN

Insert a `<script>` element into your page and specify what elements should be converted in its `data-selector` attribute.

```html
<script src="https://unpkg.com/kotlin-playground@1" data-selector="code"></script>
```

Or, if you need to separate process of loading/conversion, omit the `data-selector` attribute and use a second `<script>` element like this:

```html
<script src="https://unpkg.com/kotlin-playground@1"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
  KotlinPlayground('.code-blocks-selector');
});
</script>
```

You can also overwrite the server where the code will be sent to be compiled and analyzed (for example if you host a server instance that includes your own Kotlin libraries). For that you can set the `data-server` attibute, like this:

```html
<script src="https://unpkg.com/kotlin-playground@1" data-selector="code" data-server="https://my-kotlin-playground-server"></script>
```

### Host your own instance

Install Kotlin-playground as dependency via NPM.

```bash
npm install kotlin-playground -S
```

And then just use it in your code.

```js
// ES5
var playground = require('kotlin-playground');

document.addEventListener('DOMContentLoaded', function() {
  playground('code'); // attach to all <code> elements
});


// ES6
import playground from 'kotlin-playground';

document.addEventListener('DOMContentLoaded', () => {
  playground('code'); // attach to all <code> elements
});
```

### Use from plugins

1) [Kotlin Playground WordPress plugin](https://github.com/Kotlin/kotlin-playground-wp-plugin) — [WordPress](https://wordpress.com/) plugin which allows to embed interactive Kotlin playground to any post.
2) [Kotlin Playground Coursera plugin](https://github.com/AlexanderPrendota/kotlin-playground-coursera-plugin) — Allows embedding interactive Kotlin playground for [coursera](https://www.coursera.org/) lessons.

### Options

Kotlin Playground supports several events, and also server URL overwriting passing an additional `options` parameter on initialisation.

For example:
```js
function onChange(code) {
  console.log("Editor code was changed:\n" + code);
}

function onTestPassed() {
   console.log("Tests passed!");
}

const options = {
  server: 'https://my-kotlin-playground-server',
  onChange: onChange(code),
  onTestPassed: onTestPassed,
  callback: callback(targetNode, mountNode)
};

playground('.selector', options)

```

**Events description:**

- `onChange(code)` — Fires every time the content of the editor is changed. Debounce time: 0.5s.
 _code_ — current playground code.


- `onTestPassed` — Is called after all tests passed. Use for target platform `junit`.

- `onCloseConsole` — Is called after the console's closed.

- `onOpenConsole` — Is called after the console's opened.

- `getJsCode(code)` — Is called after compilation Kotlin to JS. Use for target platform `js`.
   _code_ — converted JS code from Kotlin.

- `callback(targetNode, mountNode)` — Is called after playground's united.
 _targetNode_ — node with plain text before component initialization.
 _mountNode_  — new node with runnable editor.

- `getInstance(instance)` - Getting playground state API.

  ```js
  instance.state      // playground attributes, dependencies and etc.
  instance.nodes      // playground NodeElement.
  instance.codemirror // editor specification.
  instance.execute()  // function for executing code snippet.
  instance.getCode()  // function for getting code from snippet.
  ```

## Customizing editors


Use the following attributes on elements that are converted to editors to adjust their behavior.

- `data-version`: Target Kotlin [compiler version](https://try.kotlinlang.org/kotlinServer?type=getKotlinVersions):

   ```html
    <code data-version="1.0.7">
    /*
    Your code here
    */
    </code>
    ```
- `args`: Command line arguments.

  ```html
  <code args="1 2 3">
  /*
  Your code here
  */
  </code>
  ```

- `data-target-platform`: target platform: `junit`, `canvas`, `js` or `java` (default).

  ```html
   <code data-target-platform="js">
    /*
    Your code here
    */
   </code>
   ```
- `data-highlight-only`: Read-only mode, with only highlighting. `data-highlight-only="nocursor"` - no focus on editor.

  ```html
  <code data-highlight-only>
    /*
    Your code here
    */
  </code>
  ```

  Or, you can make only a part of code read-only by placing it between `//sampleStart` and `//sampleEnd` markers.
  If you don't need this just use attribute `none-markers`.
  For adding hidden files: put files between `<textarea>` tag with class `hidden-dependency`.

  ```html
  <code>
  import cat.Cat

  fun main(args: Array<String>) {
  //sampleStart
      val cat = Cat("Kitty")
      println(cat.name)  
  //sampleEnd                 
  }
    <textarea class="hidden-dependency">
      package cat
      class Cat(val name: String)
    </textarea>
  </code>
  ```
  Also if you want to hide code snippet just set the attribute `folded-button` to `false` value.

- `data-js-libs`: By default component loads jQuery and makes it available to the code running in the editor. If you need any additional JS libraries, specify them as comma-separated list in this attribute.

  ```html
  <code data-js-libs="https://my-awesome-js-lib/lib.min.js">
    /*
    Your code here
    */
   </code>
  ```

- `auto-indent="true|false"`: Whether to use the context-sensitive indentation. Defaults to `false`.

- `theme="idea|darcula|default"`: Editor IntelliJ IDEA themes.

- `mode="kotlin|js|java|groovy|xml|c|shell|swift|obj-c"`: Different languages styles. Runnable snippets only with `kotlin`. Default to `kotlin`.

- `data-min-compiler-version="1.0.7"`: Minimum target Kotlin [compiler version](https://try.kotlinlang.org/kotlinServer?type=getKotlinVersions)

- `highlight-on-fly="true|false"`: Errors and warnings check for each change in the editor. Defaults to `false`.

- `autocomplete="true|false"`: Get completion on every key press. If `false` => Press ctrl-space to activate autocompletion. Defaults to `false`.

- `indent="4"`: How many spaces a block should be indented. Defaults to `4`.

- `lines="true|false"`: Whether to show line numbers to the left of the editor. Defaults to `false`.

- `from="5" to="10`: Create a part of code. Example `from` line 5 `to` line 10.

- `data-output-height="200"`: Set the iframe height in `px` in output. Use for target platform `canvas`.

- `match-brackets="true|false""`: Determines whether brackets are matched whenever the cursor is moved next to a bracket. Defaults to `false`.


## Supported keyboard shortcuts

  - Ctrl+Space		   — code completion
  - Ctrl+F9/Cmd+R	       — execute snippet
  - Ctrl+/		       — comment code
  - Ctrl+Alt+L/Cmd+Alt+L   — format code
  - Shift+Tab		   — decrease indent


## Develop and contribute

1. Fork & clone [our repository](https://github.com/JetBrains/kotlin-playground).
2. Install required dependencies `npm install`.
3. `npm start` to start local development server at http://localhost:9000, or `npm start -- --env.webDemoUrl=http://localhost:6666` if you want a different port.
4. `npm run build` to create production bundles.
