import merge from 'deepmerge';
import CodeMirror from 'codemirror';
import equal from 'fast-deep-equal';
import Monkberry from 'monkberry';
import directives from 'monkberry-directives';
import 'monkberry-events';
import ExecutableCodeTemplate from './executable-fragment.monk';
import WebDemoApi from '../webdemo-api';

import {
  isJavaRelated,
  isJsRelated,
  isWasmRelated,
  TargetPlatforms,
} from '../utils/platforms';
import JsExecutor from '../js-executor';

import {
  escapeRegExp,
  MARK_PLACEHOLDER_CLOSE,
  MARK_PLACEHOLDER_OPEN,
  SAMPLE_END,
  SAMPLE_START,
  unEscapeString,
} from '../utils/escape';

import { countLines, THEMES } from '../utils';
import debounce from 'debounce';
import CompletionView from '../view/completion-view';
import { processErrors } from '../view/output-view';
import { fetch } from 'whatwg-fetch';
import { API_URLS } from '../config';

const IMPORT_NAME = 'import';
const KEY_CODES = {
  R: 82,
  F9: 120,
  ENTER: 13,
};
const DEBOUNCE_TIME = 500;
const MAC = 'Mac';

const SELECTORS = {
  JS_CODE_OUTPUT_EXECUTOR: '.js-code-output-executor',
  FOLD_BUTTON: '.fold-button',
  UNMODIFIABLE_LINE_DARK: 'unmodifiable-line-dark',
  UNMODIFIABLE_LINE: 'unmodifiable-line',
  MARK_PLACEHOLDER: 'markPlaceholder',
  MARK_PLACEHOLDER_START: 'markPlaceholder-start',
  MARK_PLACEHOLDER_END: 'markPlaceholder-end',
  GUTTER: 'gutter',
  ERROR: 'ERROR',
  FOLD_GUTTER: 'CodeMirror-foldgutter',
  ERROR_GUTTER: 'ERRORgutter',
  ERROR_AND_WARNING_GUTTER: 'errors-and-warnings-gutter',
  BACKGROUND: 'background',
  LABEL: 'label',
};

export default class ExecutableFragment extends ExecutableCodeTemplate {
  static render(element, options = {}) {
    const instance = Monkberry.render(ExecutableFragment, element, {
      directives: directives,
    });

    instance.arrayClasses = [];
    instance.initialized = false;
    instance.state = {
      theme: '',
      code: '',
      foldButtonHover: false,
      folded: true,
      output: null,
    };
    instance.codemirror = new CodeMirror();

    instance.on('click', SELECTORS.FOLD_BUTTON, () => {
      instance.update({ folded: !instance.state.folded });
    });

    instance.on('keyup', (event) => {
      if (window.navigator.appVersion.indexOf(MAC) !== -1) {
        if (event.keyCode === KEY_CODES.R && event.ctrlKey) {
          instance.execute();
        }
      } else {
        if (event.keyCode === KEY_CODES.F9 && event.ctrlKey) {
          instance.execute();
        }
      }
    });

    const events = options.eventFunctions;
    if (events && events.getInstance) events.getInstance(instance);

    return instance;
  }

  get isShouldBeFolded() {
    return this.prefix.trim() !== '' || this.suffix.trim() !== '';
  }

