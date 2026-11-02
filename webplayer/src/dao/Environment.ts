import { Screen } from './Screen';
import { myParseBoolean, myParseInt } from '../manager/Helper';

export class Environment {
  public id!: number;
  public name!: string;
  public house!: number;
  /** 1 or 0 */
  public master!: boolean;
  public master_ip?: string;
  public master_port?: number;
  public crypt_key?: string;
  /** 1 or 0 */
  public screens: Screen[];
  alive?: string;

  public constructor(json?: any) {
    this.id = myParseInt(this.id);
    this.house = myParseInt(this.house);
    this.master = myParseBoolean(this.master);
    this.master_port = myParseInt(this.master_port);
    if (json) {
      Object.assign(this, json);
    }
    // @ts-ignore
    if (this.screens) {
      this.screens = this.screens.map(s => new Screen(s));
    } else {
      this.screens = [];
    }
  }
}
