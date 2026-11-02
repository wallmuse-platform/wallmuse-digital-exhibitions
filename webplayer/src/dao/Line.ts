import { Shape } from './Shape';
import { myParseInt } from '../manager/Helper';

export class Line extends Shape {
  public line_size!: number;
  public color?: string;
  public x1!: number;
  public y1!: number;
  public x2!: number;
  public y2!: number;

  public constructor(json?: any) {
    super(json);
    // BABEL FIX: Restore values overwritten by Babel field initializers ("this.prop = void 0")
    // that run AFTER super(), wiping what Shape's Object.assign(this, json) set.
    // Same pattern required in every Shape subclass — see Text.ts for full explanation.
    if (json) Object.assign(this, json);
    this.line_size = myParseInt(this.line_size);
    this.x1 = myParseInt(this.x1);
    this.y1 = myParseInt(this.y1);
    this.x2 = myParseInt(this.x2);
    this.y2 = myParseInt(this.y2);
  }
}
