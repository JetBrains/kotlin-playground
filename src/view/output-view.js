import {arrayFrom, convertToHtmlTag, escapeBrackets, processingHtmlBrackets} from "../utils";
import isEmptyObject from "is-empty-object"
import escapeHtml from "escape-html"


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";
const NO_TEST_FOUND = "No test methods were found";
const ANGLE_BRACKETS_LEFT_HTML = "&lt;";
const ANGLE_BRACKETS_RIGHT_HTML = "&gt;";

const TEST_STATUS = {
  FAIL : { value: "FAIL", text: "Fail" },
  ERROR: { value: "ERROR", text: "Error" },
  PASSED : { value: "OK", text: "Passed" }
};

const BUG_FLAG = 'BUG'
const BUG_REPORT_MESSAGE = 'Hey! It seems you just found a bug! \uD83D\uDC1E\n' +
  `Please go here -> http://kotl.in/issue to submit it ` +
  `to the issue tracker and one day we fix it, hopefully \uD83D\uDE09\n` +
  `✅ Don't forget to attach code to the issue\n`;

export function processJVMStdout(output, theme) {
  const processedOutput = escapeHtml(output);
  return `<span class="standard-output ${theme}">${processedOutput}</span>`
}

export function createErrorText(output, theme) {
  const processedOutput = escapeHtml(output);
  return `<span class="error-output ${theme}">${processedOutput}</span>`
}

export function processJVMStderr(output, theme) {
  if (output === BUG_FLAG) {
    output = BUG_REPORT_MESSAGE
  }
  return createErrorText(output, theme)
}

export function processBatchJVMOutput(output, theme) {
  let processedOutput = escapeBrackets(output); // don't need to escape `&`
  return processedOutput
    .split(BUG_FLAG).join(BUG_REPORT_MESSAGE)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}outStream${ANGLE_BRACKETS_RIGHT_HTML}`).join(`<span class="standard-output ${theme}">`)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}/outStream${ANGLE_BRACKETS_RIGHT_HTML}`).join("</span>")
    .split(`${ANGLE_BRACKETS_LEFT_HTML}errStream${ANGLE_BRACKETS_RIGHT_HTML}`).join(`<span class="error-output ${theme}">`)
    .split(`${ANGLE_BRACKETS_LEFT_HTML}/errStream${ANGLE_BRACKETS_RIGHT_HTML}`).join("</span>");
}

export function processJUnitTotalResults(testResults, theme, onTestPassed, onTestFailed) {
  if (testResults.testsRun === 0) {
    return createErrorText(NO_TEST_FOUND, theme)
  }
  if (testResults.success) {
    if (onTestPassed) onTestPassed()
  } else {
    if (onTestFailed) onTestFailed()
  }
  return `<div class="test-time">Total test time: ${testResults.totalTime}s</div>`
}

export function processJUnitTestResult(testRunInfo, testResults, needToEscape) {
  let output = "";
  testResults.testsRun++
  testResults.totalTime += testRunInfo.executionTime / 1000
  switch (testRunInfo.status) {
    case TEST_STATUS.FAIL.value:
      testResults.success = false;
      output = buildOutputTestLine(TEST_STATUS.FAIL.text, testRunInfo.methodName, testRunInfo.comparisonFailure.message, needToEscape);
      break;
    case TEST_STATUS.ERROR.value:
      testResults.success = false;
      output = buildOutputTestLine(TEST_STATUS.ERROR.text, testRunInfo.methodName, testRunInfo.exception.message, needToEscape);
      break;
    case TEST_STATUS.PASSED.value:
      output = buildOutputTestLine(TEST_STATUS.PASSED.text, testRunInfo.methodName, "", needToEscape);
  }
  return output;
}

function buildOutputTestLine(status, method, message, needToEscape) {
  let escapedMessage;
  if (needToEscape) {
    escapedMessage = escapeHtml(message)
  } else {
    escapedMessage = convertToHtmlTag(message) // synchronous mode escapes some text on the server side
  }

  return `
  <div class="console-block">
    <span class="console-icon ${status.toLocaleLowerCase()}"></span>
    <div class="test-${status.toLocaleLowerCase()}">${status}: ${method}${message ? ': ' + escapedMessage : ''}</div>
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
