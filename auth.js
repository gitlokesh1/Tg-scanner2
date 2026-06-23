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

/**
 * Start the Telegram login flow.
 *
 * @param {string} phone              — E.164 phone number e.g. "+917890123456"
 * @param {{TelegramClient, Api, StringSession}} gramLib  — loaded GramJS lib
 * @param {function(authState): void} onStateChange       — called on each step change
 */
export async function beginLogin(phone, gramLib, onStateChange) {
  // Validate phone
  if (!phone || !phone.startsWith('+')) {
    onStateChange({ step: 'error', message: 'Phone number must start with + (e.g. +917890123456)' });
    return;
  }

  // Sirf TelegramClient chahiye, StringSession ki zarurat nahi hai ab
  const { TelegramClient } = gramLib;

  // Create a fresh auth context
  const auth = { resolveOtp: null, resolvePassword: null };
  _currentAuth = auth;

  // ── FIX APPLIED HERE ──────────────────────────────────────────────────
  // Hum session parameter mein seedha ek empty string ('') pass kar rahe hain.
  // GramJS isko khud automatically StringSession mein convert kar lega.
  const client = new TelegramClient('', API_ID, API_HASH, {
    connectionRetries: 5,
  });

  // Silence all GramJS internal logs
  try { client.setLogLevel('none'); } catch (_) {}

  onStateChange({ step: 'sending', message: 'Connecting to Telegram…' });

  try {
    await client.connect();

    await client.start({
      phoneNumber: async () => phone,

      phoneCode: async () => {
        onStateChange({ step: 'otp', message: 'OTP sent! Check your Telegram app or SMS.' });
        // Wait for submitOtp() to be called
        return new Promise((resolve) => {
          auth.resolveOtp = resolve;
        });
      },

      password: async () => {
        onStateChange({ step: 'password', message: '2FA enabled. Enter your cloud password.' });
        // Wait for submitPassword() to be called
        return new Promise((resolve) => {
          auth.resolvePassword = resolve;
        });
      },

      onError: (err) => {
        onStateChange({ step: 'error', message: err.message || 'Login failed' });
      },
    });

    // ── Login successful ──────────────────────────────────────────────────
    const sessionStr = client.session.save();

    // Fetch user info
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
    } catch (_) {
      // Non-fatal; use defaults
    }

    // Persist to localStorage
    const accounts = _loadAccounts();
    accounts[phone] = { phone, name, username, initials, session: sessionStr };
    _saveAccounts(accounts);
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

/**
 * Resolve the pending OTP promise.
 * @param {string} code
 */
export function submitOtp(code) {
  if (_currentAuth?.resolveOtp) {
    _currentAuth.resolveOtp(code);
    _currentAuth.resolveOtp = null;
  }
}

/**
 * Resolve the pending 2FA password promise.
 * @param {string} password
 */
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
