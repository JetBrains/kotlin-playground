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

<div class="kotlin-code" data-target-platform="canvas">

```kotlin
package hello

import jquery.*
import org.w3c.dom.CanvasRenderingContext2D
import org.w3c.dom.HTMLCanvasElement
import kotlin.browser.document
import kotlin.browser.window
import kotlin.js.Math

val canvas = initializeCanvas()
fun initializeCanvas(): HTMLCanvasElement {
    val canvas = document.createElement("canvas") as HTMLCanvasElement
    val context = canvas.getContext("2d") as CanvasRenderingContext2D
    context.canvas.width  = window.innerWidth
    context.canvas.height = window.innerHeight
    document.body!!.appendChild(canvas)
    return canvas
}
val context: CanvasRenderingContext2D
    get() {
        return canvas.getContext("2d") as CanvasRenderingContext2D
    }


val width: Int
    get() {
        return canvas.width
    }

val height: Int
    get() {
        return canvas.height
    }


// class representing a floating text
class HelloKotlin() {
    var relX = 0.2 + 0.2 * Math.random()
    var relY = 0.4 + 0.2 * Math.random()

    val absX: Double
        get() = (relX * width)
    val absY: Double
        get() = (relY * height)

    var relXVelocity = randomVelocity()
    var relYVelocity = randomVelocity()


    val message = "Hello, Kotlin!"
    val textHeightInPixels = 20
    init {
        context.font = "bold ${textHeightInPixels}px Georgia, serif"
    }
    val textWidthInPixels = context.measureText(message).width

    fun draw() {
        context.save()
        move()
        // if you using chrome chances are good you wont see the shadow
        context.shadowColor = "#000000"
        context.shadowBlur = 5.0
        context.shadowOffsetX = -4.0
        context.shadowOffsetY = 4.0
        context.fillStyle = "rgb(242,160,110)"
        context.fillText(message, absX, absY)
        context.restore()
    }

    fun move() {
        val relTextWidth = textWidthInPixels / width
        if (relX > (1.0 - relTextWidth - relXVelocity.abs) || relX < relXVelocity.abs) {
            relXVelocity *= -1
        }
        val relTextHeight = textHeightInPixels / height
        if (relY > (1.0 - relYVelocity.abs) || relY < relYVelocity.abs + relTextHeight) {
            relYVelocity *= -1
        }
        relX += relXVelocity
        relY += relYVelocity
    }

    fun randomVelocity() = 0.03 * Math.random() * (if (Math.random() < 0.5) 1 else -1)


    val Double.abs: Double
        get() = if (this > 0) this else -this
}

fun renderBackground() {
    context.save()
    context.fillStyle = "#5C7EED"
    context.fillRect(0.0, 0.0, width.toDouble(), height.toDouble())
    context.restore()
}
//sampleStart
fun main(args: Array<String>) {
      val interval = 50
      // we pass a literal that constructs a new HelloKotlin object
      val logos = Array(3) {
          HelloKotlin()
      }

      window.setInterval({
          renderBackground()
          for (logo in logos) {
              logo.draw()
          }
      }, interval)

}
//sampleEnd
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

If you want to hide test classes in you code snippet just set the attribute `folded-button` to `false` value.

Also you can mark arbitrary code by putting it between `[mark]your code[/mark]`.

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


<div class="kotlin-code" data-target-platform="canvas">

```kotlin
package fancylines


import jquery.*
import org.w3c.dom.CanvasRenderingContext2D
import org.w3c.dom.HTMLCanvasElement
import kotlin.browser.document
import kotlin.browser.window
import kotlin.js.Math



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
    var x = width * Math.random()
    var y = height * Math.random()
    var hue = 0;

    fun line() {
        context.save();

        context.beginPath();

        context.lineWidth = 20.0 * Math.random();
        context.moveTo(x, y);

        x = width * Math.random();
        y = height * Math.random();

        context.bezierCurveTo(width * Math.random(), height * Math.random(),
                width * Math.random(), height * Math.random(), x, y);

        hue += (Math.random() * 10).toInt();

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

</body>
</html>
