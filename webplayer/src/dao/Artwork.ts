import { myParseFloat, myParseInt } from '../manager/Helper';

export class Artwork {
  public artwork_id!: number;
  public title!: string;
  /** VID, IMG, AUD, HTML, TEXT */
  public type!: string;
  public url!: string;
  public codecs?: string;
  public md5?: string;
  public size!: number;
  public filename?: string;
  public width!: number;
  public height!: number;
  public duration!: number;
  public subtitle_url?: string;
  public subtitle_md5?: string;
  public subtitle_filename?: string;

  public constructor(json?: any) {
    this.artwork_id = myParseInt(this.artwork_id);
    this.size = myParseInt(this.size);
    this.width = myParseInt(this.width);
    this.height = myParseInt(this.height);
    this.duration = myParseFloat(this.duration);
    if (json) {
      Object.assign(this, json);
    }

    // FIXED: Correct the port in URLs from 8443 to 8444
    this.correctUrlPort();
  }

  // FIXED: Method to correct both domain and port in URLs, but avoid double 'manager.'
  private correctUrlPort(): void {
    if (this.url) {
      if (this.url.includes('manager.wallmuse.com:8443')) {
        this.url = this.url.replace('manager.wallmuse.com:8443', 'manager.wallmuse.com:8444');
        console.log('🔧 [URL-FIX] Corrected artwork URL port from 8443 to 8444:', this.url);
      } else if (this.url.includes('wallmuse.com:8443')) {
        this.url = this.url.replace('wallmuse.com:8443', 'manager.wallmuse.com:8444');
        console.log(
          '🔧 [URL-FIX] Corrected artwork URL from wallmuse.com:8443 to manager.wallmuse.com:8444:',
          this.url
        );
      }
    }
    if (this.subtitle_url) {
      if (this.subtitle_url.includes('manager.wallmuse.com:8443')) {
        this.subtitle_url = this.subtitle_url.replace(
          'manager.wallmuse.com:8443',
          'manager.wallmuse.com:8444'
        );
        console.log(
          '🔧 [URL-FIX] Corrected subtitle URL port from 8443 to 8444:',
          this.subtitle_url
        );
      } else if (this.subtitle_url.includes('wallmuse.com:8443')) {
        this.subtitle_url = this.subtitle_url.replace(
          'wallmuse.com:8443',
          'manager.wallmuse.com:8444'
        );
        console.log(
          '🔧 [URL-FIX] Corrected subtitle URL from wallmuse.com:8443 to manager.wallmuse.com:8444:',
          this.subtitle_url
        );
      }
    }
  }
}
