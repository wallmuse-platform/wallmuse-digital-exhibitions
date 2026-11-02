export class FileHelper {
  public static isImage(f: string) {
    const ext = this.getExtension(f);
    return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
  }

  public static isPSD(f: string) {
    const ext = this.getExtension(f);
    return ext === 'psd';
  }

  public static isVideo(f: string) {
    const ext = this.getExtension(f);
    return ext === 'mp4' || ext === 'mov';
  }

  public static getExtension(ext: string) {
    const p = ext.lastIndexOf('.');
    if (p >= 0) {
      return ext.substring(p + 1).toLowerCase();
    } else {
      return '';
    }
  }
}
