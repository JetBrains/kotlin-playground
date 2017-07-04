# kotlin-runcode

Self-contained component to embed in websites for running Kotlin code.

## Setup for development

Run `npm start` which will invoke `webpack` and set up an internal development server.

## Setup for end use

Run `webpack` and copy the output of the `dist` folder to your scripts folder.
Wrap any code you want in a box in a div tag. Use markdown=1 if it's markdown input.

<div class="sample" markdown="1">
```kotlin
fun main(args: Array<String>) {
   println("Hello")
}
```
</div>

All that code will appear in an editable box. If you want to highlight a specific area to focus on a specific sample, use //sampleStart and //sampleEnd

<div class="sample" markdown="1">
```kotlin
//sampleStart
fun message(input: String) {
   println(input)
}
//sampleEnd
fun main(args: Array<String>) {
   message("Hello")
}
```
</div>

