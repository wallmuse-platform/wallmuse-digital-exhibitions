import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';
import { TheApp } from '../manager/Globals';

export class VideoMediaFile extends MediaFile {
  public loop = false;
  public codecs?: string;

  /** The minimal offset in ms to make a seek at the start */
  private static MIN_START_OFFSET = 20;

  public static getVideo(
    aid: number,
    id: string,
    url: string,
    codecs: string | undefined,
    filename: string,
    offset: number,
    duration: number,
    loop: boolean,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    const mf = new VideoMediaFile(
      aid,
      id,
      url,
      codecs,
      filename,
      offset,
      duration,
      loop,
      shapes,
      backgroundColor
    );
    return mf;
  }

  public constructor(
    aid: number,
    id: string,
    url: string,
    codecs: string | undefined,
    filename: string,
    offset: number,
    duration: number,
    loop: boolean,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    super(aid, id, url, filename, offset, duration, shapes, backgroundColor);
    this.loop = loop;
    this.codecs = codecs;
  }

  public play() {
    console.log('[VideoMediaFile.play] ENTRY POINT:', {
      filename: this.filename,
      artworkId: this.artworkId,
      hasTheApp: !!TheApp,
    });

    super.play();
    if (TheApp && typeof TheApp.showVideo === 'function') {
      console.log('[VideoMediaFile.play] Calling TheApp.showVideo');
      try {
        TheApp.showVideo(this);
        console.log('[VideoMediaFile.play] TheApp.showVideo called successfully');
      } catch (error) {
        console.error('[VideoMediaFile.play] ERROR calling TheApp.showVideo:', error);
      }
    } else {
      console.log('[VideoMediaFile] TheApp not ready, queuing showVideo operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'showVideo',
          media: this,
          timestamp: Date.now(),
        });
        console.log(
          '[VideoMediaFile] Queued showVideo operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
  }

  public pause() {
    super.pause();
    if (TheApp) {
      TheApp.pause();
    } else {
      console.log('[VideoMediaFile] TheApp not ready, queuing pause operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'pause',
          timestamp: Date.now(),
        });
        console.log(
          '[VideoMediaFile] Queued pause operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
  }

  public stop() {
    //		LogHelper.log("VideoMediaFile.stop", "Stop: " + artworkId);
    // TODO
    // 		if (mediaPlayer != null) {
    // 			// Stop + dispose provokes crashes
    // //			mediaPlayer.stop();
    // 			mediaPlayer.dispose();
    // 		}
    super.stop();
  }

  protected loadUrl(url: string) {
    if (TheApp) {
      TheApp.preloadVideo(this);
    } else {
      console.log('[VideoMediaFile] TheApp not ready, queuing preloadVideo operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'preloadVideo',
          media: this,
          timestamp: Date.now(),
        });
        console.log(
          '[VideoMediaFile] Queued preloadVideo operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
  }

  public start(offset: number) {
    // TODO
    // 	mediaPlayer.setVolume(Configuration.getVolume());
    // 	MediaView mv = new MediaView(mediaPlayer);
    //
    // 	DoubleProperty width = mv.fitWidthProperty();
    // 	DoubleProperty height = mv.fitHeightProperty();
    //
    // 	width.bind(root.widthProperty());
    // 	height.bind(root.heightProperty());
    //
    // 	mv.setPreserveRatio(true);
    //
    // 	if (root.getChildren().contains(mv)) {
    // 		throw new RuntimeException();
    // 	}
    // 	root.getChildren().add(0, mv);
    //
    // 	if (offset >= MIN_START_OFFSET) {
    // 		if (offset > (double)ItemPlayer.TRANSITION_DELAY / 1000.) {
    // 			LogHelper.log("VideoMediaFile.start", "Late so start offseted by: " + offset);
    // 		}
    // 		if (mediaPlayer.getStatus().equals(Status.READY)) {
    // 			LogHelper.log("VideoMediaFile.start", "Trying to seek to: " + offset);
    // 			mediaPlayer.seek(Duration.seconds(offset));
    // 		} else {
    // 			final ChangeListener<Status> listener = new ChangeListener<Status>() {
    // 				public void changed(ObservableValue<? extends Status> value, Status oldValue, Status newValue) {
    // 					if (Status.READY.equals(newValue) || Status.PLAYING.equals(newValue)) {
    // //						LogHelper.log("VideoMediaFile.start", "Status: from " + oldValue + " to " + newValue);
    // 						mediaPlayer.statusProperty().removeListener(this);
    // 						LogHelper.log("VideoMediaFile.start", "Trying to seek to: " + offset + " status: " + mediaPlayer.getStatus());
    // 						mediaPlayer.seek(Duration.seconds(offset));
    // 					}
    // 				}
    // 			};
    // 			mediaPlayer.statusProperty().addListener(listener);
    // 		}
    // 	}
    //
    // 	mediaPlayer.play();
    //
    // 	return mv;
  }

  public setVolume(v: number) {
    if (TheApp) {
      TheApp.setVolume(v);
    } else {
      console.log('[VideoMediaFile] TheApp not ready, queuing setVolume operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'setVolume',
          volume: v,
          timestamp: Date.now(),
        });
        console.log(
          '[VideoMediaFile] Queued setVolume operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
  }

  public isPlaying() {
    // TODO
    // return mediaPlayer.getStatus() == Status.PLAYING;
    return false;
  }

  public isVideo() {
    return true;
  }
}
