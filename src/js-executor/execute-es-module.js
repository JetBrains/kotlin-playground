export async function executeWasmCode(container, jsCode, wasmCode) {
  const skikoMjs = new URL("../../skiko/skiko.mjs", import.meta.url).href;
  const skikoWasm = new URL("../../skiko/skiko.wasm", import.meta.url).href;
  const skikoCode = (await (await fetch(skikoMjs)).text())
    .replace(
      "new URL(\"skiko.wasm\",import.meta.url).href",
      `'${skikoWasm}'`
    );
  const skikoImport = 'data:text/javascript;base64,' + btoa(skikoCode);
  container.wasmCode = Uint8Array.from(atob(wasmCode), c => c.charCodeAt(0));
  const newCode = `
          class BufferedOutput {
            constructor() {
              this.buffer = ""
            }
          }
          export const bufferedOutput = new BufferedOutput()

          const skikoMjs = "${skikoImport}";
          ` +
    jsCode
      .replace(
        "instantiateStreaming(fetch(wasmFilePath)",
        "instantiate(window.wasmCode"
      )
      .replace(
        "const importObject = {",
        "js_code['kotlin.io.printImpl'] = (message) => bufferedOutput.buffer += message\n" +
        "js_code['kotlin.io.printlnImpl'] = (message) => {bufferedOutput.buffer += message;bufferedOutput.buffer += \"\\n\"}\n" +
        "const importObject = {"
      )
      .replaceAll(
        "await import('./skiko.mjs')",
        "await import(skikoMjs)"
      );
  return container.eval(`import(/* webpackIgnore: true */ '${'data:text/javascript;base64,' + btoa(newCode)}');`)
}
