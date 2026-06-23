/**
 * telegram.js — GramJS CDN loader with Node.js Polyfills
 *
 * FIXED: Injected Buffer and process directly into globalThis using
 * dynamic ESM imports BEFORE loading GramJS. This prevents the classic
 * "Buffer is not defined" crash during MTProto crypto operations.
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

  // 🔥 STEP 1: Polyfill Node.js Globals (Fixes "Buffer is not defined")
  try {
    const bufferMod = await import('https://esm.sh/buffer');
    const processMod = await import('https://esm.sh/process');
    
    // Inject Buffer into the browser's global scope
    globalThis.Buffer = bufferMod.Buffer;
    window.Buffer = bufferMod.Buffer;
    
    // Inject process into the browser's global scope
    const proc = processMod.default || processMod;
    globalThis.process = proc;
    window.process = proc;
    
    console.info('[TG] Node.js Globals (Buffer, process) polyfilled ✓');
  } catch (err) {
    console.warn('[TG] Polyfill load warning:', err.message);
  }

  // 🔥 STEP 2: Load GramJS 
  try {
    // ?bundle forces all files into one, &target=es2022 forces a fresh cache
    const mod = await import('https://esm.sh/telegram@2.26.22?bundle&target=es2022');
    const lib = extractLib(mod);
    console.info('[TG] GramJS loaded from esm.sh (bundled) ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] esm.sh failed:', err.message);
    errors.push('esm.sh: ' + err.message);
  }

  // ── STEP 3: Skypack (Fallback) ───────────────────────────────────────────
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