  update(state) {
    let sample;
    let hasMarkers = false;
    let platform = state.targetPlatform;
    if (
      (state.compilerVersion && isJsRelated(platform)) ||
      isWasmRelated(platform)
    ) {
      this.jsExecutor = new JsExecutor(state.compilerVersion);
    }

    if (!state.shorterHeight) {
      this.codemirror.display.wrapper.style.maxHeight = '';
    }

    if (state.code) {
      let code = state.code;
      if (
        state.from &&
        state.to &&
        state.to >= state.from &&
        state.from > 0 &&
        state.to > 0
      ) {
        let codeLines = code.split('\n');
        codeLines.splice(state.from - 1, 0, SAMPLE_START);
        codeLines.splice(state.to + 1, 0, SAMPLE_END);
        code = codeLines.join('\n');
      }
      const startIndex = code.indexOf(SAMPLE_START);
      const endIndex = code.indexOf(SAMPLE_END);
      hasMarkers = !state.noneMarkers && startIndex > -1 && endIndex > -1;

      this.prefix = '';
      this.suffix = '';
      sample = code;

      this.canAddImport = true;

      if (hasMarkers) {
        this.prefix = code.substring(0, startIndex);
        this.canAddImport = this.prefixEmptyOrContainsOnlyImports();
        this.suffix = code.substring(endIndex + SAMPLE_END.length);
        sample = code.substring(
          startIndex + SAMPLE_START.length + 1,
          endIndex - 1,
        );
      }

      if (this.suffix.endsWith('\n')) {
        this.suffix = this.suffix.substr(0, this.suffix.length - 1);
      }
    } else {
      if (this.state.folded) {
        sample = this.codemirror.getValue();
      } else {
        let editorValue = this.codemirror.getValue();
        sample = editorValue.substring(
          this.prefix.length,
          editorValue.length - this.suffix.length,
        );
      }
    }

    this.state = merge.all([
      this.state,
      state,
      {
        isShouldBeFolded: this.isShouldBeFolded && state.isFoldedButton,
      },
    ]);

    super.update(this.state);

    if (!this.initialized) {
      this.initializeCodeMirror(state);
      this.initialized = true;
    } else {
      this.showDiagnostics(state.errors);
      if (state.folded === undefined) {
        return;
      }
    }

    if (this.state.folded) {
      this.codemirror.setOption('lineNumbers', state.lines && !hasMarkers);
      this.codemirror.setValue(sample);
      this.markPlaceHolders();
    } else {
      this.codemirror.setOption('lineNumbers', true);
      this.codemirror.setValue(this.prefix + sample + this.suffix);
      this.codemirror.markText(
        { line: 0, ch: 0 },
        { line: countLines(this.prefix), ch: 0 },
        {
          readOnly: true,
          inclusiveLeft: true,
          inclusiveRight: false,
        },
      );
      this.codemirror.markText(
        {
          line: this.codemirror.lineCount() - countLines(this.suffix) - 1,
          ch: null,
        },
        { line: this.codemirror.lineCount() - 1, ch: null },
        {
          readOnly: true,
          inclusiveLeft: false,
          inclusiveRight: true,
        },
      );
      let readOnlyLineClass =
        this.state.theme === THEMES.DARCULA
          ? SELECTORS.UNMODIFIABLE_LINE_DARK
          : SELECTORS.UNMODIFIABLE_LINE;
      this.codemirror.operation(() => {
        for (let i = 0; i < countLines(this.prefix); i++) {
          this.codemirror.addLineClass(
            i,
            SELECTORS.BACKGROUND,
            readOnlyLineClass,
          );
        }

        for (
          let i = this.codemirror.lineCount() - countLines(this.suffix);
          i < this.codemirror.lineCount();
          i++
        ) {
          this.codemirror.addLineClass(
            i,
            SELECTORS.BACKGROUND,
            readOnlyLineClass,
          );
        }
      });
    }
    if (this.state.autoIndent || (this.prefix && this.suffix)) {
      for (let i = 0; i < this.codemirror.lineCount(); i++) {
        this.codemirror.indentLine(i);
      }
    }

    const shorterHeight = this.state.shorterHeight;

    if (shorterHeight) {
      const wrapper = this.codemirror.display.wrapper;

      if (wrapper.getBoundingClientRect().height + 10 > shorterHeight) {
        this.codemirror.display.wrapper.style.maxHeight = `${shorterHeight}px`;
      } else {
        super.update({ shorterHeight: 0 });
      }
    }
  }

  markPlaceHolders() {
    let taskRanges = this.getTaskRanges();
    this.codemirror.setValue(
      this.codemirror
        .getValue()
        .replace(new RegExp(escapeRegExp(MARK_PLACEHOLDER_OPEN), 'g'), '')
        .replace(new RegExp(escapeRegExp(MARK_PLACEHOLDER_CLOSE), 'g'), ''),
    );

    taskRanges.forEach((task) => {
      this.codemirror.markText(
        { line: task.line, ch: task.ch },
        { line: task.line, ch: task.ch + task.length },
        {
          className: SELECTORS.MARK_PLACEHOLDER,
          startStyle: SELECTORS.MARK_PLACEHOLDER_START,
          endStyle: SELECTORS.MARK_PLACEHOLDER_END,
          handleMouseEvents: true,
        },
      );
    });
  }

