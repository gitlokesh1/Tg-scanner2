/**
 * telegram.js — GramJS CDN loader
 *
 * FIXED: Added Node.js Polyfills (Buffer, process, global) required by GramJS
 * crypto operations when using ESM bundlers.
 */

// ── Node.js Polyfills ────────────────────────────────────────────────────────
async function loadPolyfills() {
  // 1. Define global and process (often required by Node.js modules)
  window.global = window.global || window;
  window.process = window.process || { env: {}, nextTick: (cb) => setTimeout(cb, 0) };

  // 2. Load Buffer from CDNJS if it doesn't exist
  if (window.Buffer) return;

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/buffer/6.0.3/buffer.min.js';
    s.crossOrigin = 'anonymous'; // Safe for cdnjs
    s.onload = () => {
      // Attach Buffer to the global window object
      window.Buffer = window.buffer.Buffer; 
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Buffer polyfill'));
    document.head.appendChild(s);
  });
}

// ── GramJS Extractor ─────────────────────────────────────────────────────────
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

// ── Main Loader ──────────────────────────────────────────────────────────────
export async function loadGramJS() {
  const errors = [];

  // 🔥 STEP 1: Load Polyfills BEFORE loading GramJS
  try {
    await loadPolyfills();
    console.info('[TG] Node.js Polyfills (Buffer) loaded ✓');
  } catch (err) {
    console.warn('[TG] Polyfill warning:', err.message);
  }

  // 🔥 STEP 2: Load GramJS (ESM Bundled)
  try {
    const mod = await import('https://esm.sh/telegram@2.26.22?bundle');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from esm.sh (bundled) ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] esm.sh failed:', err.message);
    errors.push('esm.sh: ' + err.message);
  }

  try {
    const mod = await import('https://cdn.skypack.dev/telegram@2.26.22?min');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from Skypack ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] skypack failed:', err.message);
    errors.push('skypack: ' + err.message);
  }

  throw new Error('All GramJS CDN sources failed.\n' + errors.join('\n'));
}

// ── Caching ──────────────────────────────────────────────────────────────────
let _gramPromise = null;

export function ensureGramReady() {
  if (!_gramPromise) {
    _gramPromise = loadGramJS().catch((err) => {
      _gramPromise = null; 
      throw err;
    });
  }
  return _gramPromise;
}
