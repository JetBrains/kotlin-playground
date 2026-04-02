import { fetch } from 'whatwg-fetch';
import { API_URLS } from './config';
import flatten from 'flatten';
import { isWasmRelated, TargetPlatforms } from './utils/platforms';
import {
  findSecurityException,
  getExceptionCauses,
  processErrors,
  processJUnitResults,
  processJVMOutput,
} from './view/output-view';

/**
 * @typedef {Object} KotlinVersion
 * @property {string} version
 * @property {string} build
 * @property {boolean} obsolete
 * @property {boolean} latestStable
 * @property {boolean} hasScriptJar
 * @property {string|null} stdlibVersion
 */

const DEFAULT_FILE_NAME = 'File.kt';

/** @type {Map<string, Promise>} */
const VERSIONS_CACHE = new Map();

/**
 * @typedef {Object} Interceptors
 * @property {(url: string, fetchOptions: RequestInit) => Promise<RequestInit>}
 */

export default class WebDemoApi {
  /** @param {Interceptors} [interceptors] */
  constructor(interceptors = {}) {
    this.interceptors = interceptors;
  }

  /**
   * Central fetch proxy. Applies interceptors if provided.
   * @param {string} url
   * @param {RequestInit} [options]
   * @return {Promise<Response>}
   */
  async apiFetch(url, options = {}) {
    const fetchOptions = this.interceptors.onRequest
      ? await this.interceptors.onRequest(url, options)
      : options;

    return fetch(url, fetchOptions);
  }

  /**  @return {Promise<Array<KotlinVersion>>} */
  getCompilerVersions() {
    const cacheKey = API_URLS.VERSIONS;

    if (!VERSIONS_CACHE.has(cacheKey)) {
      VERSIONS_CACHE.set(
        cacheKey,
        this.apiFetch(cacheKey)
          .then((response) => response.json())
          .catch(() => {
            VERSIONS_CACHE.delete(cacheKey);
            return null;
          }),
      );
    }

    return VERSIONS_CACHE.get(cacheKey);
  }

