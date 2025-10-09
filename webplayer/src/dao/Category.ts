import { myParseInt } from '../manager/Helper';

export class Category {
  public id!: number;
  public category!: string;

  public constructor(json?: any) {
    this.id = myParseInt(this.id);
    if (json) {
      Object.assign(this, json);
    }
  }
}
