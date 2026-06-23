/**
 * telegram.js — GramJS CDN loader
 *
 * FIXED: The pre-compiled browser bundle file does NOT exist in v2.26.22.
 * We now use pure ESM imports with '?bundle' to force CDNs to package all 
 * internal dependencies into a single file, preventing 'generateRandomLong' errors.
 */

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

  // ── 1. esm.sh Bundled (Primary: Packs all internals into one file) ───────
  try {
    const mod = await import('https://esm.sh/telegram@2.26.22?bundle');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from esm.sh (bundled) ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] esm.sh failed:', err.message);
    errors.push('esm.sh: ' + err.message);
  }

  // ── 2. Skypack (Excellent built-in Node polyfills) ───────────────────────
  try {
    const mod = await import('https://cdn.skypack.dev/telegram@2.26.22?min');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from Skypack ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] skypack failed:', err.message);
    errors.push('skypack: ' + err.message);
  }

  // ── 3. jsdelivr ESM (Fallback) ───────────────────────────────────────────
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/telegram@2.26.22/+esm');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from jsdelivr ESM ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] jsdelivr ESM failed:', err.message);
    errors.push('jsdelivr ESM: ' + err.message);
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
