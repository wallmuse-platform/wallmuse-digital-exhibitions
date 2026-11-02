import { PlayerPosition } from './PlayerPosition';
import { Shape } from '../dao/Shape';
import { Rect } from '../dao/Rect';
import { LogHelper } from './LogHelper';
import { MediaFile } from '../media/MediaFile';
import { FileHelper } from './FileHelper';
import { VideoMediaFile } from '../media/VideoMediaFile';
import { TheApp } from './Globals';
import { ImageMediaFile } from '../media/ImageMediaFile';

/**
 * A class in charge of a screen: displaying things on it, responding to the keyboard, etc.
 */
export class ItemPlayer {
  public static TRANSITION_DELAY = 1000;
  public static START_DELAY = 500; // Reduced from 1000ms to 500ms for less hesitant start

  public static ThePlayer: ItemPlayer;

  private media?: MediaFile;
  private nextMedia?: MediaFile;
  private rect?: Rect;
  private colorAdjust: any;
  private isLoadingVideo: boolean = false; // 🚨 CRITICAL: Prevents multiple simultaneous video loads

  /** Position of the display*/
  private position?: PlayerPosition;
  /** Position of the next media to display */
  private nextPosition?: PlayerPosition;
  /** Offset to apply to the "position" attribute to get the actual time position. Used for loops to get the actual offset */
  private startOffset = 0;
  private fullscreen = false;

  public static getPlayer(): ItemPlayer {
    if (!this.ThePlayer) {
      console.log('[ItemPlayer] Player not initialized, initializing now');
      this.init();
    }
    return this.ThePlayer;
  }

  public static init() {
    this.restoreScreenPositions();
    MediaFile.init();
    // Create the player instance after initialization to avoid circular dependencies
    this.ThePlayer = new ItemPlayer();
  }

  public static saveScreenPositions() {
    // TODO
    // Document doc = DocumentHelper.createDocument();
    // Element root = doc.addElement("screens");
    // for(String sid : rectByScreen.keySet()) {
    // 	Rectangle2D rect = rectByScreen.get(sid);
    // 	Element elt = root.addElement("screen");
    // 	elt.addAttribute("id", sid);
    // 	elt.addAttribute("x", String.valueOf((int) rect.getMinX()));
    // 	elt.addAttribute("y", String.valueOf((int) rect.getMinY()));
    // 	elt.addAttribute("w", String.valueOf((int) rect.getWidth()));
    // 	elt.addAttribute("h", String.valueOf((int) rect.getHeight()));
    // }
    // try {
    // 	Configuration.saveScreenPositions(XmlHelper.toString(doc));
    // } catch (IOException e) {
    // 	// No big deal
    // 	e.printStackTrace();
    // }
  }

  public static restoreScreenPositions() {
    // TODO
    // String xml = Configuration.getScreenPositions();
    // if (xml != null) {
    // 	try {
    // 		Document doc = DocumentHelper.parseText(xml);
    // 		for(Element elt : (List<Element>) doc.getRootElement().elements("screen")) {
    // 			String id = elt.attributeValue("id");
    // 			int x = Integer.parseInt(elt.attributeValue("x"));
    // 			int y = Integer.parseInt(elt.attributeValue("y"));
    // 			int w = Integer.parseInt(elt.attributeValue("w"));
    // 			int h = Integer.parseInt(elt.attributeValue("h"));
    // 			// Checks to ensure that the window is visible
    // 			ObservableList<Screen> screens = Screen.getScreensForRectangle(x, y, w, h);
    // 			if (screens.size() > 0) {
    // 				rectByScreen.put(id, new Rectangle2D(x, y, w, h));
    // 			}
    // 		}
    //
    // 	} catch (Exception e) {
    // 		// No big deal
    // 		Configuration.saveScreenPositions("<screens/>");
    // 		e.printStackTrace();
    // 	}
    // }
  }

