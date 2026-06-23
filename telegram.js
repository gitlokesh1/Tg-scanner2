/**
 * telegram.js — GramJS CDN loader with multi-CDN fallback
 * Tries each source in order; resolves on first success.
 */

const CDN_CANDIDATES = [
  {
    type: 'esm',
    url: 'https://esm.sh/telegram@2.26.22',
  },
  {
    type: 'esm',
    url: 'https://cdn.jsdelivr.net/npm/telegram@2.26.22/+esm',
  },
  {
    type: 'script',
    url: 'https://unpkg.com/telegram@2.26.22/dist/browser/index.js',
    globalKey: 'TelegramLib',
  },
];

/** Load a <script> tag and wait for window[globalKey] to be set */
function loadFromScript(url, globalKey) {
  return new Promise((resolve, reject) => {
    // Remove any previous failed script with same src
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.src = url;
    s.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      s.remove();
      reject(new Error(`Timeout loading script: ${url}`));
    }, 30000);

    s.onload = () => {
      clearTimeout(timer);
      if (window[globalKey]) {
        resolve(window[globalKey]);
      } else {
        reject(new Error(`${globalKey} not found on window after script load`));
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

/** Dynamic ESM import */
async function loadFromESM(url) {
  return import(/* @vite-ignore */ url);
}

/**
 * Given a raw module object, extract { TelegramClient, Api, StringSession }.
 * Handles multiple export shapes produced by different CDNs.
 */
function extractLib(mod) {
  // Flatten default export if present
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
  if (!StringSession) throw new Error('StringSession not found in module');

  return { TelegramClient, Api, StringSession };
}

/**
 * Try every CDN candidate in order; return first successful lib object.
 * @returns {Promise<{TelegramClient, Api, StringSession}>}
 */
export async function loadGramJS() {
  const errors = [];

  for (const candidate of CDN_CANDIDATES) {
    try {
      let mod;
      if (candidate.type === 'script') {
        mod = await loadFromScript(candidate.url, candidate.globalKey);
      } else {
        mod = await loadFromESM(candidate.url);
      }
      const lib = extractLib(mod);
      console.info('[TG] GramJS loaded from', candidate.url);
      return lib;
    } catch (err) {
      console.warn('[TG] CDN failed:', candidate.url, '—', err.message);
      errors.push(`${candidate.url}: ${err.message}`);
    }
  }

  throw new Error(
    'All GramJS CDN sources failed.\n' + errors.join('\n')
  );
}

// Cached promise — only loads once
let _gramPromise = null;

/**
 * Returns a cached promise that resolves to the GramJS lib.
 * Safe to call multiple times.
 * @returns {Promise<{TelegramClient, Api, StringSession}>}
 */
export function ensureGramReady() {
  if (!_gramPromise) {
    _gramPromise = loadGramJS().catch((err) => {
      // Reset so the caller can retry
      _gramPromise = null;
      throw err;
    });
  }
  return _gramPromise;
}
