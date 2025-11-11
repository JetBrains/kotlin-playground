import './index.scss';
import { API_URLS } from '../config';
import { showJsException } from '../view/output-view';
import { processingHtmlBrackets } from '../utils';
import { isJsLegacy, isWasmRelated, TargetPlatforms } from '../utils/platforms';
import { executeWasmCode } from './execute-es-module';

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
  }

  async executeJsCode(
    jsCode,
    wasm,
    jsLibs,
    platform,
    outputHeight,
    theme,
    onError,
    compilerVersion,
  ) {
    if (platform === TargetPlatforms.SWIFT_EXPORT) {
      return `<span class='standard-output ${theme}'><div class='result-code'>${jsCode}</span>`;
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

        const result = await this.executeWasm(
          jsCode,
          wasm,
          executeWasmCode,
          theme,
          processError
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
    return await this.execute(
      jsCode,
      jsLibs,
      theme,
      onError,
      platform,
      compilerVersion,
    );
  }

  async execute(jsCode, jsLibs, theme, onError, platform, compilerVersion) {
    const loadedScripts = (
      this.iframe.contentDocument || this.iframe.document
    ).getElementsByTagName('script').length;
    let offset = 1; // 1 scripts by default: INIT_SCRIPT_IR
    if (isJsLegacy(platform, compilerVersion)) {
      // 2 scripts by default: INIT_SCRIPT + kotlin stdlib
      offset = 2;
    }
    if (loadedScripts === jsLibs.size + offset) {
      try {
        const output = this.iframe.contentWindow.eval(jsCode);
        return output
          ? `<span class='standard-output ${theme}'>${processingHtmlBrackets(
              output,
            )}</span>`
          : '';
      } catch (e) {
        if (onError) onError();
        let exceptionOutput = showJsException(e);
        return `<span class='error-output'>${exceptionOutput}</span>`;
      }
    }
    await this.timeout(400);
    return await this.execute(
      jsCode,
      jsLibs,
      theme,
      onError,
      platform,
      compilerVersion,
    );
  }

  async executeWasm(
    jsCode,
    wasmCode,
    executor,
    theme,
    onError,
  ) {
    try {
      const exports = await executor(
        this.iframe.contentWindow,
        jsCode,
        wasmCode,
      );
      await exports.instantiate();
      const bufferedOutput = this.iframe.contentWindow.bufferedOutput ?? exports.bufferedOutput;
      const outputString = bufferedOutput.buffer;
      bufferedOutput.buffer = '';
      return outputString
        ? `<span class='standard-output ${theme}'>${processingHtmlBrackets(
            outputString,
          )}</span>`
        : '';
    } catch (e) {
      if (onError) onError();
      let exceptionOutput = showJsException(e);
      return `<span class='error-output'>${exceptionOutput}</span>`;
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
    if (isJsLegacy(targetPlatform, compilerVersion)) {
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
      iframeDoc.write(
        `<script>${isJsLegacy(targetPlatform, compilerVersion) ? INIT_SCRIPT : INIT_SCRIPT_IR}</script>`,
      );
    }
    if (targetPlatform === TargetPlatforms.COMPOSE_WASM) {
      this.iframe.height = "1000"
      iframeDoc.write(`<canvas height="1000" id="ComposeTarget"></canvas>`);
    }
    iframeDoc.write('<body style="margin: 0; overflow: hidden;"></body>');
    iframeDoc.close();
  }
}
