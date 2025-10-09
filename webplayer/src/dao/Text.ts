import { Shape } from './Shape';
import { myParseFloat, myParseInt } from '../manager/Helper';

export class Text extends Shape {
  public text!: string;
  public size?: number;
  public font?: string;
  public color?: string;
  public x!: number;
  public y!: number;
  public width!: number;
  public height!: number;
  /** left, right, etc */
  public halign?: string;
  /** top, bottom, etc */
  public valign?: string;

  public constructor(json?: any) {
    super(json);
    this.size = myParseFloat(this.size);
    this.x = myParseInt(this.x);
    this.y = myParseInt(this.y);
    this.width = myParseInt(this.width);
    this.height = myParseInt(this.height);
    // Other
    this.size = this.size || this.height * 0.9;
    if (this.font === 'serif') {
      this.font = 'Serif';
    } else if (this.font === 'handwrite') {
      this.font = 'Comic Sans MS';
    } else if (this.font === 'impact') {
      this.font = 'Impact';
    } else {
      this.font = 'SansSerif';
    }
  }
}
