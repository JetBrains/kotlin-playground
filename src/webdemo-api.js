import URLSearchParams from 'url-search-params';
import 'whatwg-fetch';
import TargetPlatform from "./target-platform";

const webDemoURL = __WEBDEMO_URL__;

function getExceptionCauses(exception) {
  if (exception.cause !== undefined && exception.cause != null) {
    return [exception.cause].concat(getExceptionCauses(exception.cause))
  } else {
    return []
  }
}

function sendRequestToWebdemo(code, compilerVersion, targetPlatform) {
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

  return fetch(`${webDemoURL}/kotlinServer?type=run&runConf=${targetPlatform.id}`, {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }).then(response => response.json())
}


export default class WebDemoApi {
  /**
   * @return {Promise<Object>}
   */
  static getCompilerVersions() {
    return fetch(`${webDemoURL}/kotlinServer?type=getKotlinVersions`)
      .then(response => response.json());
  }

  static translateKotlinToJs(code, compilerVersion) {
    return sendRequestToWebdemo(code, compilerVersion, TargetPlatform.JS).then(function (data) {
      return {
        errors: data.errors["File.kt"],
        jsCode: data.jsCode
      }
    })
  }

  static executeKotlinCode(code, compilerVersion){
    return sendRequestToWebdemo(code, compilerVersion, TargetPlatform.JAVA).then(function (data) {
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
