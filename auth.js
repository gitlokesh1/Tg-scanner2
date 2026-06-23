/**
 * auth.js — Telegram login state machine
 *
 * Steps: phone → sending → otp → verifying → password → done | error
 *
 * Usage:
 * beginLogin(phone, gramLib, onStateChange)
 * submitOtp(code)        — call when user submits OTP
 * submitPassword(pass)   — call when user submits 2FA password
 */

const API_ID = 39942557;
const API_HASH = '77a67551c7f83be89c33da3a95eefea0';

const STORAGE_KEYS = {
  accounts: 'tg_scanner2_accounts_v1',
  activePhone: 'tg_scanner2_active_phone_v1',
};

// Holds resolvers for the current active login flow
let _currentAuth = null;

export async function beginLogin(phone, gramLib, onStateChange) {
  if (!phone || !phone.startsWith('+')) {
    onStateChange({ step: 'error', message: 'Phone number must start with + (e.g. +917890123456)' });
    return;
  }

  const { TelegramClient, StringSession } = gramLib;
  const auth = { resolveOtp: null, resolvePassword: null };
  _currentAuth = auth;

  // ── DUAL SESSION LOGIC ────────────────────────────────────────────────
  // Check karein ki kya is phone number ka session pehle se saved hai
  const accounts = _loadAccounts();
  const existingSessionStr = accounts[phone] ? accounts[phone].session : '';
  
  // Agar account pehle se logged in hai toh purana session load hoga,
  // warna naye login ke liye empty string load hoga.
  const session = new StringSession(existingSessionStr);

  // ── MAGIC FIX FOR CDN ERROR ───────────────────────────────────────────
  // GramJS check karta hai session.constructor.name === 'StringSession'
  // Minified files mein naam change ho jata hai isliye error aata hai.
  // Hum forcefully bypass kar rahe hain:
  Object.defineProperty(session, 'constructor', { 
    value: { name: 'StringSession' },
    writable: true,
    enumerable: false
  });

  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  try { client.setLogLevel('none'); } catch (_) {}

  onStateChange({ step: 'sending', message: 'Connecting to Telegram…' });

  try {
    await client.connect();

    // Agar hum switch kar rahe hain (existing session load hua hai) aur hum
    // already authorized hain, toh OTP/Password flow skip ho jayega!
    const isAuthorized = await client.checkAuthorization();
    
    if (!isAuthorized) {
        await client.start({
          phoneNumber: async () => phone,
          phoneCode: async () => {
            onStateChange({ step: 'otp', message: 'OTP sent! Check your Telegram app or SMS.' });
            return new Promise((resolve) => { auth.resolveOtp = resolve; });
          },
          password: async () => {
            onStateChange({ step: 'password', message: '2FA enabled. Enter your cloud password.' });
            return new Promise((resolve) => { auth.resolvePassword = resolve; });
          },
          onError: (err) => {
            onStateChange({ step: 'error', message: err.message || 'Login failed' });
          },
        });
    }

    // ── Login ya Switch successful ─────────────────────────────────────────
    const sessionStr = client.session.save();

    let name = phone;
    let username = '';
    let initials = phone.slice(-2).toUpperCase();

    try {
      const me = await client.getMe();
      name = [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || phone;
      username = me.username || '';
      initials =
        ((me.firstName?.[0] || '') + (me.lastName?.[0] || '')).toUpperCase() ||
        phone.slice(-2).toUpperCase();
    } catch (_) {}

    // Persist to localStorage (Save multiple accounts)
    const updatedAccounts = _loadAccounts();
    updatedAccounts[phone] = { phone, name, username, initials, session: sessionStr };
    _saveAccounts(updatedAccounts);
    localStorage.setItem(STORAGE_KEYS.activePhone, phone);

    onStateChange({
      step: 'done',
      message: `Welcome, ${name}!`,
      client,
      phone,
      name,
      username,
      initials,
      session: sessionStr,
    });
  } catch (err) {
    _currentAuth = null;
    onStateChange({ step: 'error', message: err.message || 'Login failed' });
  }
}

export function submitOtp(code) {
  if (_currentAuth?.resolveOtp) {
    _currentAuth.resolveOtp(code);
    _currentAuth.resolveOtp = null;
  }
}

export function submitPassword(password) {
  if (_currentAuth?.resolvePassword) {
    _currentAuth.resolvePassword(password);
    _currentAuth.resolvePassword = null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) || '{}');
  } catch (_) {
    return {};
  }
}

function _saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
}
