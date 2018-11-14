import {getConfigFromElement, getCurrentScript} from './utils';

const currentScript = getCurrentScript();

export const RUNTIME_CONFIG = {...getConfigFromElement(currentScript)};

const WEBDEMO_URL = RUNTIME_CONFIG.server || __WEBDEMO_URL__;

/**
 * API Paths
 *
 * @type {{COMPILE: string, COMPLETE: string, VERSIONS: string, JQUERY: string, KOTLIN_JS: string}}
 */
export const API_URLS = {
  COMPILE:    `${WEBDEMO_URL}/kotlinServer?type=run&runConf=`,
  HIGHLIGHT:  `${WEBDEMO_URL}/kotlinServer?type=highlight&runConf=`,
  COMPLETE:   `${WEBDEMO_URL}/kotlinServer?type=complete&runConf=`,
  VERSIONS:   `${WEBDEMO_URL}/kotlinServer?type=getKotlinVersions`,
  JQUERY:     `${WEBDEMO_URL}/static/lib/jquery/dist/jquery.min.js`,
  KOTLIN_JS:  `${WEBDEMO_URL}/static/kotlin/`
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
