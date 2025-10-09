import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';
import { TheApp } from '../manager/Globals';
import { LogHelper } from '../manager/LogHelper';

export class ImageMediaFile extends MediaFile {
  private imageView: any;
  private animationDuration: number;

  public static getImage(
    aid: number,
    id: string,
    url: string,
    filename: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    const imf = new ImageMediaFile(
      aid,
      id,
      url,
      filename,
      offset,
      duration,
      shapes,
      backgroundColor
    );
    return imf;
  }

  private constructor(
    aid: number,
    id: string,
    url: string,
    filename: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    // CRITICAL FIX: Use the actual duration passed from Sequencer (should be montage duration for images)
    console.log(`[ImageMediaFile] Creating image with duration: ${duration}s for: ${filename}`);

    super(aid, id, url, filename, offset, duration, shapes, backgroundColor);
    this.animationDuration = duration;
  }

  public loadUrl(url: string) {
    LogHelper.log('ImageMediaFile.loadUrl', url);
    let img;
    if (this.isPlaceholder) {
      img = MediaFile.placeholder;
    } else if (this.url) {
      img = this.url;
    }

    TheApp.preloadImage(this);

    // TODO
    // if (Configuration.isAutoKenBurns()) {
    // 	// Add a transparent frame to avoid flickering
    // 	WritableImage img2 = new WritableImage(img.getPixelReader(), (int) img.getWidth(), (int) img.getHeight());
    // 	Color clear = Color.TRANSPARENT;
    // 	PixelWriter pw = img2.getPixelWriter();
    // 	int w = (int) img2.getWidth(), h = (int) img2.getHeight();
    // 	for(int x = 0; x < w; x++) {
    // 		pw.setColor(x, 0, clear);
    // 		pw.setColor(x, h - 1, clear);
    // 	}
    // 	for(int y = 0; y < h; y++) {
    // 		pw.setColor(0, y, clear);
    // 		pw.setColor(w - 1, y, clear);
    // 	}
    // 	imageView = new ImageView(img2);
    //
    // } else {
    // 	imageView = new ImageView(img);
    // }
  }

  public play() {
    console.log('[ImageMediaFile.play] Called for', this.filename, this.url, 'TheApp:', !!TheApp);
    super.play();
    TheApp.showImage(this);
  }

  public start(offset: number) {
    TheApp.showImage(this);
    // TODO
    // addShapes(root);
    // DoubleProperty width = imageView.fitWidthProperty();
    // DoubleProperty height = imageView.fitHeightProperty();
    //
    // width.bind(root.widthProperty());
    // height.bind(root.heightProperty());
    //
    // imageView.setPreserveRatio(true);

    // if (! isPlaceholder && Configuration.isAutoKenBurns()) {
    // 	addAnimation(new AutoKenBurnsAnimation(imageView, animationDuration));
    // }
  }

  public isVideo() {
    return false;
  }
}
