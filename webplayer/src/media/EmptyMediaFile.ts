import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';

export class EmptyMediaFile extends MediaFile {
  public static getEmpty = (
    id: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) => {
    return new EmptyMediaFile(id, offset, duration, shapes, backgroundColor);
  };

  private constructor(
    id: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    super(0, id, undefined, undefined, offset, duration, shapes, backgroundColor);
  }

  loadUrl(url: string) {
    // TODO
    // pane.setBackground(new Background(new BackgroundFill(backgroundColor, null, null)));
    // addShapes(pane);
  }

  public start(offset: number) {
    // TODO
    // if (root.getChildren().contains(pane)) {
    // 	throw new RuntimeException();
    // }
    // root.getChildren().add(0, pane);
  }

  public isVideo() {
    return false;
  }
}
