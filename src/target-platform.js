class TargetPlatform {
  constructor(id, printableName) {
    this.id = id;
    this.printableName = printableName;
  }

  static getById(id) {
    switch (id) {
      case "js":
        return TargetPlatform.JS;
      case "java":
        return TargetPlatform.JAVA;
      default:
        throw Error("Unknown platform " + id);
    }
  }
}

TargetPlatform.JS = new TargetPlatform('js', 'JavaScript');
TargetPlatform.JAVA = new TargetPlatform('java', 'JVM');

export default TargetPlatform
