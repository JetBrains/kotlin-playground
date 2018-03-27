<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kotlin Playground examples</title>
  <link rel="stylesheet" href="examples.css">
  <link rel="stylesheet" href="examples-highlight.css">
  <style>
  .markdown-body {
		max-width: 980px;
		margin: 50px auto;
	}
  </style>
  <script src="../playground.js" data-selector=".kotlin-code"></script>
</head>
<body class="markdown-body">

# Kotlin Playground demo

## Automatic initialization

Insert a `<script>` element into your page and specify what elements should be converted in its `data-selector` attribute.
```html
<script src="https://unpkg.com/kotlin-playground@1" data-selector=".kotlin-code"></script>
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

Use `data-target-platform` attribute with value `junit` for creating examples with tests:

<div class="kotlin-code" data-target-platform="junit">

```kotlin
import org.junit.Test
import org.junit.Assert

class TestLambdas() {
    @Test fun contains() {
        Assert.assertTrue("The result should be true if the collection contains an even number", 
                          containsEven(listOf(1, 2, 3, 126, 555)))
    }

    @Test fun notContains() {
        Assert.assertFalse("The result should be false if the collection doesn't contain an even number",
                           containsEven(listOf(43, 33)))
    }
}
//sampleStart
fun containsEven(collection: Collection<Int>): Boolean = collection.any { it % 2 == 0 }
//sampleEnd
```
</div>

## Manual initialization

If you want to init Kotlin Playground manually - omit `data-selector` attribute and call it when it's needed:

```html
<script src="https://unpkg.com/kotlin-playground@1"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  KotlinPlayground('.code-blocks-selector');
});
</script>
```

<div>

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

<button onclick="KotlinPlayground('.kotlin-code-2'); this.disabled = true; document.getElementById('kotlin-example').style.display = 'block';">Create</button>

<div id="kotlin-example" class="kotlin-code-2" style="display: none;">

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
