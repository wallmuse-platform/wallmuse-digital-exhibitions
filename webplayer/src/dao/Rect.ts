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
    this.line_size = myParseInt(this.line_size);
    this.left = myParseInt(this.left);
    this.top = myParseInt(this.top);
    this.right = myParseInt(this.right);
    this.bottom = myParseInt(this.bottom);
  }
}
