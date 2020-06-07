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
  processJVMStderr,
  createErrorText,
  processBatchJVMOutput
} from "./view/output-view";
import {arrayFrom} from "./utils";

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
const DEFAULT_FILE_NAME = "File.kt";

export default class WebDemoApi {
  /**
   * @return {Promise<Array<KotlinVersion>>}
   */
  static getCompilerVersions() {
    if (!CACHE.compilerVersions) {
      CACHE.compilerVersions = fetch(API_URLS.VERSIONS)
        .then(response => response.json())
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
   * Request to execute Kotlin code.
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
  static executeKotlinCode(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback) {
    if (API_URLS.COMPILE_ASYNC) {
      executeKotlinCodeStreaming(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback)
    } else {
      executeKotlinCodeSync(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback)
    }
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

function processJUnitResults(data, theme, onTestPassed, onTestFailed) { // use for synchronous output only
  const testResults = {
    testsRun: 0,
    totalTime: 0,
    success: true
  }
  let output = ""
  for (let testClass in data) {
    arrayFrom(data[testClass]).forEach(testResult => {
      output += processJUnitTestResult(testResult, testResults, false)
    })
  }
  output += processJUnitTotalResults(testResults, theme, onTestPassed, onTestFailed)
  return output
}

function executeKotlinCodeSync(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback) {
  executeCode(API_URLS.COMPILE, code, compilerVersion, platform, args, hiddenDependencies).then(function (data) {
    let output = "";
    let errorsAndWarnings = flatten(Object.values(data.errors));
    let errors = errorsAndWarnings.filter(error => error.severity === "ERROR");
    if (errors.length > 0) {
      output = processErrors(errors, theme);
    } else {
      switch (platform) {
        case TargetPlatform.JAVA:
          if (data.text) output = processBatchJVMOutput(data.text, theme);
          break;
        case TargetPlatform.JUNIT:
          if (data.testResults || !data.text) {
            output = processJUnitResults(data.testResults, theme, onTestPassed, onTestFailed)
          } else {
            output = processBatchJVMOutput(data.text, theme);
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
    callback({
      waitingForOutput: false,
      errors: errorsAndWarnings,
      output: output,
      exception: exceptions
    })
  })
}


function executeKotlinCodeStreaming(code, compilerVersion, platform, args, theme, hiddenDependencies, onTestPassed, onTestFailed, callback) {
  const testResults = {
    testsRun: 0,
    totalTime: 0,
    success: true
  }
  executeCodeStreaming(API_URLS.COMPILE, code, compilerVersion, platform, args, hiddenDependencies, result => {
    let output;
    if (result.errorText) {
      output = createErrorText(result.errorText, theme)
    } else if (platform === TargetPlatform.JUNIT) {
      output = processJUnitTotalResults(testResults, theme, onTestPassed, onTestFailed)
    }
    callback({
      waitingForOutput: false,
      output: output
    })
  }, result => {
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
      output = processJUnitTestResult(data.testResult, testResults, true)
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

function executeCodeStreaming(url, code, compilerVersion, targetPlatform, args, hiddenDependencies, onDone, onData) {
  const body = createBodyForCodeExecution(code, compilerVersion, targetPlatform, args, hiddenDependencies)

  let xmlHttpRequest;
  xmlHttpRequest = jsonpipe.flow(url + targetPlatform.id, {
    success: data => {
      onData({'data': data})
    },
    complete: () => {
      if (xmlHttpRequest && xmlHttpRequest.status === 0) {
        onDone({errorText: "REQUEST CANCELLED"})
      } else if (xmlHttpRequest && (xmlHttpRequest.status < 200 || xmlHttpRequest.status > 299)) {
        onDone({errorText: `SERVER RETURNED CODE ${xmlHttpRequest.status}`})
      } else {
        onDone({})
      }
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
