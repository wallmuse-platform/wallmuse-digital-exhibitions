// Enhanced Simplified Sequencer.ts
// Combines clean architecture with essential functionality for all benchmarks

import { Playlist } from '../dao/Playlist';
import { ItemPlayer } from './ItemPlayer';
import { LogHelper } from './LogHelper';
import { PlayerPosition } from './PlayerPosition';
import { Artwork } from '../dao/Artwork';
import { TheApp, ThePlaylist, Montages } from './Globals';
import { wsTools } from './start';
import { MessageDTO } from './MessageDTO';
import { setCurrentPlaylist } from './Globals';
import { VideoMediaFile } from '../media/VideoMediaFile';
import { ImageMediaFile } from '../media/ImageMediaFile';

enum SequencerStatus {
  Stopped,
  Playing,
  Paused,
}

export class Sequencer {
  // Core playback state
  private static status = SequencerStatus.Stopped;
  private static runner?: NodeJS.Timer;
  private static _playlist?: Playlist;
  private static canPreload = true;

  // ESSENTIAL: Timing/offset tracking (for benchmarks 0 & 1)
  private static startTime = 0; // Timestamp when playback started/resumed
  private static startOffset = 0; // Global offset when current segment started
  private static offset = 0; // Current global playback time
  private static pauseStartTime = 0; // When pause started

  // ESSENTIAL: Track override system (for benchmarks 2 & 4)
  private static montageTrackOverrides: Map<number, number> = new Map();

  // ESSENTIAL: Navigation state (for benchmark 4)
  private static pendingMontageIndex = 0;

  // Public getters for integration
  public static getStatus() {
    return this.status;
  }
  public static isPlaying() {
    return this.status === SequencerStatus.Playing;
  }
  public static isPaused() {
    return this.status === SequencerStatus.Paused;
  }
  public static isStopped() {
    return this.status === SequencerStatus.Stopped;
  }
  public static getCurrentPlaylist() {
    return this._playlist;
  }
  public static getOffset() {
    return this.offset;
  }
  public static getCurrentOffset() {
    return this.offset;
  }
  public static getCurrentTimestamp() {
    return Date.now();
  }
  public static isInitialized() {
    return !!this._playlist && !!ItemPlayer.ThePlayer?.getPosition();
  }
  public static getCurrentPosition() {
    return ItemPlayer.ThePlayer?.getPosition();
  }

  // Additional methods for App.tsx compatibility
  public static interrupt() {
    this.stop();
    this._playlist = undefined;
  }

  public static init(callback?: () => void) {
    LogHelper.log('Sequencer.init', 'Enhanced simplified sequencer initialized');
    // CRITICAL: Initialize ItemPlayer to enable M0→M1 navigation
    ItemPlayer.init();
    LogHelper.log('Sequencer.init', 'ItemPlayer initialized');
    if (callback) callback();
  }

  // Property setters for compatibility (used in App.tsx)
  public static set playlist(value: Playlist | undefined) {
    this._playlist = value;
  }

  public static set nextPlaylist(value: Playlist | undefined) {
    // For compatibility - enhanced version doesn't use nextPlaylist
  }

  // Play/Pause/Stop commands (Benchmark 1)
  public static play(time?: number) {
    if (time !== undefined) {
      // Seek to specific time
      this.seek(time);
    }

    if (this.status === SequencerStatus.Paused) {
      // Resume from pause
      const pauseDuration = Date.now() - this.pauseStartTime;
      this.startTime += pauseDuration;
      this.status = SequencerStatus.Playing;

      // ESSENTIAL: Integrate with App.tsx
      if (TheApp && TheApp.resumePlaybackTimer) {
        TheApp.resumePlaybackTimer();
      }

      LogHelper.log('Sequencer.play', 'Resumed from pause');
    } else if (this.status !== SequencerStatus.Playing) {
      // Start fresh
      this.status = SequencerStatus.Playing;
      this.startTime = Date.now();
      this.startOffset = time || 0;

      // ESSENTIAL: Integrate with App.tsx
      if (TheApp && TheApp.startPlaybackTimer) {
        TheApp.startPlaybackTimer();
      }

      LogHelper.log('Sequencer.play', 'Playbook started');
      this.run();
    }
  }

