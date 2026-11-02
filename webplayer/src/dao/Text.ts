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
    // BABEL FIX: Re-apply JSON onto this instance after super().
    // CRA's @babel/plugin-proposal-class-properties generates "this.prop = void 0"
    // for every declared class field, and those initializers run AFTER super() returns,
    // silently wiping every value that Shape's constructor set via Object.assign(this, json).
    // This pattern MUST appear at the top of every Shape subclass constructor.
    if (json) Object.assign(this, json);
    this.size = myParseFloat(this.size);
    this.x = myParseInt(this.x);
    this.y = myParseInt(this.y);
    this.width = myParseInt(this.width);
    this.height = myParseInt(this.height);
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
