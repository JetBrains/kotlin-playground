import merge from 'deepmerge';
import CodeMirror from 'codemirror';
import Monkberry from 'monkberry';
import directives from 'monkberry-directives';
import 'monkberry-events';
import ExecutableCodeTemplate from './executable-fragment.monk';
import WebDemoApi from '../webdemo-api';
import TargetPlatform from "../target-platform";
import getJsExecutor from "../js-executor"
import {countLines, THEMES, unEscapeString} from "../utils";
import escapeStringRegexp from "escape-string-regexp"
import CompletionView from "../view/completion-view";
import {processErrors, showJsException} from "../view/output-view";

const SAMPLE_START = '//sampleStart';
const SAMPLE_END = '//sampleEnd';
const MARK_PLACEHOLDER_OPEN = "[mark]";
const MARK_PLACEHOLDER_CLOSE = "[/mark]";
const F9_KEY = 120;

const CLASS_NAME_SELECTORS = {
  CANVAS_PLACEHOLDER_OUTPUT: ".js-code-output-canvas-placeholder",
  FOLD_BUTTON: ".fold-button",
  UNMODIFIABLE_LINE_DARK: "unmodifiable-line-dark",
  UNMODIFIABLE_LINE: "unmodifiable-line",
  MARK_PLACEHOLDER: "markPlaceholder",
  MARK_PLACEHOLDER_START: "markPlaceholder-start",
  MARK_PLACEHOLDER_END: "markPlaceholder-end"
};

