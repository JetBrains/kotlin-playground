import { fetch } from 'whatwg-fetch';
import { API_URLS } from './config';
import { isWasmRelated, TargetPlatforms } from './utils/platforms';
import {
  isApiRequest,
  isCompileResult,
  isTestReport,
  toDiagnostics,
  toTestReport,
  transform,
} from './events';
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

const CACHE = {
  compilerVersions: null,
};
/** Name of the visible code file; hidden dependencies are `hiddenDependency{i}.kt` */
export const DEFAULT_FILE_NAME = 'File.kt';

export default class WebDemoApi {
  /**
   * @param {import('./events').PlaygroundEvents} [events]
   * @return {Promise<Array<KotlinVersion>>}
   */
  static getCompilerVersions(events) {
    if (!CACHE.compilerVersions) {
      const request = {
        type: 'versions',
        url: API_URLS.VERSIONS,
        method: 'GET',
        headers: {},
      };
      CACHE.compilerVersions = sendRequest(request, {}, events)
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
   * @param {import('./events').PlaygroundEvents} [events]
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  static translateKotlinToJs(
    code,
    compilerVersion,
    platform,
    args,
    hiddenDependencies,
    events = {},
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

    const ctx = { platform: platform.id, compilerVersion, code };

    return executeCode(
      API_URLS.COMPILE(platform, compilerVersion),
      code,
      compilerVersion,
      platform,
      args,
      hiddenDependencies,
      null,
      events,
      'compile',
    )
      .then((data) =>
        transform(
          'onCompileResult',
          events.onCompileResult,
          {
            diagnostics: toDiagnostics(data.errors),
            jsCode: data.jsCode,
            wasm: data.wasm,
          },
          ctx,
          isCompileResult,
          'CompileResult',
        ),
      )
      .then((result) => ({
        output: '',
        errors: result.diagnostics,
        jsCode: result.jsCode,
        wasm: result.wasm,
      }));
  }

  /**
   * Request on execute Kotlin code.
   *
   * @param code            - string
   * @param compilerVersion - string kotlin compiler
   * @param platform        - TargetPlatform
   * @param args            - command line arguments
   * @param theme           - theme of editor
   * @param hiddenDependencies   - read only additional files
   * @param {import('./events').PlaygroundEvents} [events] - onRequest, onCompileResult, onTestResult, onTestPassed, onTestFailed
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  static async executeKotlinCode(
    code,
    compilerVersion,
    platform,
    args,
    theme,
    hiddenDependencies,
    events = {},
  ) {
    const ctx = { platform: platform.id, compilerVersion, code };

    const data = await executeCode(
      API_URLS.COMPILE(platform, compilerVersion),
      code,
      compilerVersion,
      platform,
      args,
      hiddenDependencies,
      null,
      events,
      'compile',
    );

    const result = await transform(
      'onCompileResult',
      events.onCompileResult,
      { diagnostics: toDiagnostics(data.errors) },
      ctx,
      isCompileResult,
      'CompileResult',
    );

    let output = '';
    let errorsAndWarnings = result.diagnostics;
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
          if (data.testResults) {
            const report = await transform(
              'onTestResult',
              events.onTestResult,
              toTestReport(data.testResults),
              ctx,
              isTestReport,
              'TestReport',
            );
            output = processJUnitResults(report, events, ctx);
          } else {
            output = processJVMOutput(data.text || '', theme);
          }
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
   * @param {import('./events').PlaygroundEvents} [events] - only onRequest is used
   */
  static getAutoCompletion(
    code,
    cursor,
    compilerVersion,
    platform,
    hiddenDependencies,
    callback,
    events,
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
      events,
      'complete',
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
   * @param {import('./events').PlaygroundEvents} [events] - only onRequest is used
   * @return {*|PromiseLike<T>|Promise<T>}
   */
  static getHighlight(
    code,
    compilerVersion,
    platform,
    hiddenDependencies,
    events,
  ) {
    return executeCode(
      API_URLS.HIGHLIGHT(compilerVersion),
      code,
      compilerVersion,
      platform,
      '',
      hiddenDependencies,
      null,
      events,
      'highlight',
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
  events,
  type,
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

  const request = {
    type,
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body,
  };
  const ctx = { platform: targetPlatform.id, compilerVersion, code };

  return sendRequest(request, ctx, events).then((response) => response.json());
}

/**
 * Apply `onRequest` event and send the request.
 *
 * @param {import('./events').ApiRequest} request
 * @param {import('./events').EventContext} ctx
 * @param {import('./events').PlaygroundEvents} [events]
 * @returns {Promise<Response>}
 */
function sendRequest(request, ctx, events) {
  return transform(
    'onRequest',
    events && events.onRequest,
    request,
    ctx,
    isApiRequest,
    'ApiRequest',
  ).then(({ url, method, headers, body }) =>
    fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(serializeBody(body)) : undefined,
    }),
  );
}

/**
 * @param {import('./events').CompileRequestBody} body
 */
function serializeBody(body) {
  return {
    ...body,
    files: body.files.map((file) => ({ ...file, publicId: '' })),
  };
}

/**
 *
 * Build file object.
 * @param code - string code
 * @param fileName - name of file
 * @returns {import('./events').SourceFile} - file object
 */
function buildFileObject(code, fileName) {
  return {
    name: fileName,
    text: code,
  };
}
