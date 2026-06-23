# TG Scanner v2

Browser-only Telegram HR Outreach Tool. No server. No installation. No npm.

## Features

- **Multi-account Telegram login** — phone → OTP → optional 2FA
- **AI keyword generation** — Gemini 2.5 Flash generates 15 targeted search keywords
- **Telegram group search** — searches public groups for each keyword via GramJS
- **Auto-scan groups** — fetches recent messages, extracts unique senders
- **AI lead scoring** — Gemini scores each profile 0–100 (iGaming / affiliate market India)
- **Personalized DM generation** — AI-crafted outreach messages per candidate
- **One-click send** — sends DM directly via Telegram from the browser
- **Session persistence** — all accounts and sessions saved in `localStorage`

## How to Use

1. Open `index.html` in any modern browser (Chrome/Firefox/Edge)
2. Click the **⋮ menu** → paste your **Gemini API key** → Save
3. Click **Add Account** → enter phone number → enter OTP → done
4. Go to **Search** → enter your niche → click **AI Keywords** (optional)
5. Click **Find Groups** to search Telegram
6. Select groups → click **Scan Leads**
7. Click **Send DM** on any high-scoring candidate

## Project Structure

```
Tg-scanner2/
├── index.html     ← Single-page app (all UI, dark theme)
├── app.js         ← State management, boot sequence, event binding
├── telegram.js    ← GramJS CDN loader (3 fallback sources)
├── auth.js        ← Login state machine (phone → OTP → 2FA)
├── scanner.js     ← Group search + message scan
├── gemini.js      ← Gemini AI API calls (keywords, scoring, DM draft)
├── ui.js          ← All DOM render functions
└── README.md
```

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Pure HTML + Vanilla JS | No frameworks, no build step |
| [Tailwind CSS CDN](https://cdn.tailwindcss.com) | Styling |
| [Font Awesome 6.5](https://fontawesome.com) | Icons |
| [GramJS 2.26.22](https://gram.js.org) | Telegram MTProto client (browser build) |
| [Gemini 2.5 Flash API](https://aistudio.google.com) | AI features |
| `localStorage` | Session/account persistence (no backend) |

## GramJS CDN Fallbacks

Loaded in order; first successful source wins:
1. `https://esm.sh/telegram@2.26.22` (ESM)
2. `https://cdn.jsdelivr.net/npm/telegram@2.26.22/+esm` (ESM)
3. `https://unpkg.com/telegram@2.26.22/dist/browser/index.js` (UMD script)

## API Credentials

Telegram API ID and Hash are embedded in `app.js` and `auth.js`.
These are **app-level credentials**, not user credentials — they identify the
app to Telegram, similar to OAuth client IDs.

The Gemini API key is **never embedded** — paste it in the ⋮ menu and it is
stored only in your browser's `localStorage`.

## Privacy & Security

- All Telegram sessions are stored locally in your browser's `localStorage`
- No data is sent to any third-party server except Telegram and Google Gemini
- No backend, no tracking, no analytics

## Requirements

- A modern browser with ES module support (Chrome 80+, Firefox 75+, Edge 80+)
- Internet connection (to load CDN assets and connect to Telegram)
- A valid Telegram account
- A Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com/app/apikey))
