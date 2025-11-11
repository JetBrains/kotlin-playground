import {API_URLS} from "../config";

export async function executeWasmCode(container, jsCode, wasmCode) {
  const newCode = prepareJsCode(jsCode);
  return execute(container, newCode, wasmCode);
}

function execute(container, jsCode, wasmCode) {
  container.wasmCode = Uint8Array.from(atob(wasmCode), c => c.charCodeAt(0));
  return executeJs(container, jsCode);
}

function executeJs(container, jsCode) {
  return container.eval(`import(/* webpackIgnore: true */ '${'data:text/javascript;base64,' + btoa(jsCode)}');`)
}

function prepareJsCode(jsCode) {
  const re = /instantiateStreaming\(fetch\(new URL\('([^']*)',\s*import\.meta\.url\)\.href\),\s*importObject\s*,\s*\{\s*builtins\s*:\s*\[''\]\s*\}\s*\)\)\.instance;/g;

  return `
          class BufferedOutput {
            constructor() {
              this.buffer = ""
            }
          }
          export const bufferedOutput = new BufferedOutput()
          ` +
    jsCode
      .replaceAll(
        "await import('./",
        "await import('" + API_URLS.composeResources + "/"
      )
      .replaceAll(
        "%3",
        "%253"
      )
      .replace(
        "instantiateStreaming(fetch(wasmFilePath), importObject)).instance;",
        "instantiate(window.wasmCode, importObject)).instance;\nwindow.wasmCode = undefined;"
      )
      .replace(
        re,
        "instantiate(window.wasmCode, importObject)).instance;\nwindow.wasmCode = undefined;"
      )
      .replace(
        "const importObject = {",
        "js_code['kotlin.io.printImpl'] = (message) => bufferedOutput.buffer += message\n" +
        "js_code['kotlin.io.printlnImpl'] = (message) => {bufferedOutput.buffer += message;bufferedOutput.buffer += \"\\n\"}\n" +
        "const importObject = {"
      );
}