  public static getPlaceholder(duration: number): MediaFile {
    return MediaFile.getEmpty('placeholder', 0, duration, undefined, undefined);
  }

  /**
   * Check if the player currently has active media
   * @returns true if media exists and is loaded
   */
  public hasCurrentMedia(): boolean {
    return !!this.media;
  }

  /**
   * Clear the current position and media to force fresh data loading
   * Used when switching playlists to prevent stale data
   */
  public clearPosition(): void {
    console.log('[ItemPlayer] clearPosition: Clearing current position and media for fresh data');
    this.position = undefined;
    this.nextPosition = undefined;
    this.media = undefined;
    this.nextMedia = undefined;
    this.isLoadingVideo = false; // Reset loading lock for fresh data
  }

  public static getMedia(
    aid: number,
    id: string,
    url: string | undefined,
    codecs: string | undefined,
    filename: string | undefined,
    type: string,
    offset: number,
    duration: number,
    loop: boolean,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ): MediaFile {
    if (!filename || !url) {
      if (shapes) {
        return MediaFile.getEmpty(id, offset, duration, shapes, backgroundColor);
      } else {
        LogHelper.log('MediaFile.get', 'No filename or url or shape in media');
        return this.getPlaceholder(duration);
      }
    } else if (FileHelper.isImage(filename)) {
      // Use the factory method to create ImageMediaFile
      return ImageMediaFile.getImage(
        aid,
        id,
        url!,
        filename!,
        offset,
        duration,
        shapes,
        backgroundColor
      );
    } else if (FileHelper.isVideo(filename)) {
      return VideoMediaFile.getVideo(
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
    } else {
      LogHelper.log('MediaFile.get', 'Unrecognized media format: ' + filename);
      // REVERTED: Remove problematic backend type fallback that was causing wrong classification
      // Just return placeholder for unrecognized formats
      return this.getPlaceholder(duration);
    }
  }

  private constructor() {
    // TODO
    // colorAdjust = new ColorAdjust(0, screen.getSaturation(), screen.getLuminosity(), screen.getContrast());
    // Restore the position/size
    // rect = rectByScreen.get(screen.getLocalId());
    // Rectangle2D r = screen.getJavaFxScreen().getVisualBounds();
    // if (rect != null && r.intersects(rect)) {
    // 	// Good position
    // 	stage.setX(rect.getMinX());
    // 	stage.setY(rect.getMinY());
    // 	stage.setWidth(rect.getWidth());
    // 	stage.setHeight(rect.getHeight());
    // } else {
    // 	// Bad position, set a default centered one
    // 	rect = new Rectangle2D(r.getMinX() + (r.getWidth() - 960) / 2, r.getMinY() + (r.getHeight() - 540) / 2,
    // 			960, 540);
    // 	stage.setX(rect.getMinX());
    // 	stage.setY(rect.getMinY());
    // }
    //
    // // Fullscreen
    // if (! isFullscreenCompatible()) {
    // 	stage.initStyle(StageStyle.UNDECORATED);
    // }
    // setFullscreen(Configuration.isFullScreen());
    // scene.widthProperty().addListener(new ChangeListener<Number>() {
    // 	public void changed(ObservableValue<? extends Number> value, Number oldWidth, Number newWidth) {
    // 		checkFullscreen();
    // 	}
    // });
    //
    // scene.heightProperty().addListener(new ChangeListener<Number>() {
    // 	public void changed(ObservableValue<? extends Number> value, Number oldHeight, Number newHeight) {
    // 		checkFullscreen();
    // 	}
    // });
    //
    // scene.setOnKeyPressed(new EventHandler<KeyEvent>() {
    // 	public void handle(KeyEvent event) {
    // 		onKeyPressed(event);
    // 	}
    // });
    //
    // stage.onHiddenProperty().set(new EventHandler<WindowEvent>() {
    // 	public void handle(WindowEvent param) {
    // 		hide();
    // 		Sequencer.stop(null);
    // 	}
    // });
  }

  public isFullscreenCompatible() {
    // @ts-ignore
    return window['fullScreen'] !== undefined;
  }

  // TODO
  // private void onKeyPressed(KeyEvent event) {
  // 	switch(event.getCode()) {
  // 	case ESCAPE:
  // 		Sequencer.setFullscreen(false);
  // 		break;
  // 	case F:
  // 		Sequencer.setFullscreen(! fullscreen);
  // 		break;
  // 	case A: // Fucking americans
  // 	case Q:
  // 		SysTray.doStopBackend(false);
  // 		break;
  // 	case SPACE:
  // 	case P:
  // 		SysTray.doPauseBackend();
  // 		break;
  // 	case LEFT:
  // 		SysTray.doPreviousBackend();
  // 		break;
  // 	case RIGHT:
  // 		SysTray.doNextBackend();
  // 		break;
  // 	}
  // }

  public getPosition() {
    return this.position;
  }

  // TODO
  // public setContrast(float contrast) {
  // 	colorAdjust.setContrast(contrast);
  // }
  //
  // public void setLuminosity(float luminosity) {
  // 	colorAdjust.setBrightness(luminosity);
  // }
  //
  // public void setSaturation(float saturation) {
  // 	colorAdjust.setSaturation(saturation);
  // }

  public getPositionGlobalOffset() {
    if (this.position) {
      return this.position.getOffset() + this.startOffset;
    } else {
      LogHelper.error('ItemPlayer.getPositionGlobalOffset', 'No current position');
      return 0;
    }
  }

  public setPosition(position: PlayerPosition | undefined) {
    this.position = position;
  }

  public getNextPosition() {
    return this.nextPosition;
  }

  public getNextPositionGlobalOffset() {
    return this.nextPosition ? this.nextPosition.getOffset() + this.startOffset : 0;
  }

  public setNextPosition(nextPosition: PlayerPosition | undefined) {
    this.nextPosition = nextPosition;
  }

  public getStartOffset() {
    return this.startOffset;
  }

  public setStartOffset(startOffset: number) {
    this.startOffset = startOffset;
  }

  public play() {
    if (TheApp) {
      TheApp.play();
    } else {
      console.log('[ItemPlayer] TheApp not ready, queuing play operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'play',
          timestamp: Date.now(),
        });
        console.log(
          '[ItemPlayer] Queued play operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
    // if (this.media) {
    // 	this.media.play();
    // }
  }

  public pause() {
    if (TheApp) {
      TheApp.pause();
    } else {
      console.log('[ItemPlayer] TheApp not ready, queuing pause operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'pause',
          timestamp: Date.now(),
        });
        console.log(
          '[ItemPlayer] Queued pause operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
    // if (this.media) {
    // 	this.media.pause();
    // }
  }

  public stop() {
    if (TheApp) {
      TheApp.stop();
    } else {
      console.log('[ItemPlayer] TheApp not ready, queuing stop operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'stop',
          timestamp: Date.now(),
        });
        console.log(
          '[ItemPlayer] Queued stop operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
  }

  public isPlayingVideo() {
    return this.media && this.media.isVideo();
  }

  public setFullscreen(fs: boolean) {
    this.fullscreen = fs;
    const elem = document.getElementById('app');
    if (fs && elem?.requestFullscreen) {
      elem.requestFullscreen();
    } else if (!fs) {
      document.exitFullscreen();
    }
    LogHelper.log('ItemPlayer.setFullscreen', 'Set fullscreen to: ' + this.fullscreen);
  }

  /**
   * Checks if the player is fullscreen, and saves the pref if all the players have the same state
   */
  private checkFullscreen() {
    // @ts-ignore
    if (document.fullscreenElement) {
      LogHelper.log('ItemPlayer.checkFullscreen', 'Is fullscreen');
    }
  }

  public show() {
    // TODO?
  }

  public hide() {
    // TODO?
  }

  public isPlaying() {
    if (TheApp) {
      return TheApp.isPlaying();
    } else {
      console.log('[ItemPlayer] TheApp not ready, returning false for isPlaying');
      return false;
    }
    // if (this.media) {
    // 	return this.media.isPlaying();
    // }
    // return false;
  }

  public setVolume(volume: number) {
    if (TheApp) {
      TheApp.setVolume(volume);
    } else {
      console.log('[ItemPlayer] TheApp not ready, queuing setVolume operation');
      // Queue the operation for when App becomes ready
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'setVolume',
          volume: volume,
          timestamp: Date.now(),
        });
        console.log(
          '[ItemPlayer] Queued setVolume operation, total queued:',
          window.PENDING_APP_OPERATIONS.length
        );
      }
    }
    // if (this.media) {
    // 	this.media.setVolume(volume);
    // }
  }

  public hasPreloaded(id: string) {
    return this.nextMedia;
    // return (this.nextMedia && id === this.nextMedia.getId());
  }

  public playMedia(
    aid: number,
    url: string | undefined,
    codecs: string | undefined,
    filename: string | undefined,
    type: string,
    offset: number,
    duration: number,
    loop: boolean,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    console.log('[ItemPlayer.playMedia] ENTRY POINT:', {
      aid: aid,
      filename: filename,
      url: url,
      type: type,
      offset: offset,
      duration: duration,
      loop: loop,
    });

    // Keep a copy to be sure that it is not changed in our back
    let mf = this.nextMedia;
    this.nextMedia = undefined;
    // Check if a preload exists and can be used
    if (mf && mf.artworkId === aid) {
      LogHelper.log('ItemPlayer.play', 'Preloaded media starts');
      console.log('[ItemPlayer.playMedia] Using preloaded media:', mf.filename);
      this.finishPlay(mf.getRealMedia(), offset);
      return;
    }
    // Load the next one
    mf = ItemPlayer.getMedia(
      aid,
      '',
      url,
      codecs,
      filename,
      type,
      offset,
      duration,
      loop,
      shapes,
      backgroundColor
    );
    if (mf) {
      LogHelper.log('ItemPlayer.play', 'Loading next media: ' + filename);
      console.log(
        '[ItemPlayer.playMedia] Created new media file:',
        mf.filename,
        'type:',
        mf.constructor.name
      );
      this.finishPlay(mf.getRealMedia(), offset);
    } else {
      // Bad/Unknown media type
      LogHelper.log('ItemPlayer.play', 'Bad/Unknown media type: ' + filename);
      console.log('[ItemPlayer.playMedia] Bad/Unknown media type, using placeholder');
      mf = ItemPlayer.getPlaceholder(duration);
      this.finishPlay(mf, 0);
    }
  }

  private finishPlay(mf: any, offset: number) {
    console.log('[ItemPlayer.finishPlay] ENTRY POINT:', {
      mediaFile: mf?.filename,
      mediaType: mf?.constructor.name,
      offset: offset,
      hasCurrentMedia: !!this.media,
      isVideoMediaFile: mf instanceof VideoMediaFile,
      hasPlayMethod: typeof mf?.play === 'function',
    });

    if (this.media) {
      // TODO
      // Statistics.notifyArtworkEnded(mediaFile.artworkId, mediaFile.screenId);
    }
    this.delayStop();
    this.media = mf;
    this.delayStart(offset);
    // Done
    LogHelper.log('ItemPlayer.play', 'Started playing');
    console.log('[ItemPlayer.finishPlay] Media set and delayStart called');
    if (mf) {
      // TODO
      // Statistics.notifyArtworkStarted(mf.artworkId, mf.screenId);
    }
  }

  public preload(
    aid: number,
    url: string | undefined,
    codecs: string | undefined,
    filename: string | undefined,
    type: string,
    offset: number,
    duration: number,
    loop: boolean,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined
  ) {
    if (this.nextMedia) {
      this.nextMedia.stop();
    }

    this.nextMedia = ItemPlayer.getMedia(
      aid,
      '',
      url,
      codecs,
      filename,
      type,
      offset,
      duration,
      loop,
      shapes,
      backgroundColor
    );
    if (!this.nextMedia) {
      this.nextMedia = ItemPlayer.getPlaceholder(duration);
    }
    // warning.warningPreloading(id);
    this.nextMedia.load(() => {});
  }

  /**
   * Called to start the current media at the given offset
   * @param offset In millis
   */
  private delayStart(offset: number) {
    console.log('[ItemPlayer.delayStart] ENTRY POINT:', {
      offset: offset,
      hasMedia: !!this.media,
      mediaFile: this.media?.filename,
      mediaType: this.media?.constructor.name,
    });

    if (TheApp) {
      // CRITICAL FIX: Handle both video and image media types
      if (this.media && 'filename' in this.media) {
        console.log('[ItemPlayer.delayStart] CRITICAL FIX: Processing media:', this.media.filename);

        // Determine media type and call appropriate method immediately
        if (this.media instanceof VideoMediaFile) {
          console.log(
            '[ItemPlayer.delayStart] Video media detected, calling TheApp.preloadVideo first for:',
            this.media.filename
          );

          // CRITICAL FIX: Call preloadVideo first to set up the video slot
          TheApp.preloadVideo(this.media as any);

          // CRITICAL FIX: Capture media reference to avoid TypeScript undefined error
          const mediaRef = this.media;

          // Give React time to set up the video slot, then show the video
          // TIMING FIX: Increased delay to allow React state to settle before video switching
          setTimeout(() => {
            console.log(
              '[ItemPlayer.delayStart] Now calling TheApp.showVideo for:',
              mediaRef.filename
            );
            TheApp.showVideo(mediaRef as any);
          }, 50);
        } else if (this.media instanceof ImageMediaFile) {
          console.log(
            '[ItemPlayer.delayStart] Image media detected, calling TheApp.showImage for:',
            this.media.filename
          );
          TheApp.showImage(this.media as any);
          // CRITICAL FIX: Return early for images - no need to wait for video elements or seek
          return;
        } else {
          // CRITICAL FIX: Fallback detection by filename extension when type is wrong
          const filename = this.media?.filename || '';
          const isImageByExtension =
            filename.toLowerCase().endsWith('.jpg') ||
            filename.toLowerCase().endsWith('.jpeg') ||
            filename.toLowerCase().endsWith('.png') ||
            filename.toLowerCase().endsWith('.gif');

          if (isImageByExtension) {
            console.log(
              '[ItemPlayer.delayStart] FALLBACK: Detected image by filename extension, calling TheApp.showImage for:',
              filename
            );
            TheApp.showImage(this.media as any);
            // CRITICAL FIX: Return early for images - no need to wait for video elements or seek
            return;
          } else {
            console.log(
              '[ItemPlayer.delayStart] FALLBACK: Detected video by filename extension, calling TheApp.preloadVideo first for:',
              filename
            );

            // CRITICAL FIX: Call preloadVideo first to set up the video slot
            TheApp.preloadVideo(this.media as any);

            // CRITICAL FIX: Capture media reference to avoid TypeScript undefined error
            const mediaRef = this.media;

            // Give React time to set up the video slot, then show the video
            // TIMING FIX: Increased delay to allow React state to settle before video switching
            setTimeout(() => {
              console.log(
                '[ItemPlayer.delayStart] FALLBACK: Now calling TheApp.showVideo for:',
                filename
              );
              TheApp.showVideo(mediaRef as any);
            }, 50);
          }
        }

        // CRITICAL FIX: Only proceed with video-specific logic if this is actually video media
        if (this.media && this.media instanceof VideoMediaFile) {
          // Give React time to mount components before seeking
          const waitForMetadataAndSeek = () => {
            // Only seek when we actually have a positive offset; otherwise skip
            const shouldSeek = typeof offset === 'number' && offset > 0.05;
            if (!shouldSeek) {
              console.log('[ItemPlayer.delayStart] Offset <= 0, skipping initial seek');
              return;
            }
            // Try to find a ready video element
            const v1 = document.getElementById('video-1') as HTMLVideoElement | null;
            const v2 = document.getElementById('video-2') as HTMLVideoElement | null;
            const candidate = v1?.src ? v1 : v2?.src ? v2 : null;
            if (candidate && candidate.readyState >= 1) {
              const clamped = Math.max(0, offset);
              console.log(
                '[ItemPlayer.delayStart] Video has metadata, calling TheApp.seek with offset:',
                clamped
              );
              TheApp.seek(clamped);
            } else {
              console.log('[ItemPlayer.delayStart] Waiting for video metadata before seek...');
              setTimeout(waitForMetadataAndSeek, 100);
            }
          };
          setTimeout(waitForMetadataAndSeek, 50);
        }
      } else {
        console.log(
          '[ItemPlayer.delayStart] No valid media, calling TheApp.seek with offset:',
          offset
        );
        TheApp.seek(offset);
      }
    } else {
      console.log(
        '[ItemPlayer] TheApp not ready - Sequencer will handle playback via queued operations'
      );
      // CRITICAL FIX: Don't queue separate seek operations from ItemPlayer
      // The Sequencer already handles the complete play+seek flow via queued operations
      // Queuing separate seek operations creates conflicts and redundancy
    }

    // CRITICAL FIX: Only wait for video elements if this is actually video media
    if (this.media && this.media instanceof VideoMediaFile) {
      console.log(
        '[ItemPlayer.delayStart] Video media detected, waiting for video element to be mounted in DOM...'
      );

      const waitForVideoElement = () => {
        // Check if video element is actually in DOM
        const allVideos = document.querySelectorAll('video');
        const video1 = document.getElementById('video-1');
        const video2 = document.getElementById('video-2');

        if (allVideos.length > 0 || video1 || video2) {
          console.log(
            '[ItemPlayer.delayStart] Video element found in DOM, proceeding with playback'
          );

          // CRITICAL FIX: Find the actual video element in the DOM and play it
          if (this.media && this.media instanceof VideoMediaFile) {
            const videoMedia = this.media as VideoMediaFile;
            console.log(
              '[ItemPlayer.delayStart] Looking for video element for:',
              videoMedia.filename
            );

            // CRITICAL DEBUG: Log DOM state to understand why video elements aren't found
            const allVideos = document.querySelectorAll('video');
            const videoIds = Array.from(allVideos).map(v => v.id);
            const video1 = document.getElementById('video-1');
            const video2 = document.getElementById('video-2');
            const containerExists = !!document.getElementById('wm-player-contents');
            const containerContent = document
              .getElementById('wm-player-contents')
              ?.innerHTML.substring(0, 200);

            console.log('[ItemPlayer.delayStart] DOM state:', {
              allVideos: allVideos.length,
              videoIds: videoIds,
              video1: !!video1,
              video2: !!video2,
              containerExists: containerExists,
              containerContent: containerContent,
              TheAppState: {
                video1: TheApp.state.video1?.filename,
                video2: TheApp.state.video2?.filename,
                videoShown: TheApp.state.videoShown,
              },
            });

            // Find the video element that corresponds to this media
            const videoElements = document.querySelectorAll('video');
            let targetVideo: HTMLVideoElement | null = null;

            // Look for video with matching filename or ID
            Array.from(videoElements).forEach((video: HTMLVideoElement) => {
              const videoId = video.id;
              if (videoId === 'video-1' || videoId === 'video-2') {
                // Check if this video element is the one we want
                const videoIndex = parseInt(videoId.split('-')[1]);
                if (videoIndex === 1 && TheApp.state.video1?.filename === videoMedia.filename) {
                  targetVideo = video;
                } else if (
                  videoIndex === 2 &&
                  TheApp.state.video2?.filename === videoMedia.filename
                ) {
                  targetVideo = video;
                }
              }
            });

            if (targetVideo) {
              const video = targetVideo as HTMLVideoElement; // Type assertion to help TypeScript
              console.log('[ItemPlayer.delayStart] Found target video element:', video.id);

              // Ensure video is properly reset before playing
              if (video.ended) {
                console.log('[ItemPlayer.delayStart] Video was ended, resetting currentTime to 0');
                video.currentTime = 0;
              }

              // Set playback rate to normal
              video.playbackRate = 1.0;

              // Ensure volume is set
              video.volume = video.volume || 0;

              // Add event listeners for better timing control
              const onTimeUpdate = () => {
                // Prevent premature ending by checking if we're close to the end
                if (video.duration && video.currentTime >= video.duration - 0.1) {
                  console.log(
                    '[ItemPlayer.delayStart] Video near end, preventing premature ending'
                  );
                  video.currentTime = Math.max(0, video.duration - 0.1);
                }
              };

              const onEnded = () => {
                console.log('[ItemPlayer.delayStart] Video ended event triggered');
                // Remove the event listener to prevent memory leaks
                video.removeEventListener('timeupdate', onTimeUpdate);
                video.removeEventListener('ended', onEnded);
              };

              video.addEventListener('timeupdate', onTimeUpdate);
              video.addEventListener('ended', onEnded);

              console.log('[ItemPlayer.delayStart] Video timing safeguards added');

              // CRITICAL: Actually play the video
              console.log('[ItemPlayer.delayStart] Calling video.play() on element:', video.id);
              video
                .play()
                .then(() => {
                  console.log('[ItemPlayer.delayStart] Video play() succeeded');
                })
                .catch(error => {
                  console.error('[ItemPlayer.delayStart] Video play() failed:', error);
                });
            } else {
              console.warn(
                '[ItemPlayer.delayStart] No target video element found for:',
                videoMedia.filename
              );
            }
          } else {
            console.warn('[ItemPlayer.delayStart] Media is not a VideoMediaFile or is null');
          }

          console.log('[ItemPlayer.delayStart] delayStart completed');
        }

        // Start waiting for video element with retry mechanism
        let attempts = 0;
        const maxAttempts = 50; // 50 * 100ms = 5 seconds max wait

        const checkVideoElement = () => {
          attempts++;
          console.log(
            `[ItemPlayer.delayStart] Attempt ${attempts}/${maxAttempts}: Checking for video element in DOM`
          );

          const allVideos = document.querySelectorAll('video');
          const video1 = document.getElementById('video-1');
          const video2 = document.getElementById('video-2');

          if (allVideos.length > 0 || video1 || video2) {
            console.log('[ItemPlayer.delayStart] Video element found, executing playback logic');
            waitForVideoElement();
          } else if (attempts < maxAttempts) {
            console.log(
              `[ItemPlayer.delayStart] Video element not ready, retrying in 100ms (attempt ${attempts}/${maxAttempts})`
            );
            setTimeout(checkVideoElement, 100);
          } else {
            console.warn(
              '[ItemPlayer.delayStart] TIMEOUT: Video element never appeared in DOM after 5 seconds'
            );
            console.log('[ItemPlayer.delayStart] Final DOM state:', {
              allVideos: document.querySelectorAll('video').length,
              video1: !!document.getElementById('video-1'),
              video2: !!document.getElementById('video-2'),
              containerContent: document
                .getElementById('wm-player-contents')
                ?.innerHTML.substring(0, 200),
            });
          }
        };

        // Start checking for video element
        checkVideoElement();
      };
    }
  }

  /**
   * Called to stop the play of the current media, that will change just after the call
   */
  private delayStop() {
    // Make a copy of the original values
    const mp = this.media;
    this.media = undefined;
    mp?.stop();
  }
}
