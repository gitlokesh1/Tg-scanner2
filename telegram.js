/**
 * telegram.js — GramJS CDN loader with multi-CDN fallback
 *
 * IMPORTANT: The unpkg *browser bundle* is the only CDN that reliably
 * includes ALL GramJS internals (helpers, crypto, MTProto) in one file.
 * ESM-only CDNs (esm.sh, jsdelivr) often miss internal dependencies
 * like helpers.generateRandomLong, causing crashes after TelegramClient
 * is instantiated. So we always try the browser bundle first.
 */

/**
 * Load unpkg browser bundle via <script> tag.
 * It exposes everything on window.gramjs (or window.TelegramLib).
 */
function loadFromScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.src = url;
    s.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      s.remove();
      reject(new Error(`Timeout loading script: ${url}`));
    }, 40000);

    s.onload = () => {
      clearTimeout(timer);
      // The unpkg browser build exposes window.gramjs
      const g = window.gramjs || window.TelegramLib;
      if (g && g.TelegramClient) {
        resolve(g);
      } else {
        reject(new Error('TelegramClient not found on window after script load'));
      }
    };

    s.onerror = () => {
      clearTimeout(timer);
      s.remove();
      reject(new Error(`Script load error: ${url}`));
    };

    document.head.appendChild(s);
  });
}

/**
 * Given a raw module/object, extract { TelegramClient, Api, StringSession }.
 * Handles multiple export shapes from different CDNs.
 */
function extractLib(mod) {
  const root = (mod && mod.default) ? { ...mod.default, ...mod } : mod;

  const TelegramClient =
    root.TelegramClient ||
    (root.client && root.client.TelegramClient);

  const Api =
    root.Api ||
    root.tl ||
    (root.api && root.api.Api);

  const StringSession =
    root.StringSession ||
    (root.sessions && root.sessions.StringSession) ||
    (root.session && root.session.StringSession);

  if (!TelegramClient) throw new Error('TelegramClient not found in module');
  if (!StringSession)   throw new Error('StringSession not found in module');

  return { TelegramClient, Api, StringSession };
}

/**
 * Try CDN sources in order.
 * unpkg browser bundle is FIRST because it's the only fully-bundled build.
 * ESM sources are fallbacks only.
 */
export async function loadGramJS() {
  const errors = [];

  // ── 1. unpkg browser bundle (most reliable, fully bundled) ──────────────
  try {
    const mod = await loadFromScript(
      'https://unpkg.com/telegram@2.26.22/dist/browser/index.js'
    );
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from unpkg browser bundle ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] unpkg failed:', err.message);
    errors.push('unpkg: ' + err.message);
  }

  // ── 2. esm.sh (ESM fallback) ─────────────────────────────────────────────
  try {
    const [tgMod, sessMod] = await Promise.all([
      import('https://esm.sh/telegram@2.26.22'),
      import('https://esm.sh/telegram@2.26.22/sessions'),
    ]);
    const lib = extractLib({ ...tgMod, StringSession: sessMod.StringSession });
    console.info('[TG] GramJS loaded from esm.sh ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] esm.sh failed:', err.message);
    errors.push('esm.sh: ' + err.message);
  }

  // ── 3. jsdelivr ESM (last resort) ────────────────────────────────────────
  try {
    const [tgMod, sessMod] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/telegram@2.26.22/+esm'),
      import('https://cdn.jsdelivr.net/npm/telegram@2.26.22/sessions/+esm'),
    ]);
    const lib = extractLib({ ...tgMod, StringSession: sessMod.StringSession });
    console.info('[TG] GramJS loaded from jsdelivr ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] jsdelivr failed:', err.message);
    errors.push('jsdelivr: ' + err.message);
  }

  throw new Error('All GramJS CDN sources failed.\n' + errors.join('\n'));
}

// Cached promise — loads only once per page session
let _gramPromise = null;

/**
 * Returns a cached promise that resolves to the GramJS lib.
 * Safe to call multiple times from anywhere.
 */
export function ensureGramReady() {
  if (!_gramPromise) {
    _gramPromise = loadGramJS().catch((err) => {
      _gramPromise = null; // allow retry
      throw err;
    });
  }
  return _gramPromise;
}
