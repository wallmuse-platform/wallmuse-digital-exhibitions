import { Shape } from '../dao/Shape';
import { LogHelper } from '../manager/LogHelper';
import logo from '../assets/logo-hd.png';

export abstract class MediaFile {
  public static placeholder = logo;

  public artworkId?: number;
  protected id: string;
  public url?: string;
  public filename?: string;
  public offset: number;
  public duration: number;
  protected isPlaceholder = false;
  protected usePlaceholder = false;
  // TODO
  // private List<CompoundAnimation> animations = new ArrayList<>();
  protected shapes: Shape[];
  private shapesAdded = false;
  protected backgroundColor?: string;

  public static init() {
    // TODO
    // placeholderImageFile = new File(Configuration.getCacheLocation(), "placeholder.png");
  }

  // Static method to create empty media file to avoid circular dependencies
  public static getEmpty(
    id: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ): MediaFile {
    // Create a simple placeholder that extends MediaFile
    return new (class extends MediaFile {
      constructor() {
        super(0, id, undefined, undefined, offset, duration, shapes, backgroundColor);
      }

      loadUrl(url: string) {
        // Empty implementation
      }

      start(offset: number) {
        // Empty implementation
      }

      isVideo() {
        return false;
      }
    })();
  }

  protected constructor(
    aid: number,
    id: string,
    url: string | undefined,
    filename: string | undefined,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    this.artworkId = aid;
    this.id = id;
    this.url = url;
    this.filename = filename;
    this.offset = offset;
    this.duration = duration;
    this.shapes = shapes ? shapes : [];
    this.backgroundColor = backgroundColor;
  }

  /**
   * Load the media and calls the callback
   */
  public load(callback: () => void) {
    if (!this.isPlaceholder) {
      const url = this.getMediaURL(callback);
    }
    LogHelper.log('MediaFile.load', 'Done preloading: ' + this.filename);
    if (this.usePlaceholder) {
      // Done
    } else if (!this.url) {
      this.usePlaceholder = true;
    } else {
      this.loadUrl(this.url);
    }
    if (callback) {
      callback();
    }
  }

  public getRealMedia(): MediaFile | undefined {
    if (this.usePlaceholder) {
      LogHelper.log('MediaFile.getRealMedia', 'Placeholder used');
      return this; // No reference to ItemPlayer
    } else {
      return this;
    }
  }

  public getOffset() {
    return this.offset;
  }

  public getDuration() {
    return this.duration;
  }

  public setVolume(v: number) {}

  public isPlaying() {
    return false;
  }

  protected addShapes() {
    if (this.shapesAdded) {
      LogHelper.error('MediaFile.addShapes', 'Already added');
      return;
    }
    for (const shape of this.shapes) {
      // TODO
      //shape.addToPane(pane);
    }
  }

  public abstract start(offset: number): void;
  protected abstract loadUrl(url: string): void;
  public abstract isVideo(): boolean;

  protected errorListener(e: any) {
    LogHelper.error(
      'MediaFile.load',
      'Error loading ' + this.id + ' (' + this.filename + '): ' + e
    );
    this.usePlaceholder = true;
    this.stop();
  }

  public play() {
    // TODO
    // for(CompoundAnimation ca : animations) {
    // 	ca.play();
    // }
  }

  public pause() {
    // TODO
    // for(CompoundAnimation ca : animations) {
    // 	ca.pause();
    // }
  }

  public stop() {
    // TODO
    // for(CompoundAnimation ca : animations) {
    // 	ca.stop();
    // }
  }

  private stopCurrentDownload() {}

  public addAnimation(animation: any) {
    // TODO
    // animations.add(animation);
  }

  public getId() {
    return this.id;
  }

  private getMediaURL(callback: () => void) {
    if (this.url) {
      return this.url;
    } else if (!this.artworkId) {
      // No artwork
      return null;
    } else {
      LogHelper.log('MediaFile.getMediaURL', 'Unknown artwork: ' + this.id);
      this.usePlaceholder = true;
      this.stop();
      return null;
    }
  }
}
