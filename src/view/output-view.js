import {arrayFrom, convertToHtmlTag} from "../utils";
import isEmptyObject from "is-empty-object"
import escapeHtml from "escape-html"


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";
const NO_TEST_FOUND = "No tests methods are found";
const ANGLE_BRACKETS_LEFT_HTML = "&lt;";
const ANGLE_BRACKETS_RIGHT_HTML = "&gt;";

export function processJVMOutput(output) {
  let processedOutput = escapeHtml(output);
  return processedOutput.replace(`${ANGLE_BRACKETS_LEFT_HTML}outStream${ANGLE_BRACKETS_RIGHT_HTML}`, "<span class=\"standard-output\">")
    .replace(`${ANGLE_BRACKETS_LEFT_HTML}/outStream${ANGLE_BRACKETS_RIGHT_HTML}`, "</span>")
    .replace(`${ANGLE_BRACKETS_LEFT_HTML}errStream${ANGLE_BRACKETS_RIGHT_HTML}`, "<span class=\"error-output\">")
    .replace(`${ANGLE_BRACKETS_LEFT_HTML}/errStream${ANGLE_BRACKETS_RIGHT_HTML}`, "</span>");
}

export function processJUnitResults(data) {
  let result = "";
  let totalTime = 0;
  if (isEmptyObject(data)) return NO_TEST_FOUND;
  for (let testClass in data) {
    let listOfResults = arrayFrom(data[testClass]);
     result = result + listOfResults.reduce((previousTest, currentTest) => {
      totalTime = totalTime + (currentTest.executionTime / 1000);
      switch (currentTest.status) {
        case "FAIL":
          return previousTest + `<span class="console-icon fail"></span><div class="test-fail">${currentTest.status} ${currentTest.methodName}: ${convertToHtmlTag(currentTest.comparisonFailure.message)}</div>`;
        case "ERROR":
          return previousTest + `<span class="console-icon fail"></span><div class="test-fail">${currentTest.status} ${currentTest.methodName}: ${convertToHtmlTag(currentTest.exception.message)}</div>`;
        case "OK":
          return previousTest + `<span class="console-icon ok"></span><div class="test-output">${currentTest.status} ${currentTest.methodName}</div>`;
      }
    }, "");
  }
  let testTime = `<div class="test-time">Total test time: ${totalTime}s</div>`;
  return testTime + result;
}

export function processErrors(errors) {
  return errors
    .reduce((acc,currentValue) => {return acc + `<span class="console-icon attention"></span><div class="test-fail">${convertToHtmlTag(currentValue.message)}</div>`}
    , "");
}

/**
 * Check the security exception in the exception tree.
 * @param exception - json object that describes an exception
 * @returns {Object} add default security message to exception object if security exception is found
 */
export function findSecurityException(exception) {
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
 * @param exception - json object that describes an exception
 * @returns {Object} exception with default security message
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
