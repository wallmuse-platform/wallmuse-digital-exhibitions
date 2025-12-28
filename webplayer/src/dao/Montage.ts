import { MontageLight } from './MontageLight';
import { Track } from './Track';
import { Screen } from './Screen';
import { TheScreen } from '../manager/Globals';

export class Montage extends MontageLight {
  public seqs: Track[];
  public screens?: Screen[];

  public constructor(json?: any) {
    super(json);

    // Handle case where seqs is not provided in the JSON
    if (json.seqs && Array.isArray(json.seqs)) {
      this.seqs = json.seqs.map((t: any) => new Track(t));
    } else {
      console.warn('[Montage] No seqs data provided in montage JSON, creating empty tracks array');
      this.seqs = [];
    }

    console.log('[Montage] Constructor received json.screens:', json.screens);
    if (json.screens && Array.isArray(json.screens)) {
      this.screens = json.screens.map((t: any) => new Screen(t));
      console.log('[Montage] Created screens array:', {
        count: this.screens.length,
        screenIds: this.screens.map(s => s.id),
        screensWithSeqRefs: this.screens
          .filter((s: any) => s.seq_id)
          .map((s: any) => ({
            id: s.id,
            seq_id: s.seq_id,
          })),
      });
    } else {
      console.log('[Montage] No screens data in JSON');
    }
  }

  public getTrackIndex(seqValue?: number) {
    // Track selection logging condensed

    // Check for seq-based track selection from navigation parameters
    if (seqValue !== undefined && seqValue !== null) {
      if (seqValue >= 0 && seqValue < this.seqs.length) {
        console.log(
          `[TRACK-SELECTION] Using navigation seq parameter: seq ${seqValue} (track ${seqValue + 1})`
        );
        return seqValue;
      } else {
        console.warn(
          `[TRACK-SELECTION] Navigation seq ${seqValue} is out of range (0-${this.seqs.length - 1}), falling back to screen-based logic`
        );
      }
    }

    // FIXED: Remove window.SELECTED_TRACK fallback since it's abandoned
    // Track selection should only come from navigation parameters or screen-based logic

    // Fall back to original screen-based logic
    for (let i = 0; i < this.seqs.length; i++) {
      const track = this.seqs[i];
      if (track.screens) {
        for (let id of track.screens) {
          let screen = Screen.getScreenById(id.id);
          if (screen && screen.name === TheScreen) {
            console.log(
              `[TRACK-SELECTION] Using screen-based track selection: track ${i + 1} (index ${i})`
            );
            return i;
          }
        }
      }
    }

    // FIXED: Use screen's seq reference from environment data instead of last track
    // This ensures we use the correct track association (seq 0, track 1) from the screen
    try {
      const { wsTools } = require('../manager/start');
      const screenId = wsTools.screenId;
      const environId = wsTools.environ?.environId;

      if (screenId && environId && wsTools.environ && wsTools.environ.environ) {
        const environment = wsTools.environ.environ;
        if (environment.screens && environment.screens.length > 0) {
          const currentScreen = environment.screens.find((screen: any) => screen.id === screenId);

          if (
            currentScreen &&
            (currentScreen as any).seq_refs &&
            (currentScreen as any).seq_refs.length > 0
          ) {
            const trackId = (currentScreen as any).seq_refs[0].id;
            const trackIndex = parseInt(trackId) - 1; // Convert to 0-based index

            if (trackIndex >= 0 && trackIndex < this.seqs.length) {
              console.log(
                `[TRACK-SELECTION] Using screen seq reference: seq ${trackIndex} (track ${trackIndex + 1}) from screen data`
              );
              return trackIndex;
            } else {
              console.warn(
                `[TRACK-SELECTION] Screen seq reference ${trackIndex} is out of range (0-${this.seqs.length - 1}), falling back to track 0`
              );
            }
          }
        }
      }
    } catch (error) {
      console.log('[TRACK-SELECTION] Error getting track index from screen data:', error);
    }

    // Final fallback: use track 0 (first track) instead of last track
    console.log(
      `[TRACK-SELECTION] ${this.name}: Using fallback track 0 (${this.seqs.length} tracks available)`
    );
    return 0;
  }

  public isReady() {
    // There is no download, so montage is always ready
    return true;
  }
}
