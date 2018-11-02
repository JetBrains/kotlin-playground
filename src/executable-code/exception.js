import Exception from './exception.monk';

export default class extends Exception {
  constructor() {
    super();
    this.state = {onExceptionClick: null};
  }

  update(state) {
    Object.assign(this.state, state);
    super.update(state);
  }

  onStackTraceClick(fileName, line) {
    this.state.onExceptionClick(fileName, line);
  }
}
