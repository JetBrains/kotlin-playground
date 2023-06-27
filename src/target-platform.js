class TargetPlatform {
  constructor(id, printableName) {
    this.id = id;
    this.printableName = printableName;
  }

  static getById(id) {
    switch (id) {
      case "js":
        return TargetPlatform.JS;
      case "js-ir":
        return TargetPlatform.JS_IR;
      case "wasm":
        return TargetPlatform.WASM;
      case "junit":
        return TargetPlatform.JUNIT;
      case "canvas":
        return TargetPlatform.CANVAS;
      default:
        return TargetPlatform.JAVA;
    }
  }

  static isJavaRelated(platform) {
    return platform === TargetPlatform.JAVA || platform === TargetPlatform.JUNIT
  }

  static isJsRelated(platform) {
    return platform === TargetPlatform.JS || platform === TargetPlatform.JS_IR || platform === TargetPlatform.CANVAS ||
      platform === TargetPlatform.WASM
  }
}

TargetPlatform.JS = new TargetPlatform('js', 'JavaScript');
TargetPlatform.JS_IR = new TargetPlatform('js-ir', 'JavaScript IR');
TargetPlatform.WASM = new TargetPlatform('wasm', 'Wasm');
TargetPlatform.JAVA = new TargetPlatform('java', 'JVM');
TargetPlatform.JUNIT = new TargetPlatform('junit', 'JUnit');
TargetPlatform.CANVAS = new TargetPlatform('canvas', 'JavaScript(canvas)');

export default TargetPlatform
