// @ts-check

/**
 * Typed models passed to the widget events (`onRequest`, `onCompileResult`,
 * `onTestResult`, `onTestPassed`, `onTestFailed`).
 *
 * @typedef {Object} EventContext
 * @property {string} [platform]        - TargetPlatform id, e.g. `java`, `junit`, `js`
 * @property {string} [compilerVersion]
 * @property {string} [code]            - code of the snippet
 *
 * @typedef {Object} SourceFile
 * @property {string} name
 * @property {string} text
 *
 * @typedef {Object} CompileRequestBody
 * @property {string} args
 * @property {string} confType
 * @property {SourceFile[]} files
 *
 * @typedef {'versions'|'compile'|'highlight'|'complete'} ApiRequestType
 *
 * @typedef {Object} ApiRequest
 * @property {ApiRequestType} type
 * @property {string} url
 * @property {'GET'|'POST'} method
 * @property {Record<string, string>} headers
 * @property {CompileRequestBody} [body]
 *
 * @typedef {Object} Position
 * @property {number} line
 * @property {number} ch
 *
 * @typedef {Object} Diagnostic
 * @property {'ERROR'|'WARNING'|'INFO'} severity
 * @property {string} message
 * @property {{start: Position, end: Position}} [interval]
 * @property {string} [className]
 * @property {string} [fileName]       - `File.kt` for the visible code, `hiddenDependency{i}.kt` for hidden files
 *
 * @typedef {Object} CompileResult
 * @property {Diagnostic[]} diagnostics
 * @property {string} [jsCode]
 * @property {unknown} [wasm]
 *
 * @typedef {Object} OutputSegment
 * @property {'out'|'err'} stream
 * @property {string} text
 *
 * @typedef {'OK'|'FAIL'|'ERROR'} TestStatus
 *
 * @typedef {Object} StackFrame
 * @property {string} className
 * @property {string} methodName
 * @property {string} [fileName]
 * @property {number} lineNumber
 *
 * @typedef {Object} TestException
 * @property {string} message
 * @property {string} [fullName]
 * @property {StackFrame[]} stackTrace - the server keeps only 3 top frames, except for `ComparisonFailure`
 * @property {TestException} [cause]
 *
 * @typedef {TestException & {expected?: string, actual?: string}} TestFailure
 *
 * @typedef {Object} TestCase
 * @property {string} className
 * @property {string} methodName
 * @property {TestStatus} status
 * @property {number} durationMs
 * @property {OutputSegment[]} output
 * @property {TestFailure} [failure]
 * @property {TestException} [exception]
 *
 * @typedef {Object} TestReport
 * @property {TestCase[]} cases
 */

/**
 * Event that can read and modify a value: return a new value, or `undefined`
 * to keep the passed (possibly mutated in place) one.
 *
 * @template T
 * @typedef {(value: T, ctx: EventContext) => (T | void | Promise<T | void>)} Transformer
 */

/**
 * @template T
 * @typedef {(value: T, ctx: EventContext) => void} Listener
 */

/**
 * @typedef {Object} PlaygroundEvents
 * @property {Transformer<ApiRequest>} [onRequest]        - before every request to the compiler server
 * @property {Transformer<CompileResult>} [onCompileResult] - after compilation, before the output is rendered
 * @property {Transformer<TestReport>} [onTestResult]    - after JUnit tests, before the output is rendered
 * @property {Listener<TestReport>} [onTestPassed]
 * @property {Listener<TestReport>} [onTestFailed]
 */

const TEST_STATUSES = ['OK', 'FAIL', 'ERROR'];

const STREAM_TAGS = /<(outStream|errStream)>([\s\S]*?)<\/\1>/g;

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * @param {unknown} value
 * @returns {value is ApiRequest}
 */
export function isApiRequest(value) {
  return (
    isObject(value) &&
    typeof value.url === 'string' &&
    (value.method === 'GET' || value.method === 'POST') &&
    isObject(value.headers) &&
    (value.method === 'GET' ||
      (isObject(value.body) && Array.isArray(value.body.files)))
  );
}

/**
 * @param {unknown} value
 * @returns {value is CompileResult}
 */
export function isCompileResult(value) {
  return isObject(value) && Array.isArray(value.diagnostics);
}

/**
 * @param {unknown} value
 * @returns {value is TestReport}
 */
