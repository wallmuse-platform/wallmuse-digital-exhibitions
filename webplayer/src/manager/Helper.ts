import dayjs from 'dayjs';

export const datetimeFromString = (s: string): Date => {
  return dayjs(s, 'YYYYMMDDTHHmmss').toDate();
};

export const datetimeToString = (d: Date) => {
  return dayjs(d).format('YYYY-MM-DD HH:mm:ss.SSS');
};

export const dateFromString = (s: string) => {
  return dayjs(s, 'YYYYMMDD').toDate();
};

export const dateToString = (d: Date) => {
  return dayjs(d).format('YYYY-MM-DD');
};

export const myParseInt = (s: any): number => {
  if (typeof s === 'string') {
    return parseInt(s, 10);
  } else {
    return s;
  }
};

export const myParseFloat = (s: any): number => {
  if (typeof s === 'string') {
    return parseFloat(s);
  } else {
    return s;
  }
};

export const myParseBoolean = (s: any): boolean => {
  if (typeof s === 'string') {
    return s === '1' || s === 'Y';
  } else {
    return s;
  }
};

export const myParseDatetime = (s: any): Date => {
  if (typeof s === 'string') {
    return datetimeFromString(s);
  } else {
    return s;
  }
};

export const myParseDate = (s: any): Date => {
  if (typeof s === 'string') {
    return dateFromString(s);
  } else {
    return s;
  }
};
