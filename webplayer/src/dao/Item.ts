import { Artwork } from './Artwork';
import { Line } from './Line';
import { Rect } from './Rect';
import { Text } from './Text';
import { Shape } from './Shape';
import { myParseFloat, myParseInt } from '../manager/Helper';

export const MinimumItemDuration = 1;
export const MinimumRepeatDuration = 0.5;

/**
 * An element in a track
 */
export class Item {
  public artwork_id?: number;
  public artwork?: Artwork;
  /** NB: offset + duration = offset of the next element in the track. NB: actually wrong value */
  public offset!: number;
  /** Total duration */
  public duration!: number;
  /** Only applies to time-related artworks. Specifies how many times to play that item */
  public repeat!: number;
  /** Only applies to time-related artworks. Specifies the duration of the last loop. */
  public last_repeat_duration!: number;
  public background_color?: string;
  public shapes?: Shape[];

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.offset = myParseFloat(this.offset);
    this.duration = myParseFloat(this.duration);
    this.repeat = myParseInt(this.repeat);
    this.last_repeat_duration = myParseFloat(this.last_repeat_duration);
    this.artwork_id = myParseInt(this.artwork_id);
    if (this.artwork_id) {
      this.artwork = new Artwork(this);
    }
    if (this.shapes) {
      this.shapes = this.shapes.map(s => {
        if (s.tag_name === 'line') {
          return new Line(s);
        } else if (s.tag_name === 'rect') {
          return new Rect(s);
        } else if (s.tag_name === 'text') {
          return new Text(s);
        } else {
          console.log('## Unknown shape: ' + s);
          return new Shape();
        }
      });
    }
    // Other
    if (this.artwork) {
      if (this.repeat > 1 && this.last_repeat_duration <= MinimumRepeatDuration) {
        this.last_repeat_duration += this.artwork.duration;
        this.repeat--;
      }
    }
  }

  public get duration1() {
    if (this.artwork) {
      return this.artwork.duration;
    } else {
      return this.duration;
    }
  }
}