  getTaskRanges() {
    let textRanges = [];
    let fileContentLines = this.codemirror.getValue().split('\n');
    for (let i = 0; i < fileContentLines.length; i++) {
      let line = fileContentLines[i];
      while (line.includes(MARK_PLACEHOLDER_OPEN)) {
        let markPlaceHolderStart = line.indexOf(MARK_PLACEHOLDER_OPEN);
        line = line.replace(MARK_PLACEHOLDER_OPEN, '');
        let markPlaceHolderEnd = line.indexOf(MARK_PLACEHOLDER_CLOSE);
        line = line.replace(MARK_PLACEHOLDER_CLOSE, '');
        textRanges.push({
          line: i,
          ch: markPlaceHolderStart,
          length: markPlaceHolderEnd - markPlaceHolderStart,
        });
      }
    }
    return textRanges;
  }

  onFoldButtonMouseEnter() {
    if (!this.state.foldButtonHover) {
      this.update({ foldButtonHover: true });
    }
  }

  onFoldButtonMouseLeave() {
    if (this.state.foldButtonHover) {
      this.update({ foldButtonHover: false });
    }
  }

  onConsoleCloseButtonEnter() {
    const { jsLibs, onCloseConsole, targetPlatform, compilerVersion } = this.state;
    // creates a new iframe and removes the old one, thereby stops execution of any running script
    if (isJsRelated(targetPlatform) || isWasmRelated(targetPlatform))
      this.jsExecutor.reloadIframeScripts(
        jsLibs,
        this.getNodeForMountIframe(),
        targetPlatform,
        compilerVersion,
      );
    this.update({ output: '', openConsole: false, exception: null });
    if (onCloseConsole) onCloseConsole();
  }

  onExceptionClick(fileName, line) {
    this.codemirror.setCursor(line - 1, 0);
    this.codemirror.focus();
  }

  onFoldButtonClick() {
    this.update({ shorterHeight: 0 });
  }

  onShorterClick() {
    this.update({ shorterHeight: 0 });
  }

  execute() {
    const {
      onOpenConsole,
      targetPlatform,
      waitingForOutput,
      compilerVersion,
      onRun,
      onError,
      args,
      theme,
      hiddenDependencies,
      onTestPassed,
      onTestFailed,
      onCloseConsole,
      jsLibs,
      outputHeight,
      getJsCode,
    } = this.state;
    if (waitingForOutput) {
      return;
    }
    this.update({
      shorterHeight: 0,
      waitingForOutput: true,
      openConsole: false,
    });
    if (onOpenConsole) onOpenConsole(); //open when waitingForOutput=true
    if (onRun) onRun();
    if (isJavaRelated(targetPlatform)) {
      WebDemoApi.executeKotlinCode(
        this.getCode(),
        compilerVersion,
        targetPlatform,
        args,
        theme,
        hiddenDependencies,
        onTestPassed,
        onTestFailed,
      ).then(
        (state) => {
          state.waitingForOutput = false;
          if (state.output || state.exception) {
            state.openConsole = true;
          } else {
            if (onCloseConsole) onCloseConsole();
          }
          if ((state.errors.length > 0 || state.exception) && onError)
            onError();
          this.update(state);
        },
        (error) => {
          if (onError) onError();
          this.update({
            waitingForOutput: false,
            output: processErrors([
              {
                severity: 'ERROR',
                message: error.message,
              },
            ]),
            openConsole: true,
            exception: null,
          });
        },
      );
    } else {
      this.jsExecutor.reloadIframeScripts(
        jsLibs,
        this.getNodeForMountIframe(),
        targetPlatform,
        compilerVersion,
      );
      const additionalRequests = [];
      if (targetPlatform === TargetPlatforms.COMPOSE_WASM) {
        if (this.jsExecutor.stdlibExports) {
          additionalRequests.push(this.jsExecutor.stdlibExports);
        }
      }

      Promise.all([
        WebDemoApi.translateKotlinToJs(
          this.getCode(),
          compilerVersion,
          targetPlatform,
          args,
          hiddenDependencies,
        ),
        ...additionalRequests,
      ]).then(
        ([state, ...additionalRequestsResults]) => {
          state.waitingForOutput = false;
          const jsCode = state.jsCode;
          const wasm = state.wasm;
          delete state.jsCode;
          if (getJsCode) getJsCode(jsCode);
          let errors = state.errors.filter(
            (error) => error.severity === 'ERROR',
          );
          if (errors.length > 0) {
            if (onError) onError();
            state.output = processErrors(errors);
            state.openConsole = true;
            state.exception = null;
            this.update(state);
          } else {
            this.jsExecutor
              .executeJsCode(
                jsCode,
                wasm,
                jsLibs,
                targetPlatform,
                outputHeight,
                theme,
                onError,
                additionalRequestsResults,
              )
              .then((output) => {
                const originState = state.openConsole;

                if (
                  targetPlatform === TargetPlatforms.CANVAS ||
                  targetPlatform === TargetPlatforms.COMPOSE_WASM
                ) {
                  state.openConsole = true;
                }

                if (output) {
                  state.openConsole = true;
                  state.output = output;
                } else {
                  state.output = '';
                  if (onCloseConsole) onCloseConsole();
                }

                if (
                  onOpenConsole &&
                  originState !== state.openConsole &&
                  state.openConsole === true
                )
                  onOpenConsole();

                state.exception = null;
                this.update(state);
                /*
                if (targetPlatform === TargetPlatforms.SWIFT_EXPORT) {
                  const code = this.nodes[0]
                    .querySelector(SELECTORS.JS_CODE_OUTPUT_EXECUTOR)
                    .querySelector('.result-code');

                  if (code) {
                    CodeMirror(
                      (elt) => code.parentNode.replaceChild(elt, code),
                      {
                        mode: 'swift',
                        readOnly: 'nocursor',
                        scrollbarStyle: 'native',
                        theme: this.state.theme,
                        value: code.innerText,
                      },
                    );
                  }
                }
                */
              });
          }
        },
        (error) => {
          if (onError) onError();
          this.update({
            waitingForOutput: false,
            output: processErrors([
              {
                severity: 'ERROR',
                message: error.message,
              },
            ]),
            openConsole: true,
            exception: null,
          });
        },
      );
    }
  }

