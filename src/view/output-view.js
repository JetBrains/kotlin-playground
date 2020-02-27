import {arrayFrom, convertToHtmlTag, processingHtmlBrackets} from "../utils";
import isEmptyObject from "is-empty-object"
import escapeHtml from "escape-html"


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";
const NO_TEST_FOUND = "No tests methods are found";
const ANGLE_BRACKETS_LEFT_HTML = "&lt;";
const ANGLE_BRACKETS_RIGHT_HTML = "&gt;";

const TEST_STATUS = {
  FAIL : { value: "FAIL", text: "Fail" },
  ERROR: { value: "ERROR", text: "Error" },
  PASSED : { value: "OK", text: "Passed" }
};

const BUG_FLAG = `${ANGLE_BRACKETS_LEFT_HTML}errStream${ANGLE_BRACKETS_RIGHT_HTML}BUG${ANGLE_BRACKETS_LEFT_HTML}/errStream${ANGLE_BRACKETS_RIGHT_HTML}`;
const BUG_REPORT_MESSAGE = `${ANGLE_BRACKETS_LEFT_HTML}errStream${ANGLE_BRACKETS_RIGHT_HTML}Hey! It seems you just found a bug! \uD83D\uDC1E\n` +
  `Please click <a href=http://kotl.in/issue target=_blank>here<a> to submit it ` +
  `to the issue tracker and one day we fix it, hopefully \uD83D\uDE09\n` +
  `✅ Don't forget to attach code to the issue${ANGLE_BRACKETS_LEFT_HTML}/errStream${ANGLE_BRACKETS_RIGHT_HTML}\n`;

export function processJVMOutput(output, theme) {
  let processedOutput = processingHtmlBrackets(output); // don't need to escape `&`
  return processedOutput
    .split(BUG_FLAG).join(BUG_REPORT_MESSAGE)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}outStream${ANGLE_BRACKETS_RIGHT_HTML}`).join(`<span class="standard-output ${theme}">`)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}/outStream${ANGLE_BRACKETS_RIGHT_HTML}`).join("</span>")
    .split(`${ANGLE_BRACKETS_LEFT_HTML}errStream${ANGLE_BRACKETS_RIGHT_HTML}`).join(`<span class="error-output ${theme}">`)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}/errStream${ANGLE_BRACKETS_RIGHT_HTML}`).join("</span>");
}

export function processJUnitResults(data, onTestPassed, onTestFailed) {
  let result = "";
  let totalTime = 0;
  let passed = true;
  if (isEmptyObject(data)) return NO_TEST_FOUND;
  for (let testClass in data) {
    let listOfResults = arrayFrom(data[testClass]);
    result += listOfResults.reduce((previousTest, currentTest) => {
      totalTime = totalTime + (currentTest.executionTime / 1000);
      if (currentTest.status === TEST_STATUS.ERROR.value || currentTest.status === TEST_STATUS.FAIL.value) passed = false;
      switch (currentTest.status) {
        case TEST_STATUS.FAIL.value:
          return previousTest + buildOutputTestLine(TEST_STATUS.FAIL.text, currentTest.methodName, currentTest.comparisonFailure.message);
        case TEST_STATUS.ERROR.value:
          return previousTest + buildOutputTestLine(TEST_STATUS.ERROR.text, currentTest.methodName, currentTest.exception.message);
        case TEST_STATUS.PASSED.value:
          return previousTest + buildOutputTestLine(TEST_STATUS.PASSED.text, currentTest.methodName, "");
      }
    }, "");
  }
  if (passed && onTestPassed) onTestPassed();
  if (!passed && onTestFailed) onTestFailed();
  let testTime = `<div class="test-time">Total test time: ${totalTime}s</div>`;
  return testTime + result;
}

function buildOutputTestLine(status, method, message) {
  return `
  <div class="console-block">
    <span class="console-icon ${status.toLocaleLowerCase()}"></span>
    <div class="test-${status.toLocaleLowerCase()}">${status}: ${method}${message ? ': ' + convertToHtmlTag(message) : ''}</div>
  </div>
  `;
}

export function processErrors(errors, theme) {
  return errors
    .reduce((acc, currentValue) => {
        return acc + `<div class="console-block">
                        <span class="console-icon attention"></span>
                        <div class="test-fail ${theme}">${escapeHtml(currentValue.message)}</div>
                      </div>`
      }
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
  console && console.error(exception);

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
