import 'whatwg-fetch';
import URLSearchParams from 'url-search-params';
import TargetPlatform from "./target-platform";
import {API_URLS} from "./config";
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

const CACHE = {};

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
      });
  }

  /**
   * Request on translation Kotlin code to JS code
   *
   * @param code            - string
   * @param compilerVersion - string kotlin compiler
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  static translateKotlinToJs(code, compilerVersion) {
    return executeCode(API_URLS.COMPILE, code, compilerVersion, TargetPlatform.JS).then(function (data) {
      return {
        errors: data.errors["File.kt"],
        jsCode: data.jsCode
      }
    })
  }

  /**
   * Request on execute Kotlin code.
   *
   * @param code            - string
   * @param compilerVersion - string kotlin compiler
   * @param platform        - TargetPlatform
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  static executeKotlinCode(code, compilerVersion, platform) {
    return executeCode(API_URLS.COMPILE, code, compilerVersion, platform).then(function (data) {
      let output = "";
      switch (platform) {
        case TargetPlatform.JAVA:
          if (data.text) output = getOutputResults(data.text);
          break;
        case TargetPlatform.JUNIT:
          if (data.testResults) output = getJunitResults(data.testResults);
          break;
      }
      let exceptions = null;
      if (data.exception != null) {
        exceptions = data.exception;
        exceptions.causes = getExceptionCauses(data.exception);
        exceptions.cause = undefined;
      }

      return {
        errors: data.errors["File.kt"],
        output: output,
        exception: exceptions
      }
    })
  }

  /**
   * Request for getting list of different completion proposals
   *
   * @param code - string code
   * @param cursor - cursor position in code
   * @param compilerVersion - string kotlin compiler
   * @param platform - kotlin platform {@see TargetPlatform}
   * @param callback
   */
  static getAutoCompletion(code, cursor, compilerVersion, platform, callback) {
    const parametres = {"line": cursor.line, "ch": cursor.ch};
    executeCode(API_URLS.COMPLETE, code, compilerVersion, platform, parametres)
      .then(data => {
        callback(data);
      })
  }
}

function getExceptionCauses(exception) {
  if (exception.cause !== undefined && exception.cause != null) {
    return [exception.cause].concat(getExceptionCauses(exception.cause))
  } else {
    return []
  }
}

function executeCode(url, code, compilerVersion, targetPlatform, options) {
  const projectJson = JSON.stringify({
    "id": "",
    "name": "",
    "args": "",
    "compilerVersion": compilerVersion,
    "confType": targetPlatform.id,
    "originUrl": null,
    "files": [
      {
        "name": "File.kt",
        "text": code,
        "publicId": ""
      }
    ],
    "readOnlyFileNames": []
  });

  const body = new URLSearchParams();
  body.set('filename', "File.kt");
  body.set('project', projectJson);

  if (options !== undefined) {
    for (let option in options) {
      body.set(option, options[option])
    }
  }
  return fetch(url + targetPlatform.id, {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }).then(response => response.json())
}

function getOutputResults(output) {
  return output.replace("<outStream>", "<span class=\"standard-output\">")
    .replace("</outStream>", "</span>")
    .replace("<errStream>", "<span class=\"error-output\">")
    .replace("</errStream>", "</span>")
}

function getJunitResults(data) {
  let result = "";
  for (let testClass in data) {
    let listOfResults = arrayFrom(data[testClass]);
    listOfResults.forEach(test => {
      switch (test.status) {
        case "FAIL":
          result = result + `<span class="test-icon fail"></span><div class="test-fail">${test.status} ${test.methodName}: ${test.comparisonFailure.message}</div>`;
          break;
        case "ERROR":
          result = result + `<span class="test-icon fail"></span><div class="test-fail">${test.status} ${test.methodName}: ${test.comparisonFailure.message}</div>`;
          break;
        case "OK":
          result = result + `<span class="test-icon ok"></span><div class="test-output">${test.status} ${test.methodName}</div>`;
          break;
      }
    });
  }
  return result;
}
