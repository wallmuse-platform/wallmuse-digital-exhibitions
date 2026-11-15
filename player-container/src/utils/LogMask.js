// Masks secrets in everything this app writes to the console: session tokens (the "session"
// value used throughout wsTools.js/api.js — actually the user's auth token, see getUserId() in
// Utils.js), environment crypt_keys, derived environment keys, passwords, signed-link
// signatures. Values are never needed for debugging: ids and "present/missing" are enough.
//
// Call installLogMask() explicitly, AFTER Sentry.init() — do NOT import this for its side
// effect alone. ES imports are hoisted and run before any other top-level code in the
// importing module, so a bare side-effect import would patch console before Sentry.init()
// runs, making Sentry's own console-wrapping (its Breadcrumbs integration, which captures
// console calls as breadcrumbs and — with sendDefaultPii: true — can ship them to Sentry's
// servers on error reports) the OUTER layer, seeing raw unmasked arguments before this file
// ever gets a chance to mask them. Installing it after Sentry.init() makes masking the outer
// layer instead, so only masked data ever reaches Sentry's breadcrumb capture.
// See docs/sensitive_... notes in webplayer2B for the sibling port this was adapted from.

const SECRET_FIELDS = /^(key|envkey|environkey|crypt_key|cryptkey|session|sessionid|token|password|pwd|sig|apikey|api_key)$/i;
const MASK = '…';
// Sessions and tokens: a short fingerprint instead, so a log still shows when the session changed
// (same fingerprint = same session) without the value. FNV-1a, 4 hex digits, cannot be reversed.
const FINGERPRINTED = /^(session|sessionid|token)$/i;
function fingerprint(v) {
  let h = 0x811c9dc5;
  for (let i = 0; i < v.length; i++) h = Math.imul(h ^ v.charCodeAt(i), 0x01000193);
  return MASK + '#' + ((h >>> 0) & 0xffff).toString(16).padStart(4, '0');
}
const hide = (field, value) => (FINGERPRINTED.test(field) ? fingerprint(value) : MASK);

function maskString(s) {
  return s
    .replace(/\b(session|key|sig|token|envKey|crypt_key)=([^&\s"']+)/gi, (_m, f, v) => `${f}=${hide(f, v)}`)
    .replace(/(["']?)\b(key|session|token|crypt_key|password|sig)\1\s*[:=]\s*(["'])([^"']*)\3/gi, (_m, q, f, q2, v) => `${q}${f}${q}:${q2}${hide(f, v)}${q2}`)
    .replace(/\b(wp|ws)-[A-Za-z0-9_.@]+-[^\s"'&,)]+/g, (m) => fingerprint(m));
}

function maskValue(v, depth, seen) {
  if (typeof v === 'string') return maskString(v);
  if (v === null || typeof v !== 'object') return v;
  // Leave browser objects as they are (DOM nodes, events, errors keep their DevTools view)
  if (
    (typeof Node !== 'undefined' && v instanceof Node) ||
    (typeof Event !== 'undefined' && v instanceof Event) ||
    v instanceof Error ||
    ArrayBuffer.isView(v) ||
    v instanceof ArrayBuffer
  ) {
    return v;
  }
  if (seen.has(v)) return '[circular]';
  if (depth > 5) return v;
  seen.add(v);
  if (Array.isArray(v)) return v.slice(0, 500).map((x) => maskValue(x, depth + 1, seen));
  const out = {};
  let n = 0;
  for (const k of Object.keys(v)) {
    if (++n > 300) break;
    const x = v[k];
    out[k] = SECRET_FIELDS.test(k) && x !== undefined && x !== null && x !== '' && typeof x !== 'object' ? hide(k, String(x)) : maskValue(x, depth + 1, seen);
  }
  return out;
}

export function maskArgs(args) {
  const seen = new WeakSet();
  return args.map((a) => maskValue(a, 0, seen));
}

export function installLogMask() {
  const c = console;
  if (c.__wmMasked) return;
  c.__wmMasked = true;
  for (const level of ['log', 'info', 'warn', 'error', 'debug', 'trace']) {
    const orig = c[level];
    if (typeof orig !== 'function') continue;
    c[level] = function (...args) {
      let masked;
      try {
        masked = maskArgs(args);
      } catch {
        masked = args;
      }
      return orig.apply(this, masked);
    };
  }
}
