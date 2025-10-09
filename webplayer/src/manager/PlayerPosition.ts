import { Playlist } from '../dao/Playlist';

/**
 * Contains all the details concerning a position in a track, suche as the offset in time, byut also the concerned artwork, etc.
 */
export class PlayerPosition {
  private playlist?: Playlist; // Make playlist optional for default playlist
  /** Index of the montage in the playlist */
  private montageIndex: number;
  /** Index of the track in the montage */
  private trackIndex: number;
  /** Index of the item in the track */
  private itemIndex: number;
  /** Index of the loop for the item */
  private loopIndex: number;
  /** Global offset */
  private offset: number;
  /** Offset in the current loop of the current item, ie the offset in the playing media */
  private mediaOffset: number;
  private duration: number;
  private end = false;

  public static fromPosition(p: PlayerPosition) {
    // CRITICAL FIX: Create a fresh position with refreshed duration
    const newPosition = new PlayerPosition(
      p.playlist,
      p.montageIndex,
      p.trackIndex,
      p.itemIndex,
      p.duration,
      p.loopIndex,
      p.offset,
      p.mediaOffset
    );

    // CRITICAL FIX: Force refresh the duration to ensure it's current
    const refreshedDuration = newPosition.refreshDuration();

    // Debug logging removed to reduce log noise

    return newPosition;
  }

  public static offsetedPosition(p: PlayerPosition, loopIndex = 0, offset = 0, mediaOffset = 0) {
    return new PlayerPosition(
      p.playlist,
      p.montageIndex,
      p.trackIndex,
      p.itemIndex,
      p.duration,
      loopIndex,
      offset,
      mediaOffset
    );
  }

  // FIXED: Clean constructor without double assignment - now supports default playlist
  public constructor(
    playlist: Playlist | undefined,
    montageIndex: number,
    trackIndex: number,
    itemIndex: number,
    duration: number,
    loopIndex = 0,
    offset = 0,
    mediaOffset = 0
  ) {
    this.playlist = playlist;
    this.montageIndex = montageIndex;
    this.trackIndex = trackIndex;
    this.itemIndex = itemIndex;
    this.duration = duration;

    // CRITICAL FIX: Set these values directly without overwriting with 0 first
    this.loopIndex = loopIndex;
    this.offset = offset;
    this.mediaOffset = mediaOffset;

    // Debug logging removed to reduce log noise
  }

  /** Adds dt to the position */
  public seek(dt: number) {
    this.offset += dt;

    // CRITICAL FIX: If dt is negative and being used to reset position (common pattern: -p.getOffset()),
    // then reset mediaOffset to 0 instead of accumulating the negative value
    if (dt < 0 && Math.abs(dt + this.offset) < 0.1) {
      // This is a reset operation - set mediaOffset to 0
      this.mediaOffset = 0;
      console.log(
        '🔍 [PlayerPosition.seek] Reset operation detected - mediaOffset reset to 0, dt:',
        dt,
        'offset:',
        this.offset
      );
    } else {
      // Normal seek operation - add the delta
      this.mediaOffset += dt;
      console.log(
        '🔍 [PlayerPosition.seek] Normal seek operation - mediaOffset:',
        this.mediaOffset,
        'dt:',
        dt
      );
    }
  }

  public getPlaylist() {
    return this.playlist;
  }

  public getMontage() {
    if (
      this.playlist &&
      this.montageIndex >= 0 &&
      this.montageIndex < this.playlist.getMontagesCount()
    ) {
      return this.playlist.getMontage(this.montageIndex);
    } else if (!this.playlist && this.montageIndex >= 0) {
      // Default playlist case - get montage from global montages
      const { Montages } = require('./Globals');
      const globalMontages = Object.values(Montages);
      if (this.montageIndex < globalMontages.length) {
        return globalMontages[this.montageIndex] as any;
      }
    }
    return undefined;
  }

  public getArtwork() {
    const m = this.getMontage();
    if (m && m.seqs && this.trackIndex >= 0) {
      const t = m.seqs[this.trackIndex];
      if (t && this.itemIndex >= 0 && t.items && t.items[this.itemIndex]) {
        return t.items[this.itemIndex].artwork;
      }
    }
    return undefined;
  }

  public getMontageIndex() {
    return this.montageIndex;
  }

  public getTrackIndex() {
    return this.trackIndex;
  }

  public getItemIndex() {
    return this.itemIndex;
  }

  public getDuration() {
    return this.duration;
  }

  /** CRITICAL FIX: Force refresh duration from current montage/item data */
  public refreshDuration(): number {
    try {
      const montage = this.getMontage();
      if (montage && montage.seqs && this.trackIndex >= 0) {
        const track = montage.seqs[this.trackIndex];
        if (track && track.items && this.itemIndex >= 0 && this.itemIndex < track.items.length) {
          const newDuration = track.items[this.itemIndex].duration;
          if (newDuration !== this.duration) {
            console.log('🔍 [PlayerPosition.refreshDuration] Duration updated:', {
              oldDuration: this.duration,
              newDuration: newDuration,
              montageIndex: this.montageIndex,
              trackIndex: this.trackIndex,
              itemIndex: this.itemIndex,
              montageName: montage.name || 'unknown',
            });
            this.duration = newDuration;
          }
        }
      }
    } catch (error) {
      console.warn('🔍 [PlayerPosition.refreshDuration] Error refreshing duration:', error);
    }
    return this.duration;
  }

  public getLoopIndex() {
    return this.loopIndex;
  }

  /** Global offset */
  public getOffset() {
    return this.offset;
  }

  /** Offset in the current loop of the current item, ie the offset in the playing media */
  public getMediaOffset() {
    return this.mediaOffset;
  }

  public isEnd() {
    return this.end;
  }

  public setEnd(end: boolean) {
    this.end = end;
  }

  public toString() {
    const m = this.getMontage();
    if (m) {
      const a = this.getArtwork();
      if (a) {
        return 'Pos[' + m.name + '/' + a.title + ']';
      } else {
        return 'Pos[' + m.name + '/?]';
      }
    } else {
      return 'Pos[' + this.montageIndex + '/' + this.itemIndex + ']';
    }
  }
}
