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

Or theme `kotlin-dark`

<div class="kotlin-code" data-highlight-only theme="kotlin-dark">

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

You can use JS IR compiler also.

```html
<div class="kotlin-code" data-target-platform="js-ir"></div>
```
<div class="kotlin-code" data-target-platform="js-ir">

```kotlin
fun mul(a: Int, b: Int): Int {
    return a * b
}

fun main(args: Array<String>) {
    print(mul(-2, 4))
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


<div class="kotlin-code" data-crosslink="disabled" data-target-platform="js" data-js-libs="https://unpkg.com/moment@2">

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

Themes: 

<div class="kotlin-code"  theme="idea">
```kotlin
  fun main(args: Array<String>) {
  //sampleStart
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
  //sampleEnd
  }
```
</div>

<div class="kotlin-code"  theme="darcula  ">
```kotlin
  fun main(args: Array<String>) {
  //sampleStart
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
  //sampleEnd
  }
```
</div>

<div class="kotlin-code"  theme="default">
```kotlin
  fun main(args: Array<String>) {
  //sampleStart
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
  //sampleEnd
  }
```
</div>

<style>.kotlin-docs.executable-fragment{border:0 transparent}.kotlin-docs .cm-s-kotlin-docs{font-family:SFMono-Regular,Consolas,Liberation Mono,Menlo,Courier,monospace}.kotlin-docs .cm-s-kotlin-docs,.kotlin-docs .cm-s-kotlin-docs.CodeMirror .CodeMirror-linenumber,.kotlin-docs .cm-s-kotlin-docs.CodeMirror pre.CodeMirror-line,.kotlin-docs .cm-s-kotlin-docs.CodeMirror pre.CodeMirror-line-like{color:#999;font-size:15px;line-height:24px}.kotlin-docs .cm-s-kotlin-docs.CodeMirror{border-top-left-radius:8px;border-top-right-radius:8px;background:#f5f5f5}.kotlin-docs .js-code-output-executor,.kotlin-docs .output-wrapper{border-bottom-right-radius:8px;border-bottom-left-radius:8px;background:#f4f4f4}.kotlin-docs .js-code-output-executor{min-height:8px;border:0}.kotlin-docs .output-wrapper{border-top:1px solid rgba(39,40,44,.2);border-bottom:0}.kotlin-docs .run-button{top:8px;right:9px;width:24px;height:24px;background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 12L5 4v16l14-8z' fill='%236E4BF4'/%3E%3C/svg%3E");background-position:50%;background-size:24px}.kotlin-docs .run-button:hover{opacity:.8}.kotlin-docs .code-area .fold-button{width:24px;height:24px;background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 11.005v2.103h-6.013L12.988 19h-2.117l.001-5.892H5v-2.103h5.872V5h2.114l.002 6.005H19z' fill='%2327282C' fill-opacity='.75'/%3E%3C/svg%3E");background-position:50%;background-size:24px}.kotlin-docs .code-area .fold-button:hover{background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23F4F4F4'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 11.005v2.103h-6.013L12.988 19h-2.117l.001-5.892H5v-2.103h5.872V5h2.114l.002 6.005H19z' fill='%2327282C'/%3E%3C/svg%3E")}.kotlin-docs .code-area._unfolded .fold-button{top:-13px;left:calc(50% - 11px);transform:rotate(-45deg)}.kotlin-docs .console-close{top:7px;right:6px;opacity:.75;width:24px;height:24px;cursor:pointer;background:url("data:image/svg+xml,%3Csvg width='24' height='25' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17 14.1a4.12 4.12 0 00-4.18-3.6H11v5l-7-6 7-6v5h1.79A6.15 6.15 0 0119 13.71a6 6 0 01-6 6.79H7v-2h6a4 4 0 004-4.4z' fill='%2327282C'/%3E%3C/svg%3E") 50% no-repeat;background-size:24px}.kotlin-docs .console-close:hover{opacity:1}.kotlin-docs .console-icon.attention,.kotlin-docs .ERRORgutter,.kotlin-docs .WARNINGgutter{width:16px;height:16px;background:url("data:image/svg+xml,%3Csvg width='16' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.972 2.552l5.858 10.145c.397.687.072 1.25-.722 1.25H2.798A1.337 1.337 0 011.64 11.94l5.422-9.39a1.103 1.103 0 011.91.001zm.126 8.872a1.081 1.081 0 10-2.162 0 1.081 1.081 0 002.162 0zM7 5.947l1.744-.65v3.604h-1.44L7 5.947z' fill='%23EF341E'/%3E%3C/svg%3E") 50% no-repeat;background-size:16px}.kotlin-docs .console-icon.attention{margin-left:-20px;background-position:-1px -1px}.kotlin-docs .ERRORgutter,.kotlin-docs .WARNINGgutter{margin-top:5px;margin-left:5px}.kotlin-docs .WARNINGgutter{background-image:url("data:image/svg+xml,%3Csvg width='16' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.972 2.552l5.858 10.145c.397.687.072 1.25-.722 1.25H2.798A1.337 1.337 0 011.64 11.94l5.422-9.39a1.103 1.103 0 011.91.001zm.126 8.872a1.081 1.081 0 10-2.162 0 1.081 1.081 0 002.162 0zM7 5.947l1.744-.65v3.604h-1.44L7 5.947z' fill='%2327282C' fill-opacity='.5'/%3E%3C/svg%3E")}.kotlin-docs .errors-and-warnings-gutter{width:24px}.kotlin-docs .code-output{padding-bottom:15px;padding-left:30px}.kotlin-docs div[label]:hover:after{display:inline-flex;margin-top:-1rem;margin-left:1rem;padding:4px 6px;border-radius:2px;content:attr(label);white-space:pre;color:#fff;background:#3c3d40;font-size:13px;line-height:20px}.kotlin-docs .CodeMirror-linebackground.unmodifiable-line{background:rgba(39,40,44,.05)}.kotlin-docs .cm-s-kotlin-docs .CodeMirror-lines{margin:0;padding:12px 0}.kotlin-docs .cm-s-kotlin-docs .CodeMirror-gutters{border:0 transparent}.kotlin-docs .cm-s-kotlin-docs .cm-type{color:#27282c}.kotlin-docs .cm-s-kotlin-docs span.cm-keyword{color:#07a;font-weight:700}.kotlin-docs .cm-s-kotlin-docs span.cm-operator{color:#9a6e3a}.kotlin-docs .cm-s-kotlin-docs span.cm-number{color:#905}.kotlin-docs .cm-s-kotlin-docs span.cm-comment{color:#708090}.kotlin-docs .cm-s-kotlin-docs .cm-variable,.kotlin-docs .cm-s-kotlin-docs .cm-variable-2,.kotlin-docs .cm-s-kotlin-docs .cm-variable-3,.kotlin-docs .cm-s-kotlin-docs span.cm-def,.kotlin-docs .cm-s-kotlin-docs span.cm-property{color:#27282c}.kotlin-docs .cm-s-kotlin-docs span.cm-string,.kotlin-docs .cm-s-kotlin-docs span.cm-string-2{color:#690;font-weight:700}</style>
<div class="kotlin-code"  theme="kotlin-docs">
```kotlin
  fun main(args: Array<String>) {
  //sampleStart
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
  //sampleEnd
  }
```
</div>

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
