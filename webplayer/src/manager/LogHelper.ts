import { datetimeToString } from './Helper';

export class LogHelper {
  static log = (title: string, message: any, ...other: any[]) => {
    title = '[' + datetimeToString(new Date()) + '] ' + title;
    if (typeof message === 'string') {
      if (other && other.length > 0) {
        console.log(title + ': ' + message, other);
      } else {
        console.log(title + ': ' + message);
      }
    } else {
      console.log(title, message);
    }
  };

  static error = (title: string, message: any, ...other: any[]) => {
    this.log('## ERROR ' + title, message, other);
  };
}
