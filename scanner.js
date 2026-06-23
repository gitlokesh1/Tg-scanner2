/**
 * scanner.js — Telegram group search and message scan logic
 */

const SEARCH_DELAY_MS = 700;     // between keyword searches
const SCAN_DELAY_MS = 600;       // between group scans
const MSG_LIMIT = 40;            // messages per group
const MAX_MESSAGE_LENGTH = 240;  // max characters stored per message

/**
 * Search Telegram groups for each keyword and return a deduplicated list.
 *
 * @param {string[]} keywords
 * @param {object} client         — connected TelegramClient
 * @param {object} Api            — GramJS Api namespace
 * @param {function(done, total, keyword): void} onProgress
 * @returns {Promise<{title, username, members, selected: true}[]>}
 */
export async function searchGroups(keywords, client, Api, onProgress) {
  const seen = new Set();
  const groups = [];
  const total = keywords.length;

  for (let i = 0; i < total; i++) {
    const keyword = keywords[i];
    onProgress(i, total, keyword);

    try {
      const result = await client.invoke(
        new Api.contacts.Search({ q: keyword, limit: 50 })
      );

      for (const chat of result.chats || []) {
        // Only include public groups (not broadcast channels) with a username
        if (
          chat.broadcast ||
          !chat.username ||
          seen.has(chat.username.toLowerCase())
        ) {
          continue;
        }

        seen.add(chat.username.toLowerCase());
        groups.push({
          title: chat.title || chat.username,
          username: chat.username,
          members: chat.participantsCount || 0,
          selected: true,
        });
      }
    } catch (err) {
      console.warn('[Scanner] searchGroups keyword failed:', keyword, err.message);
    }

    onProgress(i + 1, total, keyword);

    if (i < total - 1) {
      await _sleep(SEARCH_DELAY_MS);
    }
  }

  // Sort by member count descending
  groups.sort((a, b) => b.members - a.members);
  return groups;
}

/**
 * Fetch recent messages from each selected group and collect user messages.
 *
 * @param {{title, username, members, selected}[]} selectedGroups
 * @param {object} client         — connected TelegramClient
 * @param {function(done, total, groupName): void} onProgress
 * @returns {Promise<{username: string, text: string}[]>}
 */
export async function scanGroups(selectedGroups, client, onProgress) {
  const messages = [];
  const total = selectedGroups.length;

  for (let i = 0; i < total; i++) {
    const group = selectedGroups[i];
    onProgress(i, total, group.title || group.username);

    try {
      const history = await client.getMessages(group.username, {
        limit: MSG_LIMIT,
      });

      for (const msg of history) {
        // Only user messages with text (not bots, not empty)
        if (
          !msg.message ||
          !msg.senderId ||
          msg.post ||
          !msg.peerId
        ) {
          continue;
        }

        // Try to get sender username
        let senderUsername = '';
        try {
          const sender = await client.getEntity(msg.senderId);
          senderUsername = sender.username ? `@${sender.username}` : '';
          if (!senderUsername && sender.bot) continue; // skip bots without username
        } catch (_) {
          continue; // skip if we can't resolve sender
        }

        if (!senderUsername) continue;

        messages.push({
          username: senderUsername,
          text: msg.message.slice(0, MAX_MESSAGE_LENGTH),
        });
      }
    } catch (err) {
      console.warn('[Scanner] scanGroups group failed:', group.username, err.message);
    }

    onProgress(i + 1, total, group.title || group.username);

    if (i < total - 1) {
      await _sleep(SCAN_DELAY_MS);
    }
  }

  // Deduplicate by username (keep latest message)
  const unique = new Map();
  for (const m of messages) {
    unique.set(m.username, m);
  }

  return [...unique.values()];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
