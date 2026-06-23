/**
 * telegram.js — GramJS CDN loader with multi-CDN fallback
 *
 * FIXED: Removed all ESM imports to prevent 'StringSession' crashes.
 * Removed 'crossOrigin="anonymous"' to bypass Render.com strict CORS blocking.
 */

function loadFromScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.src = url;
    
    // crossOrigin hata diya gaya hai taaki Render.com par script block na ho

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

  // ── 1. jsdelivr browser bundle (Primary - No CORS issues usually) ───────
  try {
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

  // ── 2. unpkg browser bundle (Fallback) ──────────────────────────────────
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

  throw new Error('All GramJS CDN sources failed.\n' + errors.join('\n'));
}

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
