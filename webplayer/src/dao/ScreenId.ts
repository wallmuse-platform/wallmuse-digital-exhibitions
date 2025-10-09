import { myParseInt } from '../manager/Helper';

export class ScreenId {
  public id!: number;

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
  }
}
