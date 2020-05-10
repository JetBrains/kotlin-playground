import {arrayFrom, convertToHtmlTag, escapeBrackets} from "../utils";
import isEmptyObject from "is-empty-object"
import escapeHtml from "escape-html"


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";
const NO_TEST_FOUND = "No tests methods are found";

const TEST_STATUS = {
  FAIL : { value: "FAIL", text: "Fail" },
  ERROR: { value: "ERROR", text: "Error" },
  PASSED : { value: "OK", text: "Passed" }
};

const BUG_FLAG_TEMP = 'BUG'
const BUG_REPORT_MESSAGE_TEMP = 'Hey! It seems you just found a bug! \uD83D\uDC1E\n' +
  `Please click <a href=http://kotl.in/issue target=_blank>here<a> to submit it ` +
  `to the issue tracker and one day we fix it, hopefully \uD83D\uDE09\n` +
  `✅ Don't forget to attach code to the issue\n`;

export function processJVMStdout(output, theme) {
  const processedOutput = escapeBrackets(output);
  return `<span class="standard-output ${theme}">${processedOutput}</span>`
}

export function processJVMStderr(output, theme) {
  if (output === BUG_FLAG_TEMP) {
    output = BUG_REPORT_MESSAGE_TEMP
  }
  const processedOutput = escapeBrackets(output);
  return `<span class="error-output ${theme}">${processedOutput}</span>`
}

export function processJUnitTotalResults(testResults, onTestPassed, onTestFailed) {
  if (testResults.testsRun === 0) {
    return NO_TEST_FOUND
  }
  if (testResults.success) {
    if (onTestPassed) onTestPassed()
  } else {
    if (onTestFailed) onTestFailed()
  }
  return `<div class="test-time">Total test time: ${testResults.totalTime}s</div>`
}

export function processJUnitTestResult(testRunInfo, testResults) {
  let output = "";
  testResults.testsRun++
  testResults.totalTime += testRunInfo.executionTime / 1000
  switch (testRunInfo.status) {
    case TEST_STATUS.FAIL.value:
      testResults.success = false;
      output = buildOutputTestLine(TEST_STATUS.FAIL.text, testRunInfo.methodName, testRunInfo.comparisonFailure.message);
      break;
    case TEST_STATUS.ERROR.value:
      testResults.success = false;
      output = buildOutputTestLine(TEST_STATUS.ERROR.text, testRunInfo.methodName, testRunInfo.exception.message);
      break;
    case TEST_STATUS.PASSED.value:
      output = buildOutputTestLine(TEST_STATUS.PASSED.text, testRunInfo.methodName, "");
  }
  return output;
}

function buildOutputTestLine(status, method, message) {
  return `
  <div class="console-block">
    <span class="console-icon ${status.toLocaleLowerCase()}"></span>
    <div class="test-${status.toLocaleLowerCase()}">${status}: ${method}${message ? ': ' + escapeBrackets(message) : ''}</div>
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
