import { myParseBoolean, myParseInt } from '../manager/Helper';
import { MontageLight } from './MontageLight';
import { getMontage } from '../manager/Globals';
import { LogHelper } from '../manager/LogHelper';

export class Playlist {
  public id!: number;
  /** 0 or 1 */
  public random!: boolean;
  public loop = true;
  public name!: string;
  /** Signature to track montage order changes */
  public montageOrderSignature?: string;
  private montages: MontageLight[];

  public static randomize(playlist: Playlist) {
    const p = new Playlist(playlist);
    const count = p.montages.length;
    if (count > 1) {
      const m0 = p.montages[0];
      for (let i = 0; i < count; i++) {
        // Exchange random indexes
        p.exchangeMontages(i, Math.floor(Math.random() * count));
      }
      // Check the first one, just to be (almost) sure that it has changed
      if (p.montages[0] == m0) {
        p.exchangeMontages(0, Math.floor(Math.random() * count));
      }
    }
    return p;
  }

  public constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    }
    this.id = myParseInt(this.id);
    this.random = myParseBoolean(this.random);
    // @ts-ignore
    this.montages = this.montages.map(m => new MontageLight(m));

    // Generate montage order signature if not provided
    if (!this.montageOrderSignature && this.montages) {
      this.montageOrderSignature = this.generateMontageOrderSignature();
    }
  }

  private exchangeMontages(i1: number, i2: number) {
    const tmp = this.montages[i1];
    this.montages[i1] = this.montages[i2];
    this.montages[i2] = tmp;
  }

  getMontagesCount() {
    return this.montages.length;
  }

  getMontage(i: number) {
    // CRITICAL FIX: Check bounds before accessing montage
    if (i < 0 || i >= this.montages.length || !this.montages[i]) {
      LogHelper.error(
        'Playlist.getMontage',
        `🚨 MONTAGE INDEX OUT OF BOUNDS:
            - Requested index: ${i}
            - Available montages: ${this.montages.length}
            - Playlist ID: ${this.id}
            - Playlist Name: ${this.name}`
      );
      return null;
    }

    const m = getMontage(this.montages[i].id);
    if (!m) {
      LogHelper.error(
        'Playlist.getMontage',
        `🔍 MONTAGE LOADING ERROR - Detailed Info:
            - Requested montage index: ${i}
            - Requested montage ID: ${this.montages[i].id}
            - Playlist ID: ${this.id}
            - Playlist Name: ${this.name}
            - Total montages in playlist: ${this.montages.length}
            - Available montage IDs: ${this.montages.map(m => m.id).join(', ')}
            - Global montages cache keys: ${Object.keys(
              require('../manager/Globals').Montages
            ).join(', ')}
            - Timestamp: ${Date.now()}`
      );
    }
    return m;
  }

  /**
   * Generate a signature based on montage order for change detection
   */
  private generateMontageOrderSignature(): string {
    if (!this.montages || this.montages.length === 0) {
      return '';
    }

    // Create a signature based on montage IDs in order
    const montageIds = this.montages.map(m => m.id).join(',');
    return montageIds;
  }

  /**
   * Update the montage order signature (called when montages are reordered)
   */
  public updateMontageOrderSignature(): void {
    this.montageOrderSignature = this.generateMontageOrderSignature();
  }
}
