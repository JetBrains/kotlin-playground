import {arrayFrom, convertToHtmlTag} from "../utils";


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";

export function processingJVMOutput(output) {
  return output.replace("<outStream>", "<span class=\"standard-output\">")
    .replace("</outStream>", "</span>")
    .replace("<errStream>", "<span class=\"error-output\">")
    .replace("</errStream>", "</span>")
}

export function processingJUnitResults(data) {
  let result = "";
  let totalTime = 0;
  for (let testClass in data) {
    let listOfResults = arrayFrom(data[testClass]);
    listOfResults.forEach(test => {
      totalTime = totalTime + (test.executionTime / 1000);
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
  let testTime = `<div class="test-time">Total test time: ${totalTime}s</div>`;
  return testTime + result;
}

export function getException(exception) {
  let currentException = exception;
  while (currentException != null) {
    if (currentException.fullName === ACCESS_CONTROL_EXCEPTION) {
      return getSecurityException(currentException);
    }
    currentException = currentException.cause;
  }
  return exception;
}

export function getExceptionCauses(exception) {
  if (exception.cause !== undefined && exception.cause != null) {
    return [exception.cause].concat(getExceptionCauses(exception.cause))
  } else {
    return []
  }
}

export function showJsException(exception) {
  if (exception.stack != null) {
    let userStackTrace = exception.stack.toString().substr(0, exception.stack.toString().indexOf("at eval (<anonymous>)"));
    return `${UNHANDLED_JS_EXCEPTION}: ${exception.message} \n ${userStackTrace}`;
  } else {
    return UNHANDLED_JS_EXCEPTION;
  }
}

/**
 * Override exception message: append default security message.
 * Cut stack trace array - use only last stack trace element
 * @param exception
 * @returns updated exception
 */
function getSecurityException(exception) {
  if (exception.stackTrace != null) {
    if (exception.message != null) {
      exception.message = `${SECURITY_MESSAGE}: \n ` + exception.message;
    } else {
      exception.message = SECURITY_MESSAGE
    }
    exception.stackTrace = exception.stackTrace.slice(exception.stackTrace.length - 1)
  }
  return exception
}
