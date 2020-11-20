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

You can also change the playground theme or disable run button using `theme` and `data-highlight-only` attributes.

```html
<div class="kotlin-code" theme="idea" data-highlight-only></div>
``` 
<div class="kotlin-code" data-highlight-only theme="idea">

```kotlin
fun main(args: Array<String>) {
    println("Hello World!")
}
```

</div>

Or theme `darcula`

<div class="kotlin-code" data-highlight-only theme="darcula">

```kotlin
fun main(args: Array<String>) {
    println("Hello World!")
}
```

</div>

Set another target platform with attribute `data-target-platform`.

```html
<div class="kotlin-code" data-target-platform="js"></div>
```
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

class TestExtensionFunctions() {
    @Test fun testIntExtension() {
        Assert.assertEquals("Rational number creation error: ", RationalNumber(4, 1), 4.r())
    }

    @Test fun testPairExtension() {
        Assert.assertEquals("Rational number creation error: ", RationalNumber(2, 3), Pair(2, 3).r())
    }
}
//sampleStart
/*
Then implement extension functions Int.r() and Pair.r() and make them convert Int and Pair to RationalNumber.
*/
fun Int.r(): RationalNumber = RationalNumber(this, 2)
fun Pair<Int, Int>.r(): RationalNumber = RationalNumber(first, second)

data class RationalNumber(val numerator: Int, val denominator: Int)
//sampleEnd
```
</div>

The test clases in this code snippet are folded away thanks to the `//sampleStart` and `//sampleEnd` comments in the code.
If you want to hide test classes completely just set the attribute `folded-button` to `false` value.

Also you can mark arbitrary code by putting it between `[mark]your code[/mark]`.

```html
<div class="kotlin-code" data-target-platform="junit" folded-button="false"></div>
```

<div class="kotlin-code" data-target-platform="junit" folded-button="false">

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
/*
Pass a lambda to any function to check if the collection contains an even number.
The function any gets a predicate as an argument and returns true if there is at least one element satisfying the predicate.
*/
fun containsEven(collection: Collection<Int>): Boolean = collection.any {[mark]TODO()[/mark]}
//sampleEnd
```

</div>

Use `data-target-platform` attribute with value `canvas` for working with canvas in Kotlin:

```html
<div class="kotlin-code" data-target-platform="canvas" data-output-height="200">
```

<div class="kotlin-code" data-target-platform="canvas" data-output-height="200">

```kotlin
package fancylines


import jquery.*
import org.w3c.dom.CanvasRenderingContext2D
import org.w3c.dom.HTMLCanvasElement
import kotlin.browser.document
import kotlin.browser.window
import kotlin.random.Random



val canvas = initalizeCanvas()
fun initalizeCanvas(): HTMLCanvasElement {
    val canvas = document.createElement("canvas") as HTMLCanvasElement
    val context = canvas.getContext("2d") as CanvasRenderingContext2D
    context.canvas.width  = window.innerWidth.toInt();
    context.canvas.height = window.innerHeight.toInt();
    document.body!!.appendChild(canvas)
    return canvas
}

class FancyLines() {
    val context = canvas.getContext("2d") as CanvasRenderingContext2D
    val height = canvas.height
    val width = canvas.width
    var x = width * Random.nextDouble()
    var y = height * Random.nextDouble()
    var hue = 0;

    fun line() {
        context.save();

        context.beginPath();

        context.lineWidth = 20.0 * Random.nextDouble();
        context.moveTo(x, y);

        x = width * Random.nextDouble();
        y = height * Random.nextDouble();

        context.bezierCurveTo(width * Random.nextDouble(), height * Random.nextDouble(),
                width * Random.nextDouble(), height * Random.nextDouble(), x, y);

        hue += (Random.nextDouble() * 10).toInt();

        context.strokeStyle = "hsl($hue, 50%, 50%)";

        context.shadowColor = "white";
        context.shadowBlur = 10.0;

        context.stroke();

        context.restore();
    }

    fun blank() {
        context.fillStyle = "rgba(255,255,1,0.1)";
        context.fillRect(0.0, 0.0, width.toDouble(), height.toDouble());
    }

    fun run() {
        window.setInterval({ line() }, 40);
        window.setInterval({ blank() }, 100);
    }
}
//sampleStart
fun main(args: Array<String>) {
     FancyLines().run()
}
//sampleEnd
```

</div>

Use `data-js-libs` with a comma-separated list of URLs to specify additional javascript libraries to load.

```html
<div class="kotlin-code" data-target-platform="js" data-js-libs="https://unpkg.com/moment@2">
```

<div class="kotlin-code" data-target-platform="js" data-js-libs="https://unpkg.com/moment@2">

```kotlin
external fun moment(): dynamic

fun main() {
    val startOfDay = moment().startOf("day").fromNow()
    println("The start of the day was $startOfDay")
}
```

</div>

## Manual initialization

If you want to init Kotlin Playground manually - omit `data-selector` attribute and call it when it's needed:

```html
<script src="https://unpkg.com/kotlin-playground@1"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  KotlinPlayground('.kotlin-playground');
});
</script>
```
Add additional hidden files:
Put your files between `<textarea>` tag with class `hidden-dependency`.

Look at example:


```html

<div class="kotlin-playground">
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
</div>
```

<button onclick="KotlinPlayground('.kotlin-code-2',{ onChange: (code)=> {console.log(code)}}); this.disabled = true; document.getElementById('kotlin-example').style.display = 'block';">Create</button>

<div id="kotlin-example" class="kotlin-code-2" style="display: none;">

```text
import cat.Cat

fun main(args: Array<String>) {
//sampleStart
    val cat = Cat("Kitty")
    println(cat.name)
//sampleEnd
}
```
  <textarea class="hidden-dependency">
    package cat
    class Cat(val name: String) 
  </textarea>

</div>

</body>
</html>