export default class ExecutableFragment extends ExecutableCodeTemplate {
  static render(element, options = {}) {
    const instance = Monkberry.render(ExecutableFragment, element, {
      'directives': directives
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

    instance.on('click', CLASS_NAME_SELECTORS.FOLD_BUTTON, (event) => {
      instance.update({folded: !instance.state.folded});
    });

    instance.on('keyup', (event) => {
      if (event.keyCode === F9_KEY && event.ctrlKey) {
        instance.execute();
      }
    });

    return instance;
  }

  get isShouldBeFolded() {
    return this.prefix.trim() !== '' || this.suffix.trim() !== '';
  }

  update(state) {
    let sample;
    let hasMarkers = false;
    let platform = state.targetPlatform;
    if (state.compilerVersion && (platform === TargetPlatform.JS || platform === TargetPlatform.CANVAS)) {
      this.jsExecutor = getJsExecutor(state.compilerVersion, state.jsLibs, this.getNodeForMountIframe(platform), platform)
    }

    if (state.code) {
      let code = state.code;
      if (state.from && state.to && state.to >= state.from && state.from > 0 && state.to > 0) {
        let codeLines = code.split('\n');
        codeLines.splice(state.from - 1, 0, SAMPLE_START);
        codeLines.splice(state.to + 1, 0, SAMPLE_END);
        code = codeLines.join("\n")
      }
      const startIndex = code.indexOf(SAMPLE_START);
      const endIndex = code.indexOf(SAMPLE_END);
      hasMarkers = !state.noneMarkers && (startIndex > -1 && endIndex > -1);

      this.prefix = '';
      this.suffix = '';
      sample = code;

      if (hasMarkers) {
        this.prefix = code.substring(0, startIndex);
        this.suffix = code.substring(endIndex + SAMPLE_END.length);
        sample = code.substring(startIndex + SAMPLE_START.length + 1, endIndex - 1);
      }

      if (this.suffix.endsWith('\n')) {
        this.suffix = this.suffix.substr(0, this.suffix.length - 1)
      }
    } else {
      if (this.state.folded) {
        sample = this.codemirror.getValue();
      } else {
        let editorValue = this.codemirror.getValue();
        sample = editorValue.substring(this.prefix.length, editorValue.length - this.suffix.length);
      }
    }

    this.state = merge.all([this.state, state, {
      isShouldBeFolded: this.isShouldBeFolded && state.isFoldedButton
    }]);

    super.update(this.state);
    if (!this.initialized) {
      this.initializeCodeMirror(state);
      this.initialized = true;
    } else {
      this.showDiagnostics(state.errors);
      if (state.folded === undefined) {
        return
      }
    }

    if (this.state.folded) {
      this.codemirror.setOption("lineNumbers", state.lines && !hasMarkers);
      this.codemirror.setValue(sample);
      this.markPlaceHolders();
    } else {
      this.codemirror.setOption("lineNumbers", true);
      this.codemirror.setValue(this.prefix + sample + this.suffix);
      this.codemirror.markText(
        {line: 0, ch: 0},
        {line: countLines(this.prefix), ch: 0},
        {
          readOnly: true,
          inclusiveLeft: true,
          inclusiveRight: false
        }
      );
      this.codemirror.markText(
        {line: this.codemirror.lineCount() - countLines(this.suffix) - 1, ch: null},
        {line: this.codemirror.lineCount() - 1, ch: null},
        {
          readOnly: true,
          inclusiveLeft: false,
          inclusiveRight: true
        }
      );
      let readOnlyLineClass = this.state.theme === THEMES.DARCULA ? CLASS_NAME_SELECTORS.UNMODIFIABLE_LINE_DARK : CLASS_NAME_SELECTORS.UNMODIFIABLE_LINE;
      this.codemirror.operation(() => {
        for (let i = 0; i < countLines(this.prefix); i++) {
          this.codemirror.addLineClass(i, "background", readOnlyLineClass)
        }

        for (let i = this.codemirror.lineCount() - countLines(this.suffix); i < this.codemirror.lineCount(); i++) {
          this.codemirror.addLineClass(i, "background", readOnlyLineClass)
        }
      })
    }
    if (this.state.autoIndent || (this.prefix && this.suffix)) {
      for (let i = 0; i < this.codemirror.lineCount(); i++) {
        this.codemirror.indentLine(i)
      }
    }
  }

  markPlaceHolders() {
    let taskRanges = this.getTaskRanges();
    this.codemirror.setValue(this.codemirror.getValue()
      .replace(new RegExp(escapeStringRegexp(MARK_PLACEHOLDER_OPEN), 'g'), "")
      .replace(new RegExp(escapeStringRegexp(MARK_PLACEHOLDER_CLOSE), 'g'), ""));

    taskRanges.forEach(task => {
      this.codemirror.markText({line: task.line, ch: task.ch}, {line: task.line, ch: task.ch + task.length}, {
        className: CLASS_NAME_SELECTORS.MARK_PLACEHOLDER,
        startStyle: CLASS_NAME_SELECTORS.MARK_PLACEHOLDER_START,
        endStyle: CLASS_NAME_SELECTORS.MARK_PLACEHOLDER_END,
        handleMouseEvents: true
      });
    });
  }

  getTaskRanges() {
    let textRanges = [];
    let fileContentLines = this.codemirror.getValue().split("\n");
    for (let i = 0; i < fileContentLines.length; i++) {
      let line = fileContentLines[i];
      while (line.includes(MARK_PLACEHOLDER_OPEN)) {
        let markPlaceHolderStart = line.indexOf(MARK_PLACEHOLDER_OPEN);
        line = line.replace(MARK_PLACEHOLDER_OPEN, "");
        let markPlaceHolderEnd = line.indexOf(MARK_PLACEHOLDER_CLOSE);
        line = line.replace(MARK_PLACEHOLDER_CLOSE, "");
        textRanges.push({line: i, ch: markPlaceHolderStart, length: markPlaceHolderEnd - markPlaceHolderStart});
      }
    }
    return textRanges;
  }

  onFoldButtonMouseEnter() {
    if (!this.state.foldButtonHover) {
      this.update({foldButtonHover: true})
    }
  }

  onFoldButtonMouseLeave() {
    if (this.state.foldButtonHover) {
      this.update({foldButtonHover: false})
    }
  }

  onConsoleCloseButtonEnter() {
    if (this.state.targetPlatform === TargetPlatform.CANVAS) {
      this.jsExecutor.reloadIframeScripts(this.state.jsLibs, this.getNodeForMountIframe(TargetPlatform.CANVAS));
    }
    this.update({output: "", openConsole: false});
  }

  execute() {
    if (this.state.waitingForOutput) {
      return
    }
    this.update({
      waitingForOutput: true,
      openConsole: false
    });
    let platform = this.state.targetPlatform;
    if (platform === TargetPlatform.JAVA || platform === TargetPlatform.JUNIT) {
      WebDemoApi.executeKotlinCode(
        this.getCode(),
        this.state.compilerVersion,
        platform, this.state.args,
        this.state.theme,
        this.state.hiddenDependencies).then(
        state => {
          state.waitingForOutput = false;
          if (state.output) state.openConsole = true;
          this.update(state);
        },
        () => this.update({waitingForOutput: false})
      )
    } else {
      if (platform === TargetPlatform.CANVAS) this.jsExecutor.reloadIframeScripts(this.state.jsLibs, this.getNodeForMountIframe(platform));
      WebDemoApi.translateKotlinToJs(this.getCode(), this.state.compilerVersion, platform, this.state.args, this.state.hiddenDependencies).then(
        state => {
          state.waitingForOutput = false;
          const jsCode = state.jsCode;
          delete state.jsCode;
          try {
            let errors = state.errors.filter(error => error.severity === "ERROR");
            if (errors.length > 0) {
              state.output = processErrors(errors);
            } else {
              const codeOutput = this.jsExecutor.executeJsCode(jsCode, this.state.jsLibs, platform, this.getNodeForMountIframe(platform));
              if (codeOutput) {
                state.openConsole = true;
                state.output = `<span class="standard-output ${this.state.theme}">${codeOutput}</span>`
              } else state.output = "";
              if (platform === TargetPlatform.CANVAS) state.openConsole = true;
            }
          } catch (e) {
            let exceptionOutput = showJsException(e);
            state.output = `<span class="error-output">${exceptionOutput}</span>`;
            console.error(e);
          }
          state.exception = null;
          this.update(state);
        },
        () => this.update({waitingForOutput: false})
      )

    }
  }

  /**
   * @param {TargetPlatform} platform
   * @return {HTMLElement}
   */
  getNodeForMountIframe(platform) {
    return platform === TargetPlatform.JS
      ? document.body
      : this.nodes[0].querySelector(CLASS_NAME_SELECTORS.CANVAS_PLACEHOLDER_OUTPUT);
  }

  getCode() {
    if (this.state.folded) {
      return this.prefix + this.codemirror.getValue() + this.suffix
    } else {
      return this.codemirror.getValue()
    }
  }

  recalculatePosition(position) {
    const newPosition = {
      line: position.line,
      ch: position.ch
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
    return newPosition
  }

  showDiagnostics(diagnostics) {
    this.removeStyles();
    if (diagnostics === undefined) {
      return;
    }
    diagnostics.forEach(diagnostic => {
      const interval = diagnostic.interval;
      interval.start = this.recalculatePosition(interval.start);
      interval.end = this.recalculatePosition(interval.end);

      const errorMessage = unEscapeString(diagnostic.message);
      const severity = diagnostic.severity;

      this.arrayClasses.push(this.codemirror.markText(interval.start, interval.end, {
        "className": "cm__" + diagnostic.className,
        "title": errorMessage
      }));

      if ((this.codemirror.lineInfo(interval.start.line) != null) &&
        (this.codemirror.lineInfo(interval.start.line).gutterMarkers == null)) {
        const gutter = document.createElement("div");
        gutter.className = severity + "gutter";
        gutter.title = errorMessage;

        this.codemirror.setGutterMarker(interval.start.line, "errors-and-warnings-gutter", gutter)
      } else {
        const gutter = this.codemirror.lineInfo(interval.start.line).gutterMarkers["errors-and-warnings-gutter"];
        gutter.title += `\n${errorMessage}`;
        if (gutter.className.indexOf("ERRORgutter") === -1) {
          gutter.className = severity + "gutter"
        }
      }
    });
  }

  removeStyles() {
    this.arrayClasses.forEach(it => it.clear());
    this.codemirror.clearGutter("errors-and-warnings-gutter")
  }

  initializeCodeMirror(options = {}) {
    const textarea = this.nodes[0].getElementsByTagName('textarea')[0];
    const readOnly = options.highlightOnly && options.highlightOnly === true;
    const codemirrorOptions = {
      readOnly: readOnly,
      lineNumbers: false,
      mode: options.mode,
      theme: options.theme,
      matchBrackets: true,
      continueComments: true,
      autoCloseBrackets: true,
      indentUnit: options.indent,
      viewportMargin: Infinity,
      foldGutter: true,
      gutters: [
        "errors-and-warnings-gutter",
        "CodeMirror-foldgutter"
      ]
    };

    // Workaround to allow copy code in read-only mode
    // Taken from https://github.com/codemirror/CodeMirror/issues/2568#issuecomment-308137063
    if (readOnly) {
      codemirrorOptions.cursorBlinkRate = -1;
    }

    /**
     * Register own helper for autocomplete.
     * Getting complections from try.kotlinlang.org.
     * {@see WebDemoApi}      - getting data from WebDemo
     * {@see CompletionView} - implementation completion view
     */
    CodeMirror.registerHelper('hint', 'kotlin', (mirror, callback) => {
      let cur = mirror.getCursor();
      let token = mirror.getTokenAt(cur);
      WebDemoApi.getAutoCompletion(
        mirror.getValue(),
        cur,
        this.state.compilerVersion,
        this.state.targetPlatform,
        this.state.hiddenDependencies,
        processingCompletionsList
      );

      function processingCompletionsList(results) {
        callback({
          list: results.map(result => {
            return new CompletionView(result)
          }),
          from: {line: cur.line, ch: token.start},
          to: {line: cur.line, ch: token.end}
        })
      }
    });

    CodeMirror.hint.kotlin.async = true;

    CodeMirror.commands.autocomplete = (cm) => {
      CodeMirror.showHint(cm, CodeMirror.hint.kotlin);
    };

    this.codemirror = CodeMirror.fromTextArea(textarea, codemirrorOptions);

    if (window.navigator.appVersion.indexOf("Mac") !== -1) {
      this.codemirror.setOption("extraKeys", {
        "Cmd-Alt-L": "indentAuto",
        "Shift-Tab": "indentLess",
        "Ctrl-/": "toggleComment",
        "Cmd-[": false,
        "Cmd-]": false,
        "Ctrl-Space": "autocomplete"
      })
    } else {
      this.codemirror.setOption("extraKeys", {
        "Ctrl-Alt-L": "indentAuto",
        "Shift-Tab": "indentLess",
        "Ctrl-/": "toggleComment",
        "Ctrl-[": false,
        "Ctrl-]": false,
        "Ctrl-Space": "autocomplete"
      })
    }

    /**
     * When editor's changed:
     * 1) Remove all styles
     * 2) if onFlyHighLight flag => getting highlight
     */
    this.codemirror.on("change", () => {
      this.removeStyles();
      if (this.state.onFlyHighLight) {
        WebDemoApi.getHighlight(
          this.getCode(),
          this.state.compilerVersion,
          this.state.targetPlatform,
          this.state.hiddenDependencies).then(data => this.showDiagnostics(data))
      }
    });

    /**
     * Select marker's placeholder on mouse click
     */
    this.codemirror.on("mousedown", (codemirror, event) => {
      let position = codemirror.coordsChar({left: event.pageX, top: event.pageY});
      if (position.line !== 0 || position.ch !== 0) {
        let markers = codemirror.findMarksAt(position);
        let todoMarker = markers.find(marker => marker.className === CLASS_NAME_SELECTORS.MARK_PLACEHOLDER);
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
    this.arrayClasses = null;
    this.initialized = false;
    this.jsExecutor = false;
    this.state = null;
    this.codemirror.toTextArea();
    this.remove();
  }
}
