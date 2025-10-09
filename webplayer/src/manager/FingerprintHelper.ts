import * as sha256 from 'fast-sha256';

export const getFingerprint = () => {
  const s = getCanvasFP() + getUserAgentFP() + getNavigatorPropsFP() + getScreenFP();
  return Array.from(sha256.hash(new TextEncoder().encode(s)))
    .map(i2hex)
    .join('');
};

const i2hex = (i: number) => {
  return ('0' + i.toString(16)).slice(-2);
};

const getCanvasFP = () => {
  const canvas = document.createElement('canvas');
  if (!canvas.getContext || !canvas.getContext('2d')) {
    return '';
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  // See https://www.browserleaks.com/canvas#how-does-it-work
  const txt = 'TheQuickBrownFoxJumpsOverTheLazyDog';
  ctx.textBaseline = 'top';
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText(txt, 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText(txt, 4, 17);
  return canvas.toDataURL();
};

const getUserAgentFP = () => {
  return navigator.userAgent || '';
};

const getNavigatorPropsFP = () => {
  let s = '';
  for (const prop in navigator) {
    s += prop + '-';
  }
  s += navigator.hardwareConcurrency + '-' + navigator.platform;
  return s;
};

const getScreenFP = () => {
  // eslint-disable-next-line no-restricted-globals
  const s = screen;
  return (
    '' +
    s.width +
    'x' +
    s.height +
    '-' +
    s.availWidth +
    'x' +
    s.availHeight +
    '-' +
    s.colorDepth +
    '-' +
    s.pixelDepth
  );
};
