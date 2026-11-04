import Exception from './exception.monk';
import { DEFAULT_FILE_NAME } from '../webdemo-api';

/**
 * Only frames of the visible file with a real line can be opened in the editor.
 * @param frame - stack trace element of the server response
 * @returns {boolean}
 */
function isLinkable(frame) {
  return frame.fileName === DEFAULT_FILE_NAME && frame.lineNumber > 0;
}

export default class extends Exception {
  constructor() {
    super();
    this.state = {onExceptionClick: null};
  }

  update(state) {
    Object.assign(this.state, state);
    super.update(
      state.stackTrace
        ? {
            ...state,
            stackTrace: state.stackTrace.map((frame) => ({
              ...frame,
              linkable: isLinkable(frame),
            })),
          }
        : state,
    );
  }

  onStackTraceClick(fileName, line) {
    this.state.onExceptionClick(fileName, line);
  }
}
