import './index.scss'
import Map from 'es6-map/polyfill';
import {API_URLS} from "../config";
import TargetPlatform from "../target-platform";
import {showJsException} from "../view/output-view";
import {processingHtmlBrackets} from "../utils";

const jsExecutors = new Map();

const INIT_SCRIPT = "if(kotlin.BufferedOutput!==undefined){kotlin.out = new kotlin.BufferedOutput()}" +
  "else{kotlin.kotlin.io.output = new kotlin.kotlin.io.BufferedOutput()}";

class JsExecutor {
  constructor(kotlinVersion, jsLibs, node, platform) {
    this.kotlinVersion = kotlinVersion;
    if (platform === TargetPlatform.JS) this.reloadIframeScripts(jsLibs, node)
  }

  async executeJsCode(jsCode, jsLibs, platform, node, outputHeight, theme) {
    if (platform === TargetPlatform.CANVAS) {
      this.iframe.style.display = "block";
      if (outputHeight) this.iframe.style.height = `${outputHeight}px`;
    }
    const codeOutput = await this.execute(jsCode, jsLibs, theme);
    if (platform === TargetPlatform.JS) {
      this.reloadIframeScripts(jsLibs, node);
    }
    return codeOutput;
  }

  _initializeKotlin() {
    setTimeout(() => {
      try {
        this.iframe.contentWindow.eval(INIT_SCRIPT);
      } catch (e) {
        this._initializeKotlin()
      }
    }, 3000);
  }

  async execute(jsCode, jsLibs, theme) {
    const loadedScripts = (this.iframe.contentDocument || this.iframe.document).getElementsByTagName('script').length;
    // 2 scripts by default: INIT_SCRIPT + JQuery
    if (loadedScripts === jsLibs.size + 2) {
      try {
        const output = this.iframe.contentWindow.eval(jsCode);
        return output ? `<span class="standard-output ${theme}">${processingHtmlBrackets(output)}</span>` : "";
      } catch (e) {
        let exceptionOutput = showJsException(e);
        return `<span class="error-output">${exceptionOutput}</span>`;
      }
    }
    await this.timeout(400);
    return await this.execute(jsCode, jsLibs)
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  reloadIframeScripts(jsLibs, node) {
    if (this.iframe !== undefined) {
      node.removeChild(this.iframe)
    }
    const iframe = document.createElement('iframe');
    iframe.className = "k2js-iframe";
    node.appendChild(iframe);
    let loadedScriptCount = 0;
    this.iframe = iframe;
    let iframeDoc = this.iframe.contentDocument || this.iframe.document;
    const head = iframeDoc.getElementsByTagName("head")[0];
    const body = iframeDoc.getElementsByTagName("body")[0];
    body.style = "margin: 0; overflow: hidden;";

    function internalLoaded( event) {
      loadedScriptCount++;
      if (loadedScriptCount === jsLibs.size + 1){
        const initScript = iframeDoc.createElement("script");
        initScript.innerHTML = INIT_SCRIPT;
        head.appendChild(initScript);
      }
    }

    function addScript(lib) {
      const script = iframeDoc.createElement('script');
      script.src = lib;
      script.defer = true;
      script.async = false;
      script.onload = internalLoaded;
      head.appendChild(script)
    }

    const kotlinScript = API_URLS.KOTLIN_JS + `${this.kotlinVersion}/kotlin.js`;
    addScript(kotlinScript);
    for (let lib of jsLibs) {
      addScript(lib)
    }
  }
}

function getJsExecutor(kotlinVersion, jsLibs, node, platform) {
  let executor;
  if (platform === TargetPlatform.CANVAS) {
    return new JsExecutor(kotlinVersion, jsLibs, node, platform);
  }
  if (jsExecutors.has(kotlinVersion)) {
    executor = jsExecutors.get(kotlinVersion);
  } else {
    executor = new JsExecutor(kotlinVersion, jsLibs, node, platform);
    jsExecutors.set(kotlinVersion, executor);
  }
  return executor;
}

export default getJsExecutor;