  /**
   * Request on translation Kotlin code to JS code
   *
   * @param code            - string
   * @param compilerVersion - string kotlin compiler
   * @param platform        - TargetPlatform
   * @param args            - command line arguments
   * @param hiddenDependencies   - read only additional files
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  translateKotlinToJs(
    code,
    compilerVersion,
    platform,
    args,
    hiddenDependencies,
  ) {
    const MINIMAL_VERSION_WASM = '1.9.0';
    const MINIMAL_VERSION_SWIFT_EXPORT = '2.0.0';

    if (isWasmRelated(platform) && compilerVersion < MINIMAL_VERSION_WASM) {
      return Promise.resolve({
        output: '',
        errors: [
          {
            severity: 'ERROR',
            message: `Wasm compiler backend accessible only since ${MINIMAL_VERSION_WASM} version`,
          },
        ],
        jsCode: '',
      });
    }

    if (
      platform === TargetPlatforms.SWIFT_EXPORT &&
      compilerVersion < MINIMAL_VERSION_SWIFT_EXPORT
    ) {
      return Promise.resolve({
        output: '',
        errors: [
          {
            severity: 'ERROR',
            message: `Swift export accessible only since ${MINIMAL_VERSION_SWIFT_EXPORT} version`,
          },
        ],
        jsCode: '',
      });
    }

    return executeCode(
      this,
      API_URLS.COMPILE(platform, compilerVersion),
      code,
      compilerVersion,
      platform,
      args,
      hiddenDependencies,
    ).then(function (data) {
      let output = '';
      let errorsAndWarnings = flatten(Object.values(data.errors));
      return {
        output: output,
        errors: errorsAndWarnings,
        jsCode: data.jsCode,
        wasm: data.wasm,
      };
    });
  }

  /**
   * Request on execute Kotlin code.
   *
   * @param code            - string
   * @param compilerVersion - string kotlin compiler
   * @param platform        - TargetPlatform
   * @param args            - command line arguments
   * @param theme           - theme of editor
   * @param onTestPassed    - function will call after test's passed
   * @param onTestFailed    - function will call after test's failed
   * @param hiddenDependencies   - read only additional files
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  executeKotlinCode(
    code,
    compilerVersion,
    platform,
    args,
    theme,
    hiddenDependencies,
    onTestPassed,
    onTestFailed,
  ) {
    return executeCode(
      this,
      API_URLS.COMPILE(platform, compilerVersion),
      code,
      compilerVersion,
      platform,
      args,
      hiddenDependencies,
    ).then(function (data) {
      let output = '';
      let errorsAndWarnings = flatten(Object.values(data.errors));
      let errors = errorsAndWarnings.filter(
        (error) => error.severity === 'ERROR',
      );
      if (errors.length > 0) {
        output = processErrors(errors, theme);
      } else {
        switch (platform) {
          case TargetPlatforms.JAVA:
            if (data.text) output = processJVMOutput(data.text, theme);
            break;
          case TargetPlatforms.JUNIT:
            data.testResults
              ? (output = processJUnitResults(
                  data.testResults,
                  onTestPassed,
                  onTestFailed,
                ))
              : (output = processJVMOutput(data.text || '', theme));
            break;
        }
      }
      let exceptions = null;
      if (data.exception != null) {
        exceptions = findSecurityException(data.exception);
        exceptions.causes = getExceptionCauses(exceptions);
        exceptions.cause = undefined;
      }
      return {
        errors: errorsAndWarnings,
        output: output,
        exception: exceptions,
      };
    });
  }

  /**
   * Request for getting list of different completion proposals
   *
   * @param code - string code
   * @param cursor - cursor position in code
   * @param compilerVersion - string kotlin compiler
   * @param hiddenDependencies   - read only additional files
   * @param platform - kotlin platform {@see TargetPlatform}
   * @param callback
   */
  getAutoCompletion(
    code,
    cursor,
    compilerVersion,
    platform,
    hiddenDependencies,
    callback,
  ) {
    const { line, ch, ...options } = cursor;
    const url = API_URLS.COMPLETE(compilerVersion) + `?line=${line}&ch=${ch}`;
    executeCode(
      this,
      url,
      code,
      compilerVersion,
      platform,
      '',
      hiddenDependencies,
      options,
    ).then((data) => {
      callback(data);
    });
  }

  /**
   * Request for getting errors of current file
   *
   * @param code - string code
   * @param compilerVersion - string kotlin compiler
   * @param platform - kotlin platform {@see TargetPlatform}
   * @param hiddenDependencies   - read only additional files
   * @return {*|PromiseLike<T>|Promise<T>}
   */
  getHighlight(code, compilerVersion, platform, hiddenDependencies) {
    return executeCode(
      this,
      API_URLS.HIGHLIGHT(compilerVersion),
      code,
      compilerVersion,
      platform,
      '',
      hiddenDependencies,
    ).then((data) => data[DEFAULT_FILE_NAME] || []);
  }
}

async function executeCode(
  api,
  url,
  code,
  compilerVersion,
  targetPlatform,
  args,
  hiddenDependencies,
  options,
) {
  const files = [buildFileObject(code, DEFAULT_FILE_NAME)].concat(
    hiddenDependencies.map((file, index) =>
      buildFileObject(file, `hiddenDependency${index}.kt`),
    ),
  );

  const body = {
    args,
    files,
    confType: targetPlatform.id,
    ...(options || {}),
  };

  const fetchOptions = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  };

  return api.apiFetch(url, fetchOptions).then((response) => response.json());
}

/**
 *
 * Build file object.
 * @param code - string code
 * @param fileName - name of file
 * @returns {{name: string, text: string, publicId: string}} - file object
 */
function buildFileObject(code, fileName) {
  return {
    name: fileName,
    text: code,
    publicId: '',
  };
}