  public static pause() {
    if (this.status === SequencerStatus.Playing) {
      this.status = SequencerStatus.Paused;
      this.pauseStartTime = Date.now();

      // ESSENTIAL: Integrate with App.tsx
      if (TheApp && TheApp.pausePlaybackTimer) {
        TheApp.pausePlaybackTimer();
      }

      LogHelper.log('Sequencer.pause', 'Playback paused');
    }
  }

  public static stop() {
    if (this.status !== SequencerStatus.Stopped) {
      this.status = SequencerStatus.Stopped;
      if (this.runner) {
        clearInterval(this.runner);
        this.runner = undefined;
      }

      // ESSENTIAL: Integrate with App.tsx to actually stop video playback
      if (TheApp && TheApp.stop) {
        TheApp.stop();
      }

      LogHelper.log('Sequencer.stop', 'Playback stopped');
    }
  }

  public static seek(time: number) {
    this.offset = time;
    this.startTime = Date.now();
    this.startOffset = time;

    // ESSENTIAL: Integrate with App.tsx
    if (TheApp && TheApp.seek) {
      TheApp.seek(time);
    }
  }

  // Next/Previous navigation (Benchmark 2)
  public static goNext() {
    LogHelper.log('Sequencer.goNext', 'Advancing to next');
    const player = ItemPlayer.ThePlayer;
    if (!player) {
      LogHelper.log('Sequencer.goNext', 'Player not ready, skipping');
      return;
    }

    const currentPos = player.getPosition();
    if (currentPos) {
      const nextPos = this.getNextPosition(currentPos);
      if (nextPos) {
        LogHelper.log(
          'Sequencer.goNext',
          `Moving from M${currentPos.getMontageIndex()}T${currentPos.getTrackIndex()}I${currentPos.getItemIndex()} ` +
            `to M${nextPos.getMontageIndex()}T${nextPos.getTrackIndex()}I${nextPos.getItemIndex()}`
        );

        // CRITICAL FIX: If moving to a different montage, log the transition
        if (nextPos.getMontageIndex() !== currentPos.getMontageIndex()) {
          LogHelper.log(
            'Sequencer.goNext',
            `Montage transition detected: M${currentPos.getMontageIndex()} → M${nextPos.getMontageIndex()}`
          );
          // The player.setPosition(nextPos) call below will update the current position
        }

        player.setPosition(nextPos);
        this.showMedia(nextPos, true);
      } else {
        LogHelper.log('Sequencer.goNext', 'No next position available - playback ended');
      }
    }
  }

  public static goPrevious() {
    LogHelper.log('Sequencer.goPrevious', 'Going to previous');
    const player = ItemPlayer.ThePlayer;
    if (!player) {
      LogHelper.log('Sequencer.goPrevious', 'Player not ready, skipping');
      return;
    }

    const currentPos = player.getPosition();
    if (currentPos) {
      // ESSENTIAL: 0-10sec rule from your benchmarks
      if (this.offset <= 10) {
        // Go to previous montage if within 0-10 seconds
        const prevPos = this.getPreviousPosition(currentPos);
        if (prevPos) {
          player.setPosition(prevPos);
          this.showMedia(prevPos, true);
          return;
        }
      }

      // Otherwise go to start of current montage
      const startPos = new PlayerPosition(
        this._playlist!,
        currentPos.getMontageIndex(),
        currentPos.getTrackIndex(),
        0, // itemIndex
        30, // default duration
        0, // loopIndex
        0, // offset
        0 // mediaOffset
      );
      player.setPosition(startPos);
      this.showMedia(startPos, true);
    }
  }

