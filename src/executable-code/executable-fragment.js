import merge from 'deepmerge';
import CodeMirror from 'codemirror';
import Monkberry from 'monkberry';
import directives from 'monkberry-directives';
import 'monkberry-events';
import ExecutableCodeTemplate from './executable-fragment.monk';
import WebDemoApi from '../webdemo-api';
import TargetPlatform from "../target-platform";
import getJsExecutor from "../js-executor"
import {countLines, unEscapeString} from "../utils";
import escapeStringRegexp from "escape-string-regexp"
import ComplectionView from "../view/complection-view";
import {showJsException} from "../view/output-view";

const SAMPLE_START = '//sampleStart';
const SAMPLE_END = '//sampleEnd';
const MARK_PLACEHOLDER_OPEN = "[mark]";
const MARK_PLACEHOLDER_CLOSE = "[/mark]";
const CANVAS_PLACEHOLDER_OUTPUT_CLASS = ".js-code-output-canvas-placeholder";

export default class ExecutableFragment extends ExecutableCodeTemplate {
  static render(element, options = {}) {
    const instance = Monkberry.render(ExecutableFragment, element, {
      'directives': directives
    });

    instance.arrayClasses = [];
    instance.initialized = false;
    instance.state = {
      code: '',
      foldButtonHover: false,
      folded: true,
      output: null,
    };
    instance.codemirror = new CodeMirror();

    instance.on('click', '.fold-button', (event) => {
      instance.update({folded: !instance.state.folded});
    });

    return instance;
  }

  get isShouldBeFolded() {
    return this.prefix.trim() !== '' || this.suffix.trim() !== '';
  }

  update(state) {
    let sample;
    let platform = state.targetPlatform;
    if (state.compilerVersion && (platform === TargetPlatform.JS || platform === TargetPlatform.CANVAS)) {
      this.jsExecutor = getJsExecutor(state.compilerVersion, state.jsLibs, this.getNodeForMountIframe(platform), platform)
    }

    if (state.code) {
      const code = state.code;
      const codeLen = code.length;
      const startIndex = code.indexOf(SAMPLE_START);
      const endIndex = code.indexOf(SAMPLE_END);
      const hasMarkers = startIndex > -1 && endIndex > -1;

      this.prefix = '';
      this.suffix = '';
      sample = code;

      if (hasMarkers) {
        this.prefix = code.substring(0, startIndex);
        this.suffix = code.substring(code.indexOf(SAMPLE_END) + SAMPLE_END.length);
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
      this.codemirror.setOption("lineNumbers", false);
      this.codemirror.setValue(sample);
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

      for (let i = 0; i < countLines(this.prefix); i++) {
        this.codemirror.addLineClass(i, "background", 'unmodifiable-line')
      }

      for (let i = this.codemirror.lineCount() - countLines(this.suffix); i < this.codemirror.lineCount(); i++) {
        this.codemirror.addLineClass(i, "background", 'unmodifiable-line')
      }
    }

    for (let i = 0; i < this.codemirror.lineCount(); i++) {
      this.codemirror.indentLine(i)
    }

    let taskRanges = this.getTaskRanges();
    this.codemirror.setValue(this.codemirror.getValue()
      .replace(new RegExp(escapeStringRegexp(MARK_PLACEHOLDER_OPEN), 'g'), "")
      .replace(new RegExp(escapeStringRegexp(MARK_PLACEHOLDER_CLOSE), 'g'), ""));

    taskRanges.forEach(task => {
      this.codemirror.markText({line: task.line, ch: task.ch}, {line: task.line, ch: task.ch + task.length}, {
        className: "taskWindow",
        startStyle: "taskWindow-start",
        endStyle: "taskWindow-end",
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
        let taskWindowStart = line.indexOf(MARK_PLACEHOLDER_OPEN);
        line = line.replace(MARK_PLACEHOLDER_OPEN, "");
        let taskWindowEnd = line.indexOf(MARK_PLACEHOLDER_CLOSE);
        line = line.replace(MARK_PLACEHOLDER_CLOSE, "");
        textRanges.push({line: i, ch: taskWindowStart, length: taskWindowEnd - taskWindowStart});
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

  execute() {
    if (this.state.waitingForOutput) {
      return
    }
    this.update({
      waitingForOutput: true
    });
    let platform = this.state.targetPlatform;
    if (platform === TargetPlatform.JAVA || platform === TargetPlatform.JUNIT) {
      WebDemoApi.executeKotlinCode(this.getCode(), this.state.compilerVersion, platform).then(
        state => {
          state.waitingForOutput = false;
          this.update(state);
        },
        () => this.update({waitingForOutput: false})
      )
    } else {
      if (platform === TargetPlatform.CANVAS) this.jsExecutor.reloadIframeScripts(this.state.jsLibs, this.getNodeForMountIframe(platform));
      WebDemoApi.translateKotlinToJs(this.getCode(), this.state.compilerVersion, platform).then(
        state => {
          state.waitingForOutput = false;
          const jsCode = state.jsCode;
          delete state.jsCode;
          try {
            const codeOutput = this.jsExecutor.executeJsCode(jsCode, this.state.jsLibs, platform, this.getNodeForMountIframe(platform));
            codeOutput ? state.output = `<span class="standard-output">${codeOutput}</span>` : state.output = ""
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
      : this.nodes[0].querySelector(CANVAS_PLACEHOLDER_OUTPUT_CLASS);
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
      mode: 'text/x-kotlin',
      indentUnit: 4,
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
     * {@see ComplectionView} - implementation completion view
     */
    CodeMirror.registerHelper('hint', 'kotlin', (mirror, callback) => {
      let cur = mirror.getCursor();
      let token = mirror.getTokenAt(cur);
      WebDemoApi.getAutoCompletion(
        mirror.getValue(),
        cur,
        this.state.compilerVersion,
        this.state.targetPlatform,
        processingCompletionsList
      );

      function processingCompletionsList(results) {
        callback({
          list: results.map(result => {
            return new ComplectionView(result)
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

    this.codemirror.on("change", codemirror => {
      this.removeStyles()
    })
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
