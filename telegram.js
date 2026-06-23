/**
 * telegram.js — GramJS CDN loader with multi-CDN fallback
 *
 * FIXED: Removed all ESM imports because they miss internal dependencies 
 * like helpers.generateRandomLong. Now we ONLY use the pre-compiled 
 * browser bundle, falling back to different CDNs if one fails.
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

function extractLib(mod) {
  const root = (mod && mod.default) ? { ...mod.default, ...mod } : mod;

  const TelegramClient = root.TelegramClient || (root.client && root.client.TelegramClient);
  const Api = root.Api || root.tl || (root.api && root.api.Api);
  const StringSession = 
    root.StringSession || 
    (root.sessions && root.sessions.StringSession) || 
    (root.session && root.session.StringSession);

  if (!TelegramClient) throw new Error('TelegramClient not found in module');
  if (!StringSession)   throw new Error('StringSession not found in module');

  return { TelegramClient, Api, StringSession };
}

export async function loadGramJS() {
  const errors = [];

  // ── 1. unpkg browser bundle (Primary) ──────────────────────────────────
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

  // ── 2. jsdelivr browser bundle (Fallback 1 - FIXED) ────────────────────
  try {
    // ESM ki jagah hum jsdelivr ka browser bundle use kar rahe hain
    const mod = await loadFromScript(
      'https://cdn.jsdelivr.net/npm/telegram@2.26.22/dist/browser/index.js'
    );
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from jsdelivr browser bundle ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] jsdelivr failed:', err.message);
    errors.push('jsdelivr: ' + err.message);
  }

  // ── 3. cdnjs browser bundle (Fallback 2 - EXTRA SAFETY) ────────────────
  try {
    const mod = await loadFromScript(
      'https://cdnjs.cloudflare.com/ajax/libs/telegram/2.26.22/telegram.min.js'
    );
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from cdnjs browser bundle ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] cdnjs failed:', err.message);
    errors.push('cdnjs: ' + err.message);
  }

  throw new Error('All GramJS CDN sources failed.\n' + errors.join('\n'));
}

// Cached promise — loads only once per page session
let _gramPromise = null;

export function ensureGramReady() {
  if (!_gramPromise) {
    _gramPromise = loadGramJS().catch((err) => {
      _gramPromise = null; // allow retry
      throw err;
    });
  }
  return _gramPromise;
}