  // goMontage command (Benchmark 4)
  public static goMontage(montageIndex: number, trackIndex?: number) {
    // Both defined playlists and undefined (default) playlists are valid
    LogHelper.log(
      'Sequencer.goMontage',
      `Going to montage ${montageIndex}, track ${trackIndex} (playlist: ${this._playlist?.id || 'default'})`
    );

    // ESSENTIAL: Preserve track override
    if (trackIndex !== undefined) {
      this.setMontageTrackOverride(montageIndex, trackIndex);
    }

    const finalTrackIndex = this.getMontageTrackIndex(montageIndex);
    const newPosition = new PlayerPosition(
      this._playlist,
      montageIndex,
      finalTrackIndex,
      0, // itemIndex
      30, // default duration
      0, // loopIndex
      0, // offset
      0 // mediaOffset
    );

    const player = ItemPlayer.ThePlayer;
    if (player) {
      player.setPosition(newPosition);
    }
    this.showMedia(newPosition, true);
  }

  // Playlist changes (Benchmark 3) - Handle both regular and default playlists
  public static assumeNewPlaylist(newPlaylist?: Playlist, montageIndex = 0) {
    const wasPlaying = this.isPlaying();
    this.stop();

    // ESSENTIAL: Detect playlist change vs same playlist
    const isPlaylistChange = this._playlist?.id !== newPlaylist?.id;

    // CRITICAL FIX: Clear App video/image state when switching playlists to prevent display blocking
    if (isPlaylistChange && TheApp) {
      LogHelper.log(
        'Sequencer.assumeNewPlaylist',
        'Clearing App video/image state for playlist switch'
      );
      TheApp.setState({
        videoShown: 0,
        video1: undefined,
        video2: undefined,
        imageShown: 0,
        image1: undefined,
        image2: undefined,
        videoPreloading: 0,
        imagePreloading: 0,
      });
    }

    this._playlist = newPlaylist;
    LogHelper.log(
      'Sequencer.assumeNewPlaylist',
      `${isPlaylistChange ? 'Changing to' : 'Reloading'} playlist: ID ${newPlaylist?.id || 'undefined'} (${newPlaylist?.name || 'default playlist'})`
    );

    if (isPlaylistChange) {
      // Clear track overrides for new playlist
      this.montageTrackOverrides.clear();
    }

    // Reset player state and create initial position
    const player = ItemPlayer.ThePlayer;
    if (player) {
      player.clearPosition();

      // CRITICAL: Create initial position for default playlist using global montages
      if (!newPlaylist) {
        const availableMontages = Object.values(Montages);
        if (availableMontages.length > 0) {
          const trackIndex = this.getMontageTrackIndex(montageIndex);
          const initialPosition = new PlayerPosition(
            undefined, // Default playlist
            montageIndex,
            trackIndex,
            0, // itemIndex
            30, // default duration
            0, // loopIndex
            0, // offset
            0 // mediaOffset
          );
          player.setPosition(initialPosition);
          LogHelper.log(
            'Sequencer.assumeNewPlaylist',
            'Created initial position for default playlist'
          );
        }
      }
    }

    // Always set initial position for new playlist
    this.goMontage(montageIndex);

    // Start playback if was playing before OR if this is a playlist change
    if (wasPlaying || isPlaylistChange) {
      LogHelper.log(
        'Sequencer.assumeNewPlaylist',
        `Auto-starting playback: wasPlaying=${wasPlaying}, isPlaylistChange=${isPlaylistChange}`
      );
      this.play();
    }
  }

  // ESSENTIAL: Track override system (for benchmarks 2 & 4)
  public static setMontageTrackOverride(montageIndex: number, trackIndex: number) {
    this.montageTrackOverrides.set(montageIndex, trackIndex);
    LogHelper.log(
      'Sequencer.setMontageTrackOverride',
      `Set montage ${montageIndex} to use track ${trackIndex}`
    );
  }

  public static getMontageTrackIndex(montageIndex: number): number {
    const override = this.montageTrackOverrides.get(montageIndex);
    if (override !== undefined) {
      return override;
    }

    // Use montage default track from playlist or global montages
    let montage;
    if (this._playlist) {
      montage = this._playlist.getMontage(montageIndex);
    } else {
      // For default playlists (undefined), use global montages
      montage = Object.values(Montages)[montageIndex];
    }
    return montage?.getTrackIndex() || 0;
  }

