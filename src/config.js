import {getConfigFromElement, getCurrentScript} from './utils';
import TargetPlatform from "./target-platform";

const currentScript = getCurrentScript();

export const RUNTIME_CONFIG = {...getConfigFromElement(currentScript)};

/**
 * API Paths
 *
 * @type {{COMPILE: string, COMPLETE: string, VERSIONS: string, JQUERY: string, KOTLIN_JS: string}}
 */
export const API_URLS = {
  server: RUNTIME_CONFIG.server || __WEBDEMO_URL__,
  COMPILE(platform, version) {
    let url;
    switch (platform) {
      case TargetPlatform.JAVA:
        url = `http://localhost:8080/api/${version}/compiler/run`;
        break;
      case TargetPlatform.CANVAS:
        url = `${this.server}/api/${version}/compiler/translate`;
        break;
      case TargetPlatform.JS:
        url = `${this.server}/api/${version}/compiler/translate`;
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
    return `http://localhost:8080/api/${version}/compiler/highlight`;
  },
  COMPLETE(version) {
    return `http://localhost:8080/api/${version}/compiler/complete`;
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
