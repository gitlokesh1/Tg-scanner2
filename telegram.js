/**
 * telegram.js — Official Browser Build Loader
 *
 * FIXED: Switched to GramJS v2.22.2 which officially includes the pre-compiled 
 * browser bundle. This bypasses all ESM/Node.js polyfill issues.
 */

function loadFromScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.src = url;
    
    s.onload = () => {
      const root = window.gramjs || window.telegram || window.TelegramLib;
      if (!root || !root.TelegramClient) {
        reject(new Error('TelegramClient not found on window object.'));
        return;
      }

      const TelegramClient = root.TelegramClient;
      const Api = root.Api || root.tl || (root.api && root.api.Api);
      const StringSession = 
        root.StringSession || 
        (root.sessions && root.sessions.StringSession) || 
        (root.session && root.session.StringSession);

      resolve({ TelegramClient, Api, StringSession });
    };
    
    s.onerror = () => reject(new Error(`Failed to load: ${url}`));
    document.head.appendChild(s);
  });
}

export async function loadGramJS() {
  try {
    const lib = await loadFromScript('https://cdn.jsdelivr.net/npm/telegram@2.22.2/dist/browser/index.js');
    console.info('[TG] GramJS Browser Build loaded successfully ✓');
    return lib;
  } catch (err) {
    console.warn('[TG] Browser bundle failed:', err.message);
    throw err;
  }
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