  public static setPendingMontageIndex(index: number) {
    this.pendingMontageIndex = index;
    LogHelper.log('Sequencer.setPendingMontageIndex', `Set pending montage index to: ${index}`);
  }

  public static getPendingMontageIndex(): number {
    return this.pendingMontageIndex;
  }

  public static getMontageTrackOverride(montageIndex: number): number | undefined {
    return this.montageTrackOverrides.get(montageIndex);
  }

  public static setVolume(volume: number) {
    LogHelper.log('Sequencer.setVolume', `Setting volume to: ${volume}`);
    // Integrate with App.tsx for volume control
    if (TheApp && TheApp.setVolume) {
      TheApp.setVolume(volume);
    }
  }

  // Helper function to create PlayerPosition
  private static createPosition(
    montageIndex: number,
    trackIndex: number,
    itemIndex = 0
  ): PlayerPosition {
    return new PlayerPosition(
      this._playlist!,
      montageIndex,
      trackIndex,
      itemIndex,
      30, // default duration
      0, // loopIndex
      0, // offset
      0 // mediaOffset
    );
  }

  /** Main playback loop (Benchmark 0) */
  private static run() {
    if (this.runner) {
      clearInterval(this.runner);
    }

    this.runner = setInterval(() => {
      if (this.status !== SequencerStatus.Playing) {
        return;
      }

      // Update current offset
      this.updateOffset();

      const player = ItemPlayer.ThePlayer;
      if (!player) {
        LogHelper.log('Sequencer.run', 'ItemPlayer.ThePlayer not ready - waiting');
        return;
      }

      const currentPosition = player.getPosition();

      if (!currentPosition) {
        // No current position - try to start playback
        LogHelper.log('Sequencer.run', 'No current position, initializing playback');
        this.initializePlayback();
        return;
      }

      // If position exists but no media loaded, ensure showMedia is called once
      if (
        TheApp &&
        TheApp.state &&
        TheApp.state.videoShown === 0 &&
        TheApp.state.imageShown === 0
      ) {
        this.showMedia(currentPosition, true);
        return;
      }

      // Check if current media has finished
      const currentDuration = this.getCurrentDuration(currentPosition);
      if (this.offset >= currentDuration) {
        LogHelper.log(
          'Sequencer.run',
          `Media finished: offset=${this.offset.toFixed(1)}s >= duration=${currentDuration}s, ` +
            `montage=${currentPosition.getMontageIndex()}, item=${currentPosition.getItemIndex()}`
        );
        this.goNext();
        return;
      }

      // Preload logic
      const preloadTime = currentDuration - 1.5; // 1.5 seconds before end
      if (this.canPreload && this.offset >= preloadTime) {
        this.preloadNext(currentPosition);
      }
    }, 300); // Main loop check interval
  }

  private static updateOffset() {
    if (this.status === SequencerStatus.Playing) {
      this.offset = this.startOffset + (Date.now() - this.startTime) / 1000.0;
    }
  }

  private static getCurrentDuration(position: PlayerPosition): number {
    // Get montage from playlist or global montages (for undefined playlists)
    let montage;
    if (this._playlist) {
      montage = this._playlist.getMontage(position.getMontageIndex());
    } else {
      // For default playlists (undefined), use global montages
      const globalMontages = Object.values(Montages);
      if (position.getMontageIndex() >= 0 && position.getMontageIndex() < globalMontages.length) {
        montage = globalMontages[position.getMontageIndex()];
      }
    }
    if (!montage) {
      LogHelper.error(
        'Sequencer.getCurrentDuration',
        `No montage found at index ${position.getMontageIndex()}`
      );
      return 30; // Default duration
    }

    const track = montage.seqs[position.getTrackIndex()];
    if (!track) return 30;

    const item = track.items[position.getItemIndex()];
    return item?.duration || 30;
  }

