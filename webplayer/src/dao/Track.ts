import { ScreenId } from './ScreenId';
import { Item } from './Item';
import { myParseInt } from '../manager/Helper';

export class Track {
  public id!: number;
  public items: Item[];
  public screens?: ScreenId[];

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.items = json.array_content.map((i: any) => new Item(i));
  }
}