  /**
   * @param {TargetPlatform} platform
   * @return {HTMLElement}
   */
  getNodeForMountIframe() {
    return this.nodes[0].querySelector(SELECTORS.JS_CODE_OUTPUT_EXECUTOR);
  }

  getCode() {
    if (this.state.folded) {
      return this.prefix + this.codemirror.getValue() + this.suffix;
    } else {
      return this.codemirror.getValue();
    }
  }

  prefixEmptyOrContainsOnlyImports() {
    return this.prefix
      .split('\n')
      .every((line) => /^\s*(package |import |$)/.test(line));
  }

  recalculatePosition(position) {
    const newPosition = {
      line: position.line,
      ch: position.ch,
    };
    if (!this.state.folded) {
      return newPosition;
    }

    let linesInPrefix = (this.prefix.match(/\n/g) || []).length;
    newPosition.line = position.line - linesInPrefix;
    if (newPosition.line < 0) {
      newPosition.line = 0;
      newPosition.ch = 0;
    } else if (newPosition.line >= this.codemirror.lineCount()) {
      newPosition.line = this.codemirror.lineCount() - 1;
      newPosition.ch = null;
    }
    return newPosition;
  }

  showDiagnostics(diagnostics) {
    this.removeStyles();
    if (diagnostics === undefined) {
      return;
    }
    diagnostics.forEach((diagnostic) => {
      const interval = diagnostic.interval;
      if (interval == undefined) {
        return;
      }
      interval.start = this.recalculatePosition(interval.start);
      interval.end = this.recalculatePosition(interval.end);

      const errorMessage = unEscapeString(diagnostic.message);
      const severity = diagnostic.severity;
      const containsSuggestions =
        !!diagnostic.imports && diagnostic.imports.length !== 0;

      this.arrayClasses.push(
        this.codemirror.markText(interval.start, interval.end, {
          className: 'cm__' + diagnostic.className,
          title: errorMessage,
        }),
      );

      // contains suggestions => red underline
      if (containsSuggestions) {
        this.importsSuggestions.push({
          interval: interval,
          imports: diagnostic.imports,
        });
        this.arrayClasses.push(
          this.codemirror.markText(interval.start, interval.end, {
            className: 'cm__IMPORT',
          }),
        );
      }

      if (
        this.codemirror.lineInfo(interval.start.line) != null &&
        this.codemirror.lineInfo(interval.start.line).gutterMarkers == null
      ) {
        const gutter = document.createElement('div');
        gutter.className = severity + SELECTORS.GUTTER;
        gutter.setAttribute(SELECTORS.LABEL, errorMessage);
        this.codemirror.setGutterMarker(
          interval.start.line,
          SELECTORS.ERROR_AND_WARNING_GUTTER,
          gutter,
        );
      } else {
        const gutter = this.codemirror.lineInfo(interval.start.line)
          .gutterMarkers[SELECTORS.ERROR_AND_WARNING_GUTTER];
        gutter.setAttribute(
          SELECTORS.LABEL,
          gutter.getAttribute(SELECTORS.LABEL) + `\n${errorMessage}`,
        );
        if (gutter.className.indexOf(SELECTORS.ERROR_GUTTER) === -1) {
          gutter.className = severity + SELECTORS.GUTTER;
        }
      }
    });
  }