  private static initializePlayback() {
    // CRITICAL FIX: Both defined playlists AND undefined playlists (default) are valid
    // Only reject if we have neither a defined playlist nor global montages
    if (!this._playlist && Object.keys(Montages).length === 0) {
      LogHelper.log('Sequencer.initializePlayback', 'No playlist and no global montages available');
      return;
    }

    const trackIndex = this.getMontageTrackIndex(this.pendingMontageIndex);
    LogHelper.log(
      'Sequencer.initializePlayback',
      `Creating position: montage=${this.pendingMontageIndex}, track=${trackIndex}, playlist=${this._playlist ? this._playlist.id : 'default'}`
    );

    const startPosition = new PlayerPosition(
      this._playlist!,
      this.pendingMontageIndex,
      trackIndex,
      0, // itemIndex
      30, // default duration
      0, // loopIndex
      0, // offset
      0 // mediaOffset
    );

    const player = ItemPlayer.ThePlayer;
    if (player) {
      player.setPosition(startPosition);
      LogHelper.log('Sequencer.initializePlayback', 'Position set on player');
    } else {
      LogHelper.log('Sequencer.initializePlayback', 'Player not available');
    }

    this.showMedia(startPosition, true);
  }

  private static preloadNext(currentPosition: PlayerPosition) {
    const nextPosition = this.getNextPosition(currentPosition);
    if (nextPosition) {
      this.showMedia(nextPosition, false); // Preload only
      this.canPreload = false;

      // Reset preload flag
      setTimeout(() => {
        this.canPreload = true;
      }, 1000);
    }
  }

  /** ESSENTIAL: Displays or preloads media with App.tsx integration */
  private static showMedia(position: PlayerPosition, load: boolean) {
    // Get montage from playlist or global montages (for undefined playlists)
    let montage;
    if (this._playlist) {
      montage = this._playlist.getMontage(position.getMontageIndex());
    } else {
      // For default playlists (undefined), use global montages
      const montageArray = Object.values(Montages);
      const montageIndex = position.getMontageIndex();
      if (montageIndex >= 0 && montageIndex < montageArray.length) {
        montage = montageArray[montageIndex];
      }
    }
    if (!montage) return false;

    const track = montage.seqs[position.getTrackIndex()];
    if (!track) return false;

    const item = track.items[position.getItemIndex()];
    if (!item) return false;

    const artwork = item.artwork;
    if (!artwork) return false;

    LogHelper.log(
      'Sequencer.showMedia',
      `${load ? 'Loading' : 'Preloading'} ${artwork.filename} from montage ${position.getMontageIndex()}`
    );

    if (load) {
      // ESSENTIAL: Integrate with App.tsx for video display
      if (artwork.type === 'VID' && TheApp) {
        const videoFile = new VideoMediaFile(
          artwork.artwork_id || 0,
          `video-${artwork.artwork_id || 'unknown'}`,
          artwork.url,
          artwork.codecs || '',
          artwork.filename || 'unknown',
          0, // offset
          artwork.duration || 30,
          false, // loop
          undefined, // shapes
          undefined // backgroundColor
        );
        if (TheApp.showVideo) {
          TheApp.showVideo(videoFile);
        }
      } else if (artwork.type === 'IMG' && TheApp) {
        // Handle images similarly
        const imageFile = ImageMediaFile.getImage(
          artwork.artwork_id || 0,
          `image-${artwork.artwork_id || 'unknown'}`,
          artwork.url,
          artwork.filename || 'unknown',
          0, // offset
          artwork.duration || 30,
          undefined, // shapes
          undefined // backgroundColor
        );
        if (TheApp.showImage) {
          TheApp.showImage(imageFile);
        }
      }

      // Update timing for new media
      this.startTime = Date.now();
      this.startOffset = 0;
      this.offset = 0;
    } else {
      // Preload logic
      if (artwork.type === 'VID' && TheApp?.preloadVideo) {
        const videoFile = new VideoMediaFile(
          artwork.artwork_id || 0,
          `video-${artwork.artwork_id || 'unknown'}`,
          artwork.url,
          artwork.codecs || '',
          artwork.filename || 'unknown',
          0, // offset
          artwork.duration || 30,
          false, // loop
          undefined, // shapes
          undefined // backgroundColor
        );
        TheApp.preloadVideo(videoFile);
      } else if (artwork.type === 'IMG' && TheApp?.preloadImage) {
        // Preload images similarly to videos
        const imageFile = ImageMediaFile.getImage(
          artwork.artwork_id || 0,
          `image-${artwork.artwork_id || 'unknown'}`,
          artwork.url,
          artwork.filename || 'unknown',
          0, // offset
          artwork.duration || 30,
          undefined, // shapes
          undefined // backgroundColor
        );
        TheApp.preloadImage(imageFile);
      }
    }

    return true;
  }

