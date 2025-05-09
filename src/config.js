import { getConfigFromElement, getCurrentScript } from './utils';
import { TargetPlatforms } from './utils/platforms';

const currentScript = getCurrentScript();

export const RUNTIME_CONFIG = { ...getConfigFromElement(currentScript) };

/**
 * API Paths
 *
 * @type {{COMPILE: string, COMPLETE: string, VERSIONS: string, JQUERY: string, KOTLIN_JS: string}}
 */
export const API_URLS = {
  server: (RUNTIME_CONFIG.server || __WEBDEMO_URL__).replace(/\/$/, ''),
  composeServer: 'https://compose-stage.sandbox.intellij.net'.replace(
    /\/$/,
    '',
  ),

  COMPILE(platform, version) {
    let url;

    switch (platform) {
      case TargetPlatforms.JAVA:
        url = `${this.server}/api/${version}/compiler/run`;
        break;
      case TargetPlatforms.CANVAS:
        url = `${this.server}/api/${version}/compiler/translate`;
        break;
      case TargetPlatforms.JS:
        url = `${this.server}/api/${version}/compiler/translate`;
        break;
      case TargetPlatforms.JS_IR:
        url = `${this.server}/api/${version}/compiler/translate?ir=true`;
        break;
      case TargetPlatforms.WASM:
        url = `${this.server}/api/${version}/compiler/translate?ir=true&compiler=wasm`;
        break;
      case TargetPlatforms.COMPOSE_WASM:
        url = `${this.composeServer}/api/compiler/translate?compiler=${TargetPlatforms.COMPOSE_WASM.id}`;
        break;
      case TargetPlatforms.JUNIT:
        url = `${this.server}/api/${version}/compiler/test`;
        break;
      case TargetPlatforms.SWIFT_EXPORT:
        url = `${this.server}/api/${version}/${TargetPlatforms.SWIFT_EXPORT.id}/compiler/translate?compiler=swift-export`;
        break;
      default:
        console.warn(`Unknown ${platform.id} , used by default JVM`);
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
  RESOURCE_VERSIONS() {
    return `${this.composeServer}/api/resource/compose-wasm-versions`;
  },
  SKIKO_MJS(version) {
    return `${this.composeServer}/api/resource/skiko-${version}.mjs`;
  },
  SKIKO_WASM(version) {
    return `${this.composeServer}/api/resource/skiko-${version}.wasm`;
  },
  STDLIB_MJS(hash) {
    return `${this.composeServer}/api/resource/stdlib-${hash}.mjs`;
  },
  STDLIB_WASM(hash) {
    return `${this.composeServer}/api/resource/stdlib-${hash}.wasm`;
  },
  get JQUERY() {
    return `https://cdn.jsdelivr.net/npm/jquery@1/dist/jquery.min.js`;
  },
  get KOTLIN_JS() {
    return `https://cdn.jsdelivr.net/npm/kotlin@`;
  },
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
  compilerVersion: undefined,
};
