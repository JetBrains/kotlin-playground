<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>KotlinRunCode examples</title>
  <link rel="stylesheet" href="examples.css">
  <link rel="stylesheet" href="examples-highlight.css">
  <style>
  .markdown-body {
		max-width: 980px;
		margin: 50px auto;
	}
  </style>
  <script src="../runcode.js" data-selector=".kotlin-code"></script>
</head>
<body class="markdown-body">

# KotlinRunCode demo

### Automatic initialization

For instance you have following block of Kotlin code:

```txt
fun sum(a: Int, b: Int): Int {
  return a + b
}
```

Just add `<script>` tag into the page and specify code blocks selector to attach via `data-selector` HTML attribute.

```html
<script src="https://unpkg.com/kotlin-runcode@1/dist/runcode.min.js" data-selector=".kotlin-code"></script>
```

You will get:

<div class="kotlin-code">

```kotlin
fun sum(a: Int, b: Int): Int {
  return a + b
}
```

</div>

### Manual initialization

```html
<script src="https://unpkg.com/kotlin-runcode/dist/runcode.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  runcode('.code-blocks-selector');
});
</script>
```

<button onclick="KotlinRunCode('.kotlin-code-2'); this.disabled = true">Create</button>

<div class="kotlin-code-2">

```text
//sampleStart
fun sum(a: Int, b: Int): Int {
  return a + b
}
//sampleEnd

fun main(args: Array<String>) {
  printSum(-1, 8)
}
```

</div>

</body>
</html>
