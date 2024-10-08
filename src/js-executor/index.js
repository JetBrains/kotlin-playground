import './index.scss'
import {API_URLS} from "../config";
import {showJsException} from "../view/output-view";
import {processingHtmlBrackets} from "../utils";
import { TargetPlatforms } from "../utils/platforms";

const INIT_SCRIPT = "if(kotlin.BufferedOutput!==undefined){kotlin.out = new kotlin.BufferedOutput()}" +
  "else{kotlin.kotlin.io.output = new kotlin.kotlin.io.BufferedOutput()}";

const INIT_SCRIPT_IR = "var kotlin = kotlin || {}; kotlin.isRewrite = true;";

const normalizeJsVersion = version => {
  const match = version.match(/-M\d+$/);

  // For EAP releases like 1.4-M1
  if (match && version.substring(0, match.index).match(/^\d+\.\d+$/)) {
    return version.substring(0, match.index) + '.0' + match[0]
  }

  return version;
};

export default class JsExecutor {
  constructor(kotlinVersion) {
    this.kotlinVersion = kotlinVersion;
  }

  async executeJsCode(jsCode, wasm, jsLibs, platform, outputHeight, theme, onError) {
    if (platform === TargetPlatforms.SWIFT_EXPORT) {
      return `<span class="standard-output ${theme}">${jsCode}</span>`;
    }
    if (platform === TargetPlatforms.CANVAS) {
      this.iframe.style.display = "block";
      if (outputHeight) this.iframe.style.height = `${outputHeight}px`;
    }
    if (platform === TargetPlatforms.WASM) {
      return await this.executeWasm(jsCode, wasm, theme, onError)
    }
    return await this.execute(jsCode, jsLibs, theme, onError, platform);
  }

  async execute(jsCode, jsLibs, theme, onError, platform) {
    const loadedScripts = (this.iframe.contentDocument || this.iframe.document).getElementsByTagName('script').length;
    let offset;
    if (platform === TargetPlatforms.JS_IR) {
      // 1 scripts by default: INIT_SCRIPT_IR
      offset = 1;
    } else {
      // 2 scripts by default: INIT_SCRIPT + kotlin stdlib
      offset = 2;
    }
    if (loadedScripts === jsLibs.size + offset) {
      try {
        const output = this.iframe.contentWindow.eval(jsCode);
        return output ? `<span class="standard-output ${theme}">${processingHtmlBrackets(output)}</span>` : "";
      } catch (e) {
        if (onError) onError();
        let exceptionOutput = showJsException(e);
        return `<span class="error-output">${exceptionOutput}</span>`;
      }
    }
    await this.timeout(400);
    return await this.execute(jsCode, jsLibs, theme, onError, platform);
  }

  async executeWasm(jsCode, wasmCode, theme, onError) {
    try {
      const newCode = `
          class BufferedOutput {
            constructor() {
              this.buffer = ""
            }
          }
          export const bufferedOutput = new BufferedOutput()
          ` +
        jsCode
          .replace(
            "instantiateStreaming(fetch(wasmFilePath)",
            "instantiate(Uint8Array.from(atob(" + "'" + wasmCode + "'" + "), c => c.charCodeAt(0))"
          )
          .replace(
            "const importObject = {",
            "js_code['kotlin.io.printImpl'] = (message) => bufferedOutput.buffer += message\n" +
            "js_code['kotlin.io.printlnImpl'] = (message) => {bufferedOutput.buffer += message;bufferedOutput.buffer += \"\\n\"}\n" +
            "const importObject = {"
          )
      const exports = await import(/* webpackIgnore: true */ 'data:text/javascript;base64,' + btoa(newCode));
      await exports.instantiate()
      const output = exports.bufferedOutput.buffer
      exports.bufferedOutput.buffer = ""
      return output ? `<span class="standard-output ${theme}">${processingHtmlBrackets(output)}</span>` : "";
    } catch (e) {
      if (onError) onError();
      let exceptionOutput = showJsException(e);
      return `<span class="error-output">${exceptionOutput}</span>`;
    }
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  reloadIframeScripts(jsLibs, node, targetPlatform) {
    if (this.iframe !== undefined) {
      node.removeChild(this.iframe)
    }
    this.iframe = document.createElement('iframe');
    this.iframe.className = "k2js-iframe";
    node.appendChild(this.iframe);
    let iframeDoc = this.iframe.contentDocument || this.iframe.document;
    iframeDoc.open();
    if (targetPlatform === TargetPlatforms.JS || targetPlatform === TargetPlatforms.CANVAS) {
      const kotlinScript = API_URLS.KOTLIN_JS + `${normalizeJsVersion(this.kotlinVersion)}/kotlin.js`;
      iframeDoc.write("<script src='" + kotlinScript + "'></script>");
    }
    if (targetPlatform !== TargetPlatforms.WASM && targetPlatform !== TargetPlatforms.SWIFT_EXPORT) {
      for (let lib of jsLibs) {
        iframeDoc.write("<script src='" + lib + "'></script>");
      }
      if (targetPlatform === TargetPlatforms.JS_IR) {
        iframeDoc.write(`<script>${INIT_SCRIPT_IR}</script>`);
      } else {
        iframeDoc.write(`<script>${INIT_SCRIPT}</script>`);
      }
    }
    iframeDoc.write('<body style="margin: 0; overflow: hidden;"></body>');
    iframeDoc.close();
  }
}