export function isTestReport(value) {
  return (
    isObject(value) &&
    Array.isArray(value.cases) &&
    value.cases.every(
      (testCase) =>
        isObject(testCase) && TEST_STATUSES.indexOf(testCase.status) !== -1,
    )
  );
}

/**
 * Call a user event that may modify the value.
 * `undefined` result keeps the passed (possibly mutated) value.
 * A malformed returned or mutated value throws TypeError.
 *
 * @template T
 * @param {string} name                        - event name for error messages
 * @param {Transformer<T> | undefined} fn
 * @param {T} value
 * @param {EventContext} ctx
 * @param {(value: unknown) => boolean} isValid
 * @param {string} typeName                    - model name for error messages
 * @returns {Promise<T>}
 */
export function transform(name, fn, value, ctx, isValid, typeName) {
  if (typeof fn !== 'function') return Promise.resolve(value);

  return Promise.resolve(fn(value, ctx)).then((result) => {
    if (result === undefined) {
      if (!isValid(value)) {
        throw new TypeError(`${name} produced an invalid ${typeName}`);
      }
      return value;
    }
    if (!isValid(result)) {
      throw new TypeError(
        `${name} must return ${typeName} or undefined, got ${describe(result)}`,
      );
    }
    return /** @type {T} */ (result);
  });
}

/**
 * @param {Record<string, Diagnostic[]> | undefined | null} errorsByFile
 * @returns {Diagnostic[]}
 */
export function toDiagnostics(errorsByFile) {
  return Object.entries(errorsByFile || {}).reduce(
    (acc, [fileName, diagnostics]) =>
      acc.concat(
        (diagnostics || []).map((diagnostic) => ({ ...diagnostic, fileName })),
      ),
    /** @type {Diagnostic[]} */ ([]),
  );
}

/**
 * Split server output with `<outStream>`/`<errStream>` markup into segments.
 * Text outside the tags is treated as standard output.
 *
 * @param {string | undefined | null} text
 * @returns {OutputSegment[]}
 */
export function parseOutputStreams(text) {
  /** @type {OutputSegment[]} */
  const segments = [];
  if (!text) return segments;

  let lastIndex = 0;
  let match;
  STREAM_TAGS.lastIndex = 0;

  while ((match = STREAM_TAGS.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ stream: 'out', text: text.slice(lastIndex, match.index) });
    }
    segments.push({
      stream: match[1] === 'errStream' ? 'err' : 'out',
      text: match[2],
    });
    lastIndex = STREAM_TAGS.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ stream: 'out', text: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * @param {Record<string, any>} frame - stack trace element of the server response
 * @returns {StackFrame}
 */
function toStackFrame({ className, methodName, fileName, lineNumber }) {
  /** @type {StackFrame} */
  const frame = { className, methodName, lineNumber };
  if (fileName) frame.fileName = fileName;
  return frame;
}

/**
 * @param {{message?: string, fullName?: string, stackTrace?: Record<string, any>[], cause?: Record<string, any>}} exception
 *   - `exception` or `comparisonFailure` of a test of the server response
 * @returns {TestException}
 */
function toTestException({ message, fullName, stackTrace, cause }) {
  /** @type {TestException} */
  const exception = {
    message: message || '',
    stackTrace: (stackTrace || []).map(toStackFrame),
  };

  if (fullName) exception.fullName = fullName;
  if (cause) exception.cause = toTestException(cause);

  return exception;
}

/**
 * @param {Record<string, any[]> | undefined | null} testResults - `testResults` of the server response
 * @returns {TestReport}
 */
export function toTestReport(testResults) {
  /** @type {TestCase[]} */
  const cases = [];

  const groups = testResults || {};

  Object.keys(groups).forEach((className) => {
    (groups[className] || []).forEach((test) => {
      /** @type {TestCase} */
      const testCase = {
        className: test.className || className,
        methodName: test.methodName,
        status: test.status,
        durationMs: test.executionTime || 0,
        output: parseOutputStreams(test.output),
      };

      if (test.comparisonFailure) {
        const { expected, actual } = test.comparisonFailure;
        /** @type {TestFailure} */
        const failure = toTestException(test.comparisonFailure);
        if (expected !== undefined) failure.expected = expected;
        if (actual !== undefined) failure.actual = actual;
        testCase.failure = failure;
      }

      if (test.exception) testCase.exception = toTestException(test.exception);

      cases.push(testCase);
    });
  });

  return { cases };
}
