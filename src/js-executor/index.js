import './index.scss';
import {API_URLS} from '../config';
import {showJsException} from '../view/output-view';
import {processingHtmlBrackets} from '../utils';
import {isWasmRelated, TargetPlatforms} from '../utils/platforms';
import {executeJs, executeWasmCode, executeWasmCodeWithSkiko, executeWasmCodeWithStdlib} from './execute-es-module';
import {fetch} from "whatwg-fetch";

const INIT_SCRIPT =
  'if(kotlin.BufferedOutput!==undefined){kotlin.out = new kotlin.BufferedOutput()}' +
  'else{kotlin.kotlin.io.output = new kotlin.kotlin.io.BufferedOutput()}';

const INIT_SCRIPT_IR = 'var kotlin = kotlin || {}; kotlin.isRewrite = true;';

const normalizeJsVersion = (version) => {
  const match = version.match(/-M\d+$/);

  // For EAP releases like 1.4-M1
  if (match && version.substring(0, match.index).match(/^\d+\.\d+$/)) {
    return version.substring(0, match.index) + '.0' + match[0];
  }

  return version;
};

export default class JsExecutor {
  constructor(kotlinVersion) {
    this.kotlinVersion = kotlinVersion;
    this.stdlibExports = undefined;
  }

  async executeJsCode(
    jsCode,
    wasm,
    jsLibs,
    platform,
    outputHeight,
    theme,
    onError,
    additionalRequestsResults,
  ) {
    if (platform === TargetPlatforms.SWIFT_EXPORT) {
      return `<span class="standard-output ${theme}"><div class="result-code">${jsCode}</span>`;
    }
    if (platform === TargetPlatforms.CANVAS) {
      this.iframe.style.display = 'block';
      if (outputHeight) this.iframe.style.height = `${outputHeight}px`;
    }
    if (isWasmRelated(platform)) {
      if (platform === TargetPlatforms.WASM) {
        return await this.executeWasm(
          jsCode,
          wasm,
          executeWasmCode,
          theme,
          onError,
        );
      }

      if (platform === TargetPlatforms.COMPOSE_WASM) {
        let exception = false;

        const processError = () => {
          exception = true;
          return onError && onError.apply(this, arguments);
        };

        // It is necessary to work in Firefox
        // for some reason resize function in Compose does not work in Firefox in invisible block
        this.iframe.style.display = 'block';

        const additionalRequestsResult = additionalRequestsResults[0];
        const result = await this.executeWasm(
          jsCode,
          wasm,
          executeWasmCodeWithStdlib,
          theme,
          processError,
          additionalRequestsResult.stdlib,
          additionalRequestsResult.output,
        );

        if (exception) {
          this.iframe.style.display = 'none';
        } else {
          this.iframe.style.display = 'block';
          if (outputHeight) this.iframe.style.height = `${outputHeight}px`;
        }

        return result;
      }
    }
    return await this.execute(jsCode, jsLibs, theme, onError, platform);
  }

