export async function executeWasmCode(container, jsCode, wasmCode) {
  const newCode = prepareJsCode(jsCode);
  return execute(container, newCode, wasmCode);
}

export async function executeWasmCodeWithSkiko(container, jsCode, wasmCode) {
  const skikoMjs = new URL("../../skiko/skiko.mjs", import.meta.url).href;
  const skikoWasm = new URL("../../skiko/skiko.wasm", import.meta.url).href;
  const skikoCode = (await (await fetch(skikoMjs)).text())
    .replace(
      "new URL(\"skiko.wasm\",import.meta.url).href",
      `'${skikoWasm}'`
    );
  const skikoImport = 'data:text/javascript;base64,' + btoa(skikoCode);
  const newCode = `
    const skikoMjs = "${skikoImport}";
    ` + prepareJsCode(jsCode)
    .replaceAll(
      "await import('./skiko.mjs')",
      "await import(skikoMjs)"
    );
  return execute(container, newCode, wasmCode);
}

function execute(container, jsCode, wasmCode) {
  container.wasmCode = Uint8Array.from(atob(wasmCode), c => c.charCodeAt(0));
  return container.eval(`import(/* webpackIgnore: true */ '${'data:text/javascript;base64,' + btoa(jsCode)}');`)
}

function prepareJsCode(jsCode) {
  return `
          class BufferedOutput {
            constructor() {
              this.buffer = ""
            }
          }
          export const bufferedOutput = new BufferedOutput()
          ` +
    jsCode
      .replace(
        "instantiateStreaming(fetch(wasmFilePath), importObject)).instance;",
        "instantiate(window.wasmCode, importObject)).instance;\nwindow.wasmCode = undefined;"
      )
      .replace(
        "const importObject = {",
        "js_code['kotlin.io.printImpl'] = (message) => bufferedOutput.buffer += message\n" +
        "js_code['kotlin.io.printlnImpl'] = (message) => {bufferedOutput.buffer += message;bufferedOutput.buffer += \"\\n\"}\n" +
        "const importObject = {"
      );
}
