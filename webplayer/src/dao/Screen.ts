import { myParseBoolean, myParseInt } from '../manager/Helper';

export class Screen {
  public id!: number;
  public name!: string;
  public environment_id!: number;
  public environment!: string;
  public house_id!: number;
  public house!: string;
  /** L or P */
  public orientation!: string;
  /** Y or N */
  public uhd!: boolean;
  public params?: string;
  private seq_refs?: any[];
  public seq_id?: number;
  /** Screen dimensions from server */
  public width?: string | number;
  public height?: string | number;
  /** Screen enabled status */
  public enabled?: boolean;

  public static getScreenById(id: number): Screen | undefined {
    // TODO
    return undefined;
  }

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.environment_id = myParseInt(this.environment_id);
    this.house_id = myParseInt(this.house_id);
    this.uhd = myParseBoolean(this.uhd);
    if (this.seq_refs) {
      this.seq_id = myParseInt(this.seq_refs[0].id);
    }
  }
}
