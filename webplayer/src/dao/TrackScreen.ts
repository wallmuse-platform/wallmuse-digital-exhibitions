export class TrackScreen {
  public id!: number;
  public name!: string;
  public environment_id!: number;
  public environment!: string;
  public house_id!: number;
  public house!: string;
  /** L or P */
  public orientation!: string;
  /** Y or N */
  public uhd!: string;
  public seq!: number;

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
  }
}
