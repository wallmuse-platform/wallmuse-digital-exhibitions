import { Shape } from './Shape';
import { myParseInt } from '../manager/Helper';

export class Rect extends Shape {
  public line_size?: number;
  public color?: string;
  public background_color?: string;
  public left!: number;
  public top!: number;
  public right!: number;
  public bottom!: number;

  public constructor(json?: any) {
    super(json);
    // BABEL FIX: Restore values overwritten by Babel field initializers ("this.prop = void 0")
    // that run AFTER super(), wiping what Shape's Object.assign(this, json) set.
    // Same pattern required in every Shape subclass — see Text.ts for full explanation.
    if (json) Object.assign(this, json);
    this.line_size = myParseInt(this.line_size);
    this.left = myParseInt(this.left);
    this.top = myParseInt(this.top);
    this.right = myParseInt(this.right);
    this.bottom = myParseInt(this.bottom);
  }
}
