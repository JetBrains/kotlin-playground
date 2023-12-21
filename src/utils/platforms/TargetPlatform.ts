export default class TargetPlatform {
  id: string;
  printableName: string;

  constructor(id: string, printableName: string) {
    this.id = id;
    this.printableName = printableName;
  }
}
