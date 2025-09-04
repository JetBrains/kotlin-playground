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
import { completionCallback } from './utils/websockets/webSocketConnection';

/**
 * @typedef {Object} KotlinVersion
 * @property {string} version
 * @property {string} build
 * @property {boolean} obsolete
 * @property {boolean} latestStable
 * @property {boolean} hasScriptJar
 * @property {string|null} stdlibVersion
 */

const CACHE = {
  compilerVersions: null,
};
const DEFAULT_FILE_NAME = 'File.kt';

export default class WebDemoApi {
  /**
   * @return {Promise<Array<KotlinVersion>>}
   */
  static getCompilerVersions() {
    if (!CACHE.compilerVersions) {
      CACHE.compilerVersions = fetch(API_URLS.VERSIONS)
        .then((response) => response.json())
        .catch(() => (CACHE.compilerVersions = null));
    }

    return CACHE.compilerVersions;
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
  static translateKotlinToJs(
    code,
    compilerVersion,
    platform,
    args,
    hiddenDependencies,
  ) {
    const MINIMAL_VERSION_IR = '1.5.0';
    const MINIMAL_VERSION_WASM = '1.9.0';
    const MINIMAL_VERSION_SWIFT_EXPORT = '2.0.0';

    if (
      platform === TargetPlatforms.JS_IR &&
      compilerVersion < MINIMAL_VERSION_IR
    ) {
      return Promise.resolve({
        output: '',
        errors: [
          {
            severity: 'ERROR',
            message: `JS IR compiler backend accessible only since ${MINIMAL_VERSION_IR} version`,
          },
        ],
        jsCode: '',
      });
    }

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
  static executeKotlinCode(
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
  static getAutoCompletion(
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
   * Request for getting list of different completion proposals through WebSockets
   *
   * Note: currently `compilerVersion` is not used as it is not supported by lsp-based
   * completions. Please refer to KTL-3773.
   *
   * @param code - string code
   * @param cursor - cursor position in code
   * @param compilerVersion - string kotlin compiler
   * @param hiddenDependencies   - read only additional files
   * @param platform - kotlin platform {@see TargetPlatform}
   * @param callback
   */
  static getWSAutoCompletion(
    code,
    cursor,
    compilerVersion,
    platform,
    hiddenDependencies,
    callback,
  ) {
    const { line, ch, ...options } = cursor;
    const files = [buildFileObject(code, DEFAULT_FILE_NAME)].concat(
      hiddenDependencies.map((file, index) =>
        buildFileObject(file, `hiddenDependency${index}.kt`),
      ),
    );

    const project = {
      args: '',
      files,
      confType: platform.id,
      ...(options || {}),
    };

    completionCallback(callback, project, line, ch);
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
  static getHighlight(code, compilerVersion, platform, hiddenDependencies) {
    return executeCode(
      API_URLS.HIGHLIGHT(compilerVersion),
      code,
      compilerVersion,
      platform,
      '',
      hiddenDependencies,
    ).then((data) => data[DEFAULT_FILE_NAME] || []);
  }
}

function executeCode(
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

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  }).then((response) => response.json());
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
