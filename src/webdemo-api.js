import 'whatwg-fetch';
import URLSearchParams from 'url-search-params';
import TargetPlatform from "./target-platform";

/**
 * @typedef {Object} KotlinVersion
 * @property {string} version
 * @property {string} build
 * @property {boolean} obsolete
 * @property {boolean} latestStable
 * @property {boolean} hasScriptJar
 * @property {string|null} stdlibVersion
 */

const WEBDEMO_URL = __WEBDEMO_URL__;
const CACHE = {};

function getExceptionCauses(exception) {
  if (exception.cause !== undefined && exception.cause != null) {
    return [exception.cause].concat(getExceptionCauses(exception.cause))
  } else {
    return []
  }
}

function executeCode(code, compilerVersion, targetPlatform) {
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

  return fetch(`${WEBDEMO_URL}/kotlinServer?type=run&runConf=${targetPlatform.id}`, {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }).then(response => response.json())
}

export default class WebDemoApi {
  /**
   * @return {Promise<Array<KotlinVersion>>}
   */
  static getCompilerVersions() {
    if ('compilerVersions' in CACHE) {
      return Promise.resolve(CACHE.compilerVersions);
    }

    return fetch(`${WEBDEMO_URL}/kotlinServer?type=getKotlinVersions`)
      .then(response => response.json())
      .then(versions => {
        CACHE.compilerVersions = versions;
        return versions;
      });
  }

  static translateKotlinToJs(code, compilerVersion) {
    return executeCode(code, compilerVersion, TargetPlatform.JS).then(function (data) {
      return {
        errors: data.errors["File.kt"],
        jsCode: data.jsCode
      }
    })
  }

  static executeKotlinCode(code, compilerVersion){
    return executeCode(code, compilerVersion, TargetPlatform.JAVA).then(function (data) {
      let output;
      if (data.text !== undefined) {
        output = data.text.replace("<outStream>", "<span class=\"standard-output\">")
          .replace("</outStream>", "</span>")
          .replace("<errStream>", "<span class=\"error-output\">")
          .replace("</errStream>", "</span>");
      } else {
        output = "";
      }

      if (data.exception != null) {
        data.exception.causes = getExceptionCauses(data.exception);
        data.exception.cause = undefined;
      }

      return {
        errors: data.errors["File.kt"],
        output: output,
        exception: data.exception
      }
    })
  }
}
