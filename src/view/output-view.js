import {arrayFrom, convertToHtmlTag} from "../utils";


export function getOutputResults(output) {
  return output.replace("<outStream>", "<span class=\"standard-output\">")
    .replace("</outStream>", "</span>")
    .replace("<errStream>", "<span class=\"error-output\">")
    .replace("</errStream>", "</span>")
}

export function getJunitResults(data) {
  let result = "";
  for (let testClass in data) {
    let listOfResults = arrayFrom(data[testClass]);
    listOfResults.forEach(test => {
      switch (test.status) {
        case "FAIL":
          result = result + `<span class="test-icon fail"></span><div class="test-fail">${test.status} ${test.methodName}: ${convertToHtmlTag(test.comparisonFailure.message)}</div>`;
          break;
        case "ERROR":
          result = result + `<span class="test-icon fail"></span><div class="test-fail">${test.status} ${test.methodName}: ${convertToHtmlTag(test.exception.message)}</div>`;
          break;
        case "OK":
          result = result + `<span class="test-icon ok"></span><div class="test-output">${test.status} ${test.methodName}</div>`;
          break;
      }
    });
  }
  return result;
}


export function getExceptionCauses(exception) {
  if (exception.cause !== undefined && exception.cause != null) {
    return [exception.cause].concat(getExceptionCauses(exception.cause))
  } else {
    return []
  }
}
