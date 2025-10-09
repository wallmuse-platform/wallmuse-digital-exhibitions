export class Shape {
  tag_name!: string;

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
  }
}
