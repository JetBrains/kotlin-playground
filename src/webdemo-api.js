import {fetch} from 'whatwg-fetch';
import URLSearchParams from 'url-search-params';
import TargetPlatform from "./target-platform";
import {API_URLS} from "./config";
import flatten from 'flatten'
import jsonpipe from 'jsonpipe'
import {
  findSecurityException,
  getExceptionCauses,
  processErrors,
  processJUnitTestResult,
  processJUnitTotalResults,
  processJVMStdout,
  processJVMStderr
} from "./view/output-view";

/**
 * @typedef {Object} KotlinVersion
 * @property {string} version
 * @property {string} build
 * @property {boolean} obsolete
 * @property {boolean} latestStable
 * @property {boolean} hasScriptJar
 * @property {string|null} stdlibVersion
 */

const CACHE = {};
const DEFAULT_FILE_NAME = "File.kt";

export default class WebDemoApi {
  /**
   * @return {Promise<Array<KotlinVersion>>}
   */
  static getCompilerVersions() {
    if ('compilerVersions' in CACHE) {
      return Promise.resolve(CACHE.compilerVersions);
    }

    return fetch(API_URLS.VERSIONS)
      .then(response => response.json())
      .then(versions => {
        CACHE.compilerVersions = versions;
        return versions;
      }).catch(() => {
        return null
      });
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
  static translateKotlinToJs(code, compilerVersion, platform, args, hiddenDependencies) {
    return executeCode(API_URLS.COMPILE, code, compilerVersion, platform, args, hiddenDependencies).then(function (data) {
      let output = "";
      let errorsAndWarnings = flatten(Object.values(data.errors));
      return {
        output: output,
        errors: errorsAndWarnings,
        jsCode: data.jsCode
      }
    })
  }

  /**
   * Request on execute Kotlin code.
   *
   * @param code                 - string
   * @param compilerVersion      - string kotlin compiler
   * @param platform             - TargetPlatform
   * @param args                 - command line arguments
   * @param theme                - editor theme
   * @param onTestPassed         - a function that will be called if all tests pass
   * @param onTestFailed         - a function that will be called if some tests fail (but after all tests are executed)
   * @param hiddenDependencies   - read only additional files
   * @param callback             - a callback for output chunks
   */
  static executeKotlinCodeTEMP(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback) {
    const testResults = {
      testsRun: 0,
      totalTime: 0,
      success: true
    }
    return executeCodeStreaming(API_URLS.COMPILE, code, compilerVersion, platform, args, hiddenDependencies, result => {
      if (result.done) {
        if (platform === TargetPlatform.JUNIT) {
          const output = processJUnitTotalResults(testResults, onTestPassed, onTestFailed)
          callback({
            waitingForOutput: true,
            output: output
          })
        }
        callback({
          waitingForOutput: false
        });
        return
      }
      const data = result.data

      let errorsAndWarnings
      let errors = []
      if (data.hasOwnProperty('errors')) {
        errorsAndWarnings = flatten(Object.values(data.errors));
        errors = errorsAndWarnings.filter(error => error.severity === "ERROR");
      }

      let output;
      if (errors.length > 0) {
        output = processErrors(errors, theme);
      } else if (data.hasOwnProperty('errStream')) {
        output = processJVMStderr(data.errStream, theme)
      } else if (data.hasOwnProperty('outStream')) {
        output = processJVMStdout(data.outStream)
      } else if (data.hasOwnProperty('testResult') && platform === TargetPlatform.JUNIT) {
        output = processJUnitTestResult(data.testResult, testResults)
      }

      let exception;
      if (data.hasOwnProperty('exception')) {
        exception = findSecurityException(data.exception);
        exception.causes = getExceptionCauses(exception);
        exception.cause = undefined;
      }
      callback({
        waitingForOutput: true,
        errors: errorsAndWarnings,
        output: output,
        exception: exception
      })
    })
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
  static getAutoCompletion(code, cursor, compilerVersion, platform, hiddenDependencies, callback) {
    executeCode(API_URLS.COMPLETE, code, compilerVersion, platform, "", hiddenDependencies, cursor)
      .then(data => {
        callback(data);
      })
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
    return executeCode(API_URLS.HIGHLIGHT, code, compilerVersion, platform, "", hiddenDependencies)
      .then(data => data[DEFAULT_FILE_NAME])
  }
}

function createBodyForCodeExecution(code, compilerVersion, targetPlatform, args, hiddenDependencies, options) {
  const files = [buildFileObject(code, DEFAULT_FILE_NAME)]
    .concat(hiddenDependencies.map((file, index) => buildFileObject(file, `hiddenDependency${index}.kt`)));
  const projectJson = JSON.stringify({
    "id": "",
    "name": "",
    "args": args,
    "compilerVersion": compilerVersion,
    "confType": targetPlatform.id,
    "originUrl": null,
    "files": files,
    "readOnlyFileNames": []
  });

  const body = new URLSearchParams();
  body.set('filename', DEFAULT_FILE_NAME);
  body.set('project', projectJson);

  if (options !== undefined) {
    for (let option in options) {
      body.set(option, options[option])
    }
  }
  return body
}

function executeCode(url, code, compilerVersion, targetPlatform, args, hiddenDependencies, options) {
  const body = createBodyForCodeExecution(code, compilerVersion, targetPlatform, args, hiddenDependencies, options)

  return fetch(url + targetPlatform.id, {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }).then(response => response.json())
}

function executeCodeStreaming(url, code, compilerVersion, targetPlatform, args, hiddenDependencies, callback) {
  const body = createBodyForCodeExecution(code, compilerVersion, targetPlatform, args, hiddenDependencies)

  jsonpipe.flow(url + targetPlatform.id, {
    success: data => {
      callback({'data': data})
    },
    complete: () => {
      callback({'done': true})
    },
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Enable-Streaming': 'true'
    },
    data: body.toString(),
    withCredentials: false
  });
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
    "name": fileName,
    "text": code,
    "publicId": ""
  }
}
