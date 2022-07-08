import {getConfigFromElement, getCurrentScript} from './utils';
import TargetPlatform from "./target-platform";

const currentScript = getCurrentScript();

export const RUNTIME_CONFIG = {...getConfigFromElement(currentScript)};

/**
 * API Paths
 *
 * @type {{COMPILE: string, COMPLETE: string, VERSIONS: string, JQUERY: string, KOTLIN_JS: string, WITH_DCE: this}}
 */
export const API_URLS = {
  server: RUNTIME_CONFIG.server || __WEBDEMO_URL__,
  WITH_DCE(dce) {
    const self = this;
    return {
      ...this,
      COMPILE(...args) {
        let url = self.COMPILE(...args);
        if (url.includes("?")) {
          url += "&"
        }
        url += "dce=" + Boolean(dce)
        return url
      }
    };
  },
  COMPILE(platform, version) {
    let url;

    switch (platform) {
      case TargetPlatform.JAVA:
        url = `${this.server}/api/${version}/compiler/run`;
        break;
      case TargetPlatform.CANVAS:
        url = `${this.server}/api/${version}/compiler/translate`;
        break;
      case TargetPlatform.JS:
        url = `${this.server}/api/${version}/compiler/translate`;
        break;
      case TargetPlatform.JS_IR:
        url = `${this.server}/api/${version}/compiler/translate?ir=true`;
        break;
      case TargetPlatform.JUNIT:
        url = `${this.server}/api/${version}/compiler/test`;
        break;
      default:
        console.warn(`Unknown ${platform.id} , used by default JVM`)
        url = `${this.server}/api/${version}/compiler/run`;
        break;
    }

    return url;
  },

  HIGHLIGHT(version) {
    return `${this.server}/api/${version}/compiler/highlight`;
  },
  COMPLETE(version) {
    return `${this.server}/api/${version}/compiler/complete`;
  },
  get VERSIONS() {
    return `${this.server}/versions`;
  },
  get JQUERY() {
    return `https://cdn.jsdelivr.net/npm/jquery@1/dist/jquery.min.js`;
  },
  get KOTLIN_JS() {
    return `https://cdn.jsdelivr.net/npm/kotlin@`;
  }
};

/**
 * @typedef {Object} KotlinRunCodeConfig
 */
export default {
  selector: 'code',

  /**
   * Will be calculated according to user defined `data-min-compiler-version`
   * attribute and WebDemo API response
   */
  compilerVersion: undefined
}
