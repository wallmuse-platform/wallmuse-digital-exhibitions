import { myParseInt } from '../manager/Helper';

export class ScreenRef {
  public id!: number;
  public seq_ref!: number;

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.seq_ref = myParseInt(this.seq_ref);
  }
}
