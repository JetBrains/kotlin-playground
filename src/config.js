import {getConfigFromElement, getCurrentScript} from './utils';

const currentScript = getCurrentScript();

export const RUNTIME_CONFIG = {...getConfigFromElement(currentScript)};

/**
 * API Paths
 *
 * @type {{COMPILE: string, COMPLETE: string, VERSIONS: string, JQUERY: string, KOTLIN_JS: string}}
 */
export const API_URLS = {
  server: RUNTIME_CONFIG.server || __WEBDEMO_URL__,
  get COMPILE() {
    return `${this.server}/kotlinServer?type=run&runConf=`;
  },
  get HIGHLIGHT() {
    return `${this.server}/kotlinServer?type=highlight&runConf=`;
  },
  get COMPLETE() {
    return `${this.server}/kotlinServer?type=complete&runConf=`;
  },
  get VERSIONS() {
    return `${this.server}/kotlinServer?type=getKotlinVersions`;
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
