import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';
import { TheApp, KEN_BURNS_ENABLED } from '../manager/Globals';
import { LogHelper } from '../manager/LogHelper';
import { ZoomAndPanParams } from '../dao/ZoomAndPan';
import { generateRandomKenBurns } from '../utils/kenBurnsGenerator';

export class ImageMediaFile extends MediaFile {
  private imageView: any;
  private animationDuration: number;

  // Ken Burns effect parameters
  public zoomAndPan?: ZoomAndPanParams;

  // FUTURE: Image metadata for copyright and display modes
  // public copyright?: boolean;
  // public croppable?: boolean;    // If false, use 'contain' instead of 'cover'
  // public splittable?: boolean;   // For multi-screen spanning
  // public deconstructable?: boolean;

  public static getImage(
    aid: number,
    id: string,
    url: string,
    filename: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
    // FUTURE: Backend will provide these parameters via WebSocket
    // zoomAndPan?: ZoomAndPanParams,     // Explicit zoom/pan from updateImageZoomAndPan tool
    // copyright?: boolean,                // Copyright flag
    // croppable?: boolean,                // If false, use 'contain' mode (fit)
    // splittable?: boolean,               // For multi-screen image spanning
    // deconstructable?: boolean           // For shape-based content extraction
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

    // Auto-generate Ken Burns parameters if enabled and not explicitly provided
    if (KEN_BURNS_ENABLED) {
      // FUTURE: When backend sends zoomAndPan parameter, use it instead:
      // imf.zoomAndPan = zoomAndPan || generateRandomKenBurns();

      // For now: Always auto-generate random Ken Burns
      imf.zoomAndPan = generateRandomKenBurns();

      console.log(`[ImageMediaFile] Generated Ken Burns for ${filename}:`, imf.zoomAndPan);
    }

    // FUTURE: Store copyright/croppable flags
    // imf.copyright = copyright;
    // imf.croppable = croppable;
    // imf.splittable = splittable;
    // imf.deconstructable = deconstructable;

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
