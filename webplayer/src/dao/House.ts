import { Environment } from './Environment';
import { myParseBoolean, myParseInt } from '../manager/Helper';

export class House {
  public id!: number;
  public name!: string;
  public user!: number;
  /** 1 or 0 */
  public autostart_playlist!: boolean;
  public crypt_key?: string;
  public environments?: Environment[];

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.user = myParseInt(this.user);
    this.autostart_playlist = myParseBoolean(this.autostart_playlist);
    if (this.environments) {
      this.environments = this.environments.map(e => new Environment(e));
    }
  }
}