  removeStyles() {
    this.arrayClasses.forEach((it) => it.clear());
    this.codemirror.clearGutter(SELECTORS.ERROR_AND_WARNING_GUTTER);
    this.importsSuggestions = [];
  }

  initializeCodeMirror(options = {}) {
    const textarea = this.nodes[0].getElementsByTagName('textarea')[0];
    const readOnly = options.highlightOnly;
    const codemirrorOptions = {
      readOnly: readOnly,
      lineNumbers: false,
      mode: options.mode,
      theme: options.theme,
      matchBrackets: options.matchBrackets,
      scrollbarStyle: options.scrollbarStyle || 'overlay',
      continueComments: true,
      autoCloseBrackets: true,
      indentUnit: options.indent,
      viewportMargin: Infinity,
      foldGutter: true,
      gutters: [SELECTORS.ERROR_AND_WARNING_GUTTER, SELECTORS.FOLD_GUTTER],
    };

    // Workaround to allow copy code in read-only mode
    // Taken from https://github.com/codemirror/CodeMirror/issues/2568#issuecomment-308137063
    if (readOnly) {
      codemirrorOptions.cursorBlinkRate = -1;
    }

    this.codemirror = CodeMirror.fromTextArea(textarea, codemirrorOptions);

    // don't need to create additional editor options in readonly mode.
    if (readOnly) return;

    /**
     * Show highlight for extraKey Ctrl+Alt+H/Cmd+Option+H
     */
    let highlight = () => {
      const { compilerVersion, targetPlatform, hiddenDependencies } =
        this.state;
      this.removeStyles();
      WebDemoApi.getHighlight(
        this.getCode(),
        compilerVersion,
        targetPlatform,
        hiddenDependencies,
      ).then((data) => this.showDiagnostics(data));
    };

    const showImportSuggestions = (mirror) => {
      if (this.importsSuggestions.length === 0) return;
      let cur = mirror.getCursor();
      let token = mirror.getTokenAt(cur);
      let interval = {
        start: { line: cur.line, ch: token.start },
        end: { line: cur.line, ch: token.end },
      };
      let results = this.importsSuggestions
        .filter((it) => equal(it.interval, interval))
        .map((it) => it.imports)
        .flat();
      let withImports = this.canAddImport;
      if (results.length !== 0) {
        let options = {
          hint: function () {
            return {
              from: mirror.getDoc().getCursor(),
              to: mirror.getDoc().getCursor(),
              list: results.map((result) => {
                if (!withImports) {
                  result[IMPORT_NAME] = null;
                }
                return new CompletionView(result);
              }),
            };
          },
        };
        mirror.showHint(options);
      }
    };

    const hint = (mirror, callback) => {
      let cur = mirror.getCursor();
      let token = mirror.getTokenAt(cur);
      let code = this.state.folded
        ? this.prefix + mirror.getValue() + this.suffix
        : mirror.getValue();
      let currentCursor = this.state.folded
        ? { line: cur.line + this.prefix.split('\n').length - 1, ch: cur.ch }
        : cur;
      WebDemoApi.getAutoCompletion(
        code,
        currentCursor,
        this.state.compilerVersion,
        this.state.targetPlatform,
        this.state.hiddenDependencies,
        processingCompletionsList,
      );
      let withImports = this.canAddImport;

      function processingCompletionsList(results) {
        const anchorCharPosition = mirror.findWordAt({
          line: cur.line,
          ch: cur.ch,
        }).anchor.ch;
        const headCharPosition = mirror.findWordAt({
          line: cur.line,
          ch: cur.ch,
        }).head.ch;
        const currentSymbol = mirror.getRange(
          { line: cur.line, ch: anchorCharPosition },
          {
            line: cur.line,
            ch: headCharPosition,
          },
        );
        if (results.length === 0 && /^[a-zA-Z]+$/.test(currentSymbol)) {
          CodeMirror.showHint(mirror, CodeMirror.hint.auto, {
            completeSingle: false,
          });
        } else {
          callback({
            list: results.map((result) => {
              if (!withImports) result[IMPORT_NAME] = null;
              return new CompletionView(result);
            }),
            from: { line: cur.line, ch: token.start },
            to: { line: cur.line, ch: token.end },
          });
        }
      }
    };

    CodeMirror.registerHelper('hint', 'kotlin', hint);

    CodeMirror.hint.kotlin.async = true;

    CodeMirror.commands.autocomplete = (cm) => {
      cm.showHint(cm);
    };

    /**
     * Register own helper for autocomplete.
     * Getting completions from api.kotlinlang.org.
     * CodeMirror.hint.default => getting list from codemirror kotlin keywords.
     *
     * {@see WebDemoApi}      - getting data from WebDemo
     * {@see CompletionView} - implementation completion view
     */
    this.codemirror.setOption('hintOptions', { hint });

    if (window.navigator.appVersion.indexOf(MAC) !== -1) {
      this.codemirror.setOption('extraKeys', {
        'Cmd-Alt-L': 'indentAuto',
        'Shift-Tab': 'indentLess',
        'Ctrl-/': 'toggleComment',
        'Cmd-[': false,
        'Cmd-]': false,
        'Ctrl-Space': 'autocomplete',
        'Cmd-Alt-H': highlight,
        'Cmd-Alt-Enter': debounce(showImportSuggestions, DEBOUNCE_TIME),
      });
    } else {
      this.codemirror.setOption('extraKeys', {
        'Ctrl-Alt-L': 'indentAuto',
        'Shift-Tab': 'indentLess',
        'Ctrl-/': 'toggleComment',
        'Ctrl-[': false,
        'Ctrl-]': false,
        'Ctrl-Space': 'autocomplete',
        'Ctrl-Alt-H': highlight,
        'Ctrl-Alt-Enter': debounce(showImportSuggestions, DEBOUNCE_TIME),
      });
    }

    /**
     * When editor's changed:
     * 1) Remove all styles
     * 2) if onFlyHighLight flag => getting highlight
     */
    this.codemirror.on(
      'change',
      debounce((cm) => {
        const {
          onChange,
          onFlyHighLight,
          compilerVersion,
          targetPlatform,
          hiddenDependencies,
        } = this.state;
        if (onChange) onChange(cm.getValue());
        this.removeStyles();
        if (onFlyHighLight) {
          WebDemoApi.getHighlight(
            this.getCode(),
            compilerVersion,
            targetPlatform,
            hiddenDependencies,
          ).then((data) => this.showDiagnostics(data));
        }
      }, DEBOUNCE_TIME),
    );

    /**
     * If autoComplete => Getting completion on every key press on the editor.
     */
    this.codemirror.on(
      'keypress',
      debounce((cm, event) => {
        if (event.keyCode !== KEY_CODES.R && !event.ctrlKey) {
          if (this.state.autoComplete && !cm.state.completionActive) {
            CodeMirror.showHint(cm, CodeMirror.hint.kotlin, {
              completeSingle: false,
            });
          }
        }
      }, DEBOUNCE_TIME),
    );

    /**
     * Select marker's placeholder on mouse click
     */
    this.codemirror.on('mousedown', (codemirror, event) => {
      let position = codemirror.coordsChar({
        left: event.pageX,
        top: event.pageY,
      });
      if (position.line !== 0 || position.ch !== 0) {
        let markers = codemirror.findMarksAt(position);
        let todoMarker = markers.find(
          (marker) => marker.className === SELECTORS.MARK_PLACEHOLDER,
        );
        if (todoMarker != null) {
          let markerPosition = todoMarker.find();
          codemirror.setSelection(markerPosition.from, markerPosition.to);
          codemirror.focus();
          event.preventDefault();
        }
      }
    });
  }

  destroy() {
    this.canAddImport = false;
    this.importsSuggestions = [];
    this.arrayClasses = null;
    this.initialized = false;
    this.jsExecutor = false;
    this.state = null;
    this.codemirror.toTextArea();
    this.off();
    this.remove();
  }
}
