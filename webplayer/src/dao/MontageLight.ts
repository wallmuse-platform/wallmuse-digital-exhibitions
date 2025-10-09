import { myParseDatetime, myParseFloat, myParseInt } from '../manager/Helper';

export class MontageLight {
  public id!: number;
  public name!: string;
  public thumbnail_url?: string;
  public rating?: string;
  public author_id!: number;
  public author?: string;
  public mdate!: Date;
  public duration: number;

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.author_id = myParseInt(this.author_id);
    this.mdate = myParseDatetime(this.mdate);
    // @ts-ignore
    this.duration = myParseFloat(this.duration);
  }
}