  // Navigation logic
  private static getNextPosition(p: PlayerPosition): PlayerPosition | null {
    // Try next item
    const nextItemIndex = p.getItemIndex() + 1;
    // Get montage from playlist or global montages (for undefined playlists)
    let currentMontage;
    if (this._playlist) {
      currentMontage = this._playlist.getMontage(p.getMontageIndex());
    } else {
      // For default playlists (undefined), use global montages
      currentMontage = Object.values(Montages)[p.getMontageIndex()];
    }

    LogHelper.log(
      'Sequencer.getNextPosition',
      `Current: M${p.getMontageIndex()}T${p.getTrackIndex()}I${p.getItemIndex()}, ` +
        `trying next item: I${nextItemIndex}`
    );

    if (currentMontage && nextItemIndex < currentMontage.seqs[p.getTrackIndex()].items.length) {
      LogHelper.log('Sequencer.getNextPosition', `Next item found: I${nextItemIndex}`);
      return this.createPosition(p.getMontageIndex(), p.getTrackIndex(), nextItemIndex);
    }

    // Try next montage (same track, preserved via overrides)
    const nextMontageIndex = p.getMontageIndex() + 1;
    LogHelper.log(
      'Sequencer.getNextPosition',
      `No more items in current montage, trying next montage: M${nextMontageIndex}`
    );

    // Check if next montage exists (for both defined playlists and default playlists)
    const montageCount = this._playlist
      ? this._playlist.getMontagesCount()
      : Object.keys(Montages).length;
    if (nextMontageIndex < montageCount) {
      // ESSENTIAL: Preserve track across montages
      const currentTrack = p.getTrackIndex();
      LogHelper.log(
        'Sequencer.getNextPosition',
        `Next montage found: M${nextMontageIndex}, preserving track ${currentTrack}`
      );
      this.setMontageTrackOverride(nextMontageIndex, currentTrack);

      return this.createPosition(nextMontageIndex, currentTrack);
    }

    // Loop back to start if enabled OR for default playlists
    if (this._playlist?.loop || !this._playlist) {
      const firstTrack = this.getMontageTrackIndex(0);
      LogHelper.log('Sequencer.getNextPosition', 'Looping back to start: M0');
      return this.createPosition(0, firstTrack);
    }

    return null;
  }

  private static getPreviousPosition(p: PlayerPosition): PlayerPosition | null {
    // Try previous montage
    const prevMontageIndex = p.getMontageIndex() - 1;
    if (prevMontageIndex >= 0) {
      const trackIndex = this.getMontageTrackIndex(prevMontageIndex);
      return this.createPosition(prevMontageIndex, trackIndex);
    }

    // Loop to end if enabled (for both defined and default playlists)
    const shouldLoop = this._playlist?.loop || true; // Default playlists should loop
    if (shouldLoop) {
      const montageCount = this._playlist
        ? this._playlist.getMontagesCount()
        : Object.keys(Montages).length;
      const lastMontageIndex = montageCount - 1;
      const trackIndex = this.getMontageTrackIndex(lastMontageIndex);
      return this.createPosition(lastMontageIndex, trackIndex);
    }

    return null;
  }
}

// Expose Sequencer to window for debugging and App.tsx integration
if (typeof window !== 'undefined') {
  window.Sequencer = Sequencer;
}
