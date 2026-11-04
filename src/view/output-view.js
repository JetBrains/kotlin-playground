import {convertToHtmlTag} from "../utils";
import escapeHtml from "escape-html"
import {parseOutputStreams} from "../events";


const ACCESS_CONTROL_EXCEPTION = "java.security.AccessControlException";
const SECURITY_MESSAGE = "Access control exception due to security reasons in web playground";
const UNHANDLED_JS_EXCEPTION = "Unhandled JavaScript exception";
const NO_TEST_FOUND = "No tests methods are found";
const TEST_STATUS = {
  FAIL : { value: "FAIL", text: "Fail" },
  ERROR: { value: "ERROR", text: "Error" },
  PASSED : { value: "OK", text: "Passed" }
};

const BUG_FLAG = "BUG";
const BUG_REPORT_MESSAGE = `Hey! It seems you just found a bug! \uD83D\uDC1E\n` +
  `Please click <a href=http://kotl.in/issue target=_blank>here</a> to submit it ` +
  `to the issue tracker and one day we fix it, hopefully \uD83D\uDE09\n` +
  `✅ Don't forget to attach code to the issue`;

/**
 * @param {string} output - server output with `<outStream>`/`<errStream>` markup
 * @param {string} theme
 */
export function processJVMOutput(output, theme) {
  return renderOutputSegments(parseOutputStreams(output), theme);
}

/**
 * @param {import('../events').OutputSegment[]} segments
 * @param {string} theme
 */
export function renderOutputSegments(segments, theme) {
  return segments
    .map(({ stream, text }) => {
      if (stream === "err" && text === BUG_FLAG) {
        return `<span class="error-output ${theme}">${BUG_REPORT_MESSAGE}</span>\n`;
      }
      const className = stream === "err" ? "error-output" : "standard-output";
      return `<span class="${className} ${theme}">${escapeHtml(text)}</span>`;
    })
    .join("");
}

/**
 * @param {import('../events').TestReport} report
 * @param {import('../events').PlaygroundEvents} events - onTestPassed, onTestFailed
 * @param {import('../events').EventContext} ctx
 */
export function processJUnitResults(report, events, ctx) {
  const cases = report.cases;
  if (cases.length === 0) return NO_TEST_FOUND;
  const totalTime = cases.reduce((acc, test) => acc + test.durationMs / 1000, 0);
  const passed = cases.every((test) => test.status === TEST_STATUS.PASSED.value);
  const result = cases.reduce((previousTest, currentTest) => {
    switch (currentTest.status) {
      case TEST_STATUS.FAIL.value:
        return previousTest + buildOutputTestLine(TEST_STATUS.FAIL.text, currentTest.methodName, getTestMessage(currentTest));
      case TEST_STATUS.ERROR.value:
        return previousTest + buildOutputTestLine(TEST_STATUS.ERROR.text, currentTest.methodName, getTestMessage(currentTest));
      case TEST_STATUS.PASSED.value:
        return previousTest + buildOutputTestLine(TEST_STATUS.PASSED.text, currentTest.methodName, "");
    }
    return previousTest;
  }, "");
  if (passed && events.onTestPassed) events.onTestPassed(report, ctx);
  if (!passed && events.onTestFailed) events.onTestFailed(report, ctx);
  let testTime = `<div class="test-time">Total test time: ${totalTime}s</div>`;
  return testTime + result;
}

function getTestMessage(test) {
  const problem = test.failure || test.exception;
  return problem ? problem.message : "";
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
