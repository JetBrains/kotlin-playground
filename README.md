# Kotlin Runnable Code

Self-contained component to embed in websites for running Kotlin code.

## Installation

Run `npm install` or `yarn`.

## Usage

For instance you have some Kotlin code in HTML markup (`<` and `>` should be replaced with HTML entities):

```html
<code>
fun main(args: Array&lt;String&gt;) {
   println("Hello")
}
</code>
```

Just import the library and initialize it with the CSS selector:

```js
import KotlinRunnable from 'kotlin-runcode';

window.addEventListener('DOMContentLoaded', () => {
  KotlinRunnable('code'); // <== CSS selector to select code nodes
});
```

All that code will appear in an editable box.
If you want to highlight a specific area to focus on a specific sample, use `//sampleStart` and `//sampleEnd` markers:

```html
<code>
fun main(args: Array&lt;String&gt;) {
   println("Hello")
}

//sampleStart
fun sum(a: Int, b: Int): Int {
  return a + b
}
//sampleEnd
</code>
```

## Development

Run `npm start` which will invoke `webpack` and set up an internal development server.
