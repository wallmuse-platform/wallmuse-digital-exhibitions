import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';

export class MultiImageMediaFile extends MediaFile {
  // TODO
  // 	public static final double layerOffset = 0.1;
  //
  // 	private Collection<File> imageFiles = new ArrayList<>();
  // 	private StackPane root;
  // 	private ImageView[] imageViews = new ImageView[0];
  // 	private double animationDuration;
  //
  // 	public static MultiImageMediaFile get(int aid, String sid, String id, String url, String filename, double offset,
  // 			double duration, List<Shape> shapes, Color backgroundColor) {
  // 		MultiImageMediaFile imf = new MultiImageMediaFile(aid, sid, id, url, filename, offset, duration, shapes, backgroundColor);
  // 		imf.animationDuration = duration;
  // 		return imf;
  // 	}

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
    super(aid, id, url, filename, offset, duration, shapes, backgroundColor);
  }

  protected loadUrl(url: string) {
    // TODO
    // 		// First download the file. It MUST be on disk
    // 		if (file == null) {
    // 			IOHelper.downloadFromURL(new URL(url), file);
    // 		}
    // 		// Then extract the different layers of the file
    // 		Map<String, File> layers = ImageHelper.extractAndSavePSDLayers(file);
    // 		imageFiles = layers.values();
    // 		imageViews = new ImageView[layers.size()];
    // 		root = new StackPane();
    // 		// Then open image views corresponding to the layers
    // 		for(String name : layers.keySet()) {
    // 			// Get the file
    // 			File file = layers.get(name);
    // 			int p = name.indexOf(':');
    // 			int layer = Integer.parseInt(name.substring(0, p));
    // 			// Layer 0 is a the compound result, we don't use it
    // 			if (layer == 0) {
    // 				continue;
    // 			}
    // //			String layerName = name.substring(p + 1);
    //
    // 			// Make the view
    // 			Image img = new Image(file.toURI().toURL().toString());
    // 			ImageView imageView = new ImageView(img);
    // 			imageViews[layer - 1] = imageView;
    // 			img.errorProperty().addListener(new ChangeListener<Boolean>() {
    // 				public void changed(ObservableValue<? extends Boolean> observabl, Boolean oldValue, Boolean newValue) {
    // 					errorListener(null);
    // 				}
    // 			});
    //
    // 			DoubleProperty width = imageView.fitWidthProperty();
    // 			DoubleProperty height = imageView.fitHeightProperty();
    //
    // 			width.bind(root.widthProperty());
    // 			height.bind(root.heightProperty());
    //
    // 			imageView.setPreserveRatio(true);
    // 		}
    // 		// Add the views to the screen
    // 		for(ImageView iv : imageViews) {
    // 			root.getChildren().add(iv);
    // 		}
    // 		addShapes(root);
  }

  public start(offset: number) {
    // TODO
    // Auto25Animation.changeDirection();
    // double dx = 0;
    // for(ImageView imageView : imageViews) {
    // 	addAnimation(new Auto25Animation(imageView, animationDuration, dx, 0));
    // 	dx += imageView.getFitWidth() * layerOffset;
    // }
    //
    // if (root.getChildren().contains(this.root)) {
    // 	throw new RuntimeException();
    // }
    // root.getChildren().add(0, this.root);
    //
    // return this.root;
  }

  public stop() {
    super.stop();
    // TODO
    // for(File f : imageFiles) {
    // 	IOHelper.delete(f);
    // }
  }

  public isVideo() {
    return false;
  }
}
