export default class TargetPlatform {
  private id: string;
  private printableName: string;

  constructor(id: string, printableName: string) {
    this.id = id;
    this.printableName = printableName;
  }
}