  async execute(jsCode, jsLibs, theme, onError, platform) {
    const loadedScripts = (
      this.iframe.contentDocument || this.iframe.document
    ).getElementsByTagName('script').length;
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
        return output
          ? `<span class="standard-output ${theme}">${processingHtmlBrackets(
            output,
          )}</span>`
          : '';
      } catch (e) {
        if (onError) onError();
        let exceptionOutput = showJsException(e);
        return `<span class="error-output">${exceptionOutput}</span>`;
      }
    }
    await this.timeout(400);
    return await this.execute(jsCode, jsLibs, theme, onError, platform);
  }

  async executeWasm(jsCode, wasmCode, executor, theme, onError, imports, output) {
    try {
      const exports = await executor(
        this.iframe.contentWindow,
        jsCode,
        wasmCode,
      );
      await exports.instantiate(imports);
      const bufferedOutput = output ?? exports.bufferedOutput;
      const outputString = bufferedOutput.buffer;
      bufferedOutput.buffer = '';
      return outputString
        ? `<span class="standard-output ${theme}">${processingHtmlBrackets(
          outputString,
        )}</span>`
        : '';
    } catch (e) {
      if (onError) onError();
      let exceptionOutput = showJsException(e);
      return `<span class="error-output">${exceptionOutput}</span>`;
    }
  }

  timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reloadIframeScripts(jsLibs, node, targetPlatform, compilerVersion) {
    if (this.iframe !== undefined) {
      node.removeChild(this.iframe);
    }
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'k2js-iframe';
    node.appendChild(this.iframe);
    let iframeDoc = this.iframe.contentDocument || this.iframe.document;
    iframeDoc.open();
    if (
      targetPlatform === TargetPlatforms.JS ||
      targetPlatform === TargetPlatforms.CANVAS
    ) {
      const kotlinScript =
        API_URLS.KOTLIN_JS +
        `${normalizeJsVersion(this.kotlinVersion)}/kotlin.js`;
      iframeDoc.write("<script src='" + kotlinScript + "'></script>");
    }
    if (
      !isWasmRelated(targetPlatform) &&
      targetPlatform !== TargetPlatforms.SWIFT_EXPORT
    ) {
      for (let lib of jsLibs) {
        iframeDoc.write("<script src='" + lib + "'></script>");
      }
      if (targetPlatform === TargetPlatforms.JS_IR) {
        iframeDoc.write(`<script>${INIT_SCRIPT_IR}</script>`);
      } else {
        iframeDoc.write(`<script>${INIT_SCRIPT}</script>`);
      }
    }
    if (targetPlatform === TargetPlatforms.COMPOSE_WASM) {

      const skikoExports = fetch(API_URLS.SKIKO_VERSION(), {
        method: 'GET'
      }).then(response => response.text())
        .then(version =>
          fetch(API_URLS.SKIKO_MJS(version), {
            method: 'GET',
            headers: {
              'Content-Type': 'text/javascript',
            }
          }).then(script => script.text())
            .then(script => script.replace(
              "new URL(\"skiko.wasm\",import.meta.url).href",
              `'${API_URLS.SKIKO_WASM(version)}'`
            ))
            .then(skikoCode =>
              executeJs(
                this.iframe.contentWindow,
                skikoCode,
              ))
            .then(skikoExports => fixedSkikoExports(skikoExports)))

      const stdlibExports = fetch(API_URLS.STDLIB_HASH(), {
        method: 'GET'
      }).then(response => response.text())
        .then(hash =>
          fetch(API_URLS.STDLIB_MJS(hash), {
            method: 'GET',
            headers: {
              'Content-Type': 'text/javascript',
            }
          }).then(script => script.text())
            .then(script =>
              // necessary to load stdlib.wasm before its initialization to parallelize
              // language=JavaScript
              (`const stdlibWasm = fetch('${API_URLS.STDLIB_WASM(hash)}');\n` + script).replace(
                "fetch(new URL('./stdlib.wasm',import.meta.url).href)",
                "stdlibWasm"
              ).replace(
                "(extends) => { return { extends }; }",
                "(extends_) => { return { extends_ }; }"
              ))
            .then(stdlibCode =>
              executeWasmCodeWithSkiko(
                this.iframe.contentWindow,
                stdlibCode,
              )
            )
        )

      this.stdlibExports = Promise.all([skikoExports, stdlibExports])
        .then(async ([skikoExportsResult, stdlibExportsResult]) => {
            return [
              await stdlibExportsResult.stdlib({
                "./skiko.mjs": skikoExportsResult
              }),
              stdlibExportsResult
            ]
          }
        )
        .then(([stdlibResult, outputResult]) => {
            return {
              "stdlib": stdlibResult.exports,
              "output": outputResult.bufferedOutput
            }
          }
        )

      this.iframe.height = "1000"
      iframeDoc.write(`<canvas height="1000" id="ComposeTarget"></canvas>`);
    }
    iframeDoc.write('<body style="margin: 0; overflow: hidden;"></body>');
    iframeDoc.close();
  }
}

function fixedSkikoExports(skikoExports) {
  return {
    ...skikoExports,
    org_jetbrains_skia_Bitmap__1nGetPixmap: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_Bitmap__1nIsVolatile: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_Bitmap__1nSetVolatile: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_TextBlobBuilderRunHandler__1nMake: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_TextBlobBuilderRunHandler__1nMakeBlob: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    },
    org_jetbrains_skia_svg_SVGCanvasKt__1nMake: function () {
      console.log("org_jetbrains_skia_TextBlobBuilderRunHandler__1nGetFinalizer")
    }
  }
}
