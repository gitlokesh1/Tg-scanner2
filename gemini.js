/**
 * gemini.js — All Gemini 2.5 Flash API calls
 */

const GEMINI_MODELS = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_SCORE_TEXT_LENGTH = 200;  // max chars per message sent to Gemini for scoring

/**
 * POST a prompt to the Gemini API and return the response text.
 * Tries model names in order until one succeeds.
 *
 * @param {string} prompt
 * @param {string} geminiKey
 * @returns {Promise<string>}
 */
export async function callGemini(prompt, geminiKey) {
  if (!geminiKey) throw new Error('Gemini API key is not set');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  let lastError;
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      console.warn(`[Gemini] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Generate 15 Telegram group search keywords for a niche.
 *
 * @param {string} niche
 * @param {string} geminiKey
 * @returns {Promise<string[]>}
 */
export async function generateKeywords(niche, geminiKey) {
  const prompt = `
You are an expert Telegram group researcher.
Generate exactly 15 specific Telegram search keywords for finding active groups in this niche: "${niche}".
Focus on keywords that would be used in group names, descriptions, or topics for India/global markets.
Return ONLY a JSON array of strings, no explanation, no markdown.
Example: ["keyword1", "keyword2", ...]
`.trim();

  const text = await callGemini(prompt, geminiKey);
  const arr = extractJsonArray(text);
  if (!Array.isArray(arr)) throw new Error('Gemini returned invalid keyword list');
  return arr.slice(0, 15).map(String);
}

/**
 * Score a list of user messages to find HR/recruitment leads.
 *
 * @param {{username: string, text: string}[]} userMessages
 * @param {string} geminiKey
 * @returns {Promise<{username: string, category: string, score: number, reason: string}[]>}
 */
export async function scoreLeads(userMessages, geminiKey) {
  if (!userMessages.length) return [];

  // Chunk to avoid context limits
  const CHUNK = 80;
  const chunks = [];
  for (let i = 0; i < userMessages.length; i += CHUNK) {
    chunks.push(userMessages.slice(i, i + CHUNK));
  }

  const results = [];

  for (const chunk of chunks) {
    const messagesJson = JSON.stringify(
      chunk.map((m) => ({ username: m.username, text: m.text.slice(0, MAX_SCORE_TEXT_LENGTH) }))
    );

    const prompt = `
You are an expert iGaming and affiliate marketing HR recruiter for the Indian market.
Analyze these Telegram messages and identify potential leads (job seekers, freelancers, affiliates, developers).

Messages:
${messagesJson}

Score each unique username on a scale 0-100:
- 80-100: Actively looking for work, clear skills match (iGaming, affiliate, digital marketing, dev)
- 60-79: Potentially interested, relevant background
- 40-59: Tangential relevance
- 0-39: Not relevant

For each promising lead (score > 40), return:
- username: the @username
- category: one of "iGaming", "Affiliate", "Developer", "Digital Marketing", "Other"
- score: integer 0-100
- reason: one sentence why they are a lead

Return ONLY a JSON array, no markdown, no explanation.
Example: [{"username":"@user1","category":"iGaming","score":85,"reason":"Actively seeking affiliate manager role"}]
`.trim();

    try {
      const text = await callGemini(prompt, geminiKey);
      const arr = extractJsonArray(text);
      if (Array.isArray(arr)) {
        results.push(...arr);
      }
    } catch (err) {
      console.warn('[Gemini] scoreLeads chunk failed:', err.message);
    }
  }

  return results;
}

/**
 * Generate a personalized DM draft for a candidate.
 *
 * @param {string} baseTemplate
 * @param {{username: string, category: string, score: number, reason: string}} candidate
 * @param {string} geminiKey
 * @returns {Promise<string>}
 */
export async function generateDmDraft(baseTemplate, candidate, geminiKey) {
  const prompt = `
You are an expert HR recruiter in the iGaming and affiliate marketing industry.
Write a short, friendly, personalized Telegram DM to recruit this candidate.

Candidate:
- Username: ${candidate.username}
- Category: ${candidate.category}
- Score: ${candidate.score}/100
- Reason they are a lead: ${candidate.reason}

Base template (use as inspiration, personalize it):
${baseTemplate || 'Hi, I came across your profile and think you might be a great fit for an exciting opportunity.'}

Rules:
- Keep it under 150 words
- Sound human, not robotic
- Mention their specific background/skill
- End with a soft call to action
- Do NOT use emojis excessively
- Return ONLY the message text, no quotes, no explanation

Message:
`.trim();

  return callGemini(prompt, geminiKey);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Safely extract the first JSON array from Gemini response text.
 * Handles code fences and extra prose.
 */
function extractJsonArray(text) {
  // Remove markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in Gemini response');
  return JSON.parse(match[0]);
}
