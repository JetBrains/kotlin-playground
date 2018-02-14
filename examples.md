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

## Automatic initialization

Insert a `<script>` element into your page and specify what elements should be converted in its `data-selector` attribute.
```html
<script src="https://unpkg.com/kotlin-runcode@1/dist/runcode.min.js" data-selector=".kotlin-code"></script>
```

For instance following block of Kotlin code:

```txt
class Contact(val id: Int, var email: String) 

fun main(args: Array<String>) {
   val contact = Contact(1, "mary@gmail.com")
   println(contact.id)                   
}
```

Turns into:

<div class="kotlin-code">

```kotlin
class Contact(val id: Int, var email: String) 

fun main(args: Array<String>) {
   val contact = Contact(1, "mary@gmail.com")
   println(contact.id)                   
}
```

</div>

You can also change target platform or disable run button using `data-highlight-only` and `data-target-platform` attributes

<div class="kotlin-code" data-highlight-only>

```kotlin
fun main(args: Array<String>) {
  println("Hello World!")
}
```

</div>

<div class="kotlin-code" data-target-platform="js">

```kotlin
fun sum(a: Int, b: Int): Int {
  return a + b
}

fun main(args: Array<String>) {
  print(sum(-1, 8))
}
```

</div>

## Manual initialization

If you want to init KotlinRunCode manually - omit `data-selector` attribute and call it when it's needed:

```html
<script src="https://unpkg.com/kotlin-runcode@1/dist/runcode.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  KotlinRunCode('.code-blocks-selector');
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
  print(sum(-1, 8))
}
```

</div>

</body>
</html>
