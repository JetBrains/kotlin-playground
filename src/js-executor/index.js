import './index.scss'
import {API_URLS} from "../config";
import TargetPlatform from "../target-platform";
import {showJsException} from "../view/output-view";
import {processingHtmlBrackets} from "../utils";

const INIT_SCRIPT = "if(kotlin.BufferedOutput!==undefined){kotlin.out = new kotlin.BufferedOutput()}" +
  "else{kotlin.kotlin.io.output = new kotlin.kotlin.io.BufferedOutput()}";

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

  async executeJsCode(jsCode, jsLibs, platform, outputHeight, theme, onError) {
    if (platform === TargetPlatform.CANVAS) {
      this.iframe.style.display = "block";
      if (outputHeight) this.iframe.style.height = `${outputHeight}px`;
    }
    return await this.execute(jsCode, jsLibs, theme, onError);
  }

  async execute(jsCode, jsLibs, theme, onError) {
    const loadedScripts = (this.iframe.contentDocument || this.iframe.document).getElementsByTagName('script').length;
    // 2 scripts by default: INIT_SCRIPT + kotlin stdlib
    if (loadedScripts === jsLibs.size + 2) {
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
    return await this.execute(jsCode, jsLibs, theme, onError);
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  reloadIframeScripts(jsLibs, node) {
    if (this.iframe !== undefined) {
      node.removeChild(this.iframe)
    }
    this.iframe = document.createElement('iframe');
    this.iframe.className = "k2js-iframe";
    node.appendChild(this.iframe);
    let iframeDoc = this.iframe.contentDocument || this.iframe.document;
    iframeDoc.open();
    const kotlinScript = API_URLS.KOTLIN_JS + `${normalizeJsVersion(this.kotlinVersion)}/kotlin.js`;
    iframeDoc.write("<script src='" + kotlinScript + "'></script>");
    for (let lib of jsLibs) {
      iframeDoc.write("<script src='" + lib + "'></script>");
    }
    iframeDoc.write(`<script>${INIT_SCRIPT}</script>`);
    iframeDoc.write('<body style="margin: 0; overflow: hidden;"></body>');
    iframeDoc.close();
  }
}
