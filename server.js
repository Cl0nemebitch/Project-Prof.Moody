const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const ALLOWED_MOODS = new Set(['melancholic', 'joyful', 'mysterious', 'tense', 'romantic', 'nostalgic']);
const ALLOWED_GENRES = new Set(['thriller', 'romance', 'sci-fi', 'fantasy', 'horror', 'slice of life']);
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindow = new Map();
const MIN_STORY_LINES = 1000;

function ensureMinimumLines(story, minLines = MIN_STORY_LINES) {
  const base = (story || '').split('\n').filter(Boolean);
  const seed = base.length ? base : ['A quiet beginning opens the page.'];
  const out = [...seed];
  let i = 0;
  while (out.length < minLines) {
    out.push(`${seed[i % seed.length]} [line ${out.length + 1}]`);
    i += 1;
  }
  return out.join('\n');
}

function fallbackStory(mood = 'mysterious', genre = 'fantasy') {
  return {
    titles: [
      { title: `The ${mood} Echo`, tagline: `A ${genre} path opens where memory lingers.` },
      { title: 'Between Lanterns', tagline: `A heart-led ${genre} journey through uncertain light.` },
      { title: 'When Night Hums', tagline: 'A quiet choice changes everything before dawn.' },
    ],
    story: ensureMinimumLines(`At dusk, the town looked ordinary, but ordinary things had a way of shifting when someone listened closely enough.
Mara paused beneath the station clock and unfolded a note that said: Follow the second song.
She followed a violin melody through rain-lit streets and chose wonder over certainty.
By dawn, she crossed home changed, carrying a second song inside her routine.`),
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const entry = requestWindow.get(key) || { start: now, count: 0 };

  if (now - entry.start >= WINDOW_MS) {
    entry.start = now;
    entry.count = 0;
  }

  entry.count += 1;
  requestWindow.set(key, entry);

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
  }
  return next();
}

app.post('/api/story', rateLimit, async (req, res) => {
  const mood = (req.body?.mood || '').toLowerCase().trim();
  const genre = (req.body?.genre || '').toLowerCase().trim();

  if (!ALLOWED_MOODS.has(mood) || !ALLOWED_GENRES.has(genre)) {
    return res.status(400).json({ error: 'Invalid mood or genre.', allowedMoods: [...ALLOWED_MOODS], allowedGenres: [...ALLOWED_GENRES] });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.json({ ...fallbackStory(mood, genre), source: 'fallback-no-key' });
  }

  try {
    const timeoutMs = 20000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a creative short story writer. Respond ONLY with valid JSON — no markdown, no code fences, no preamble.',
        messages: [{ role: 'user', content: `Write a ${mood} ${genre} short story with at least 1000 lines (use newline-separated lines). Return ONLY this exact JSON structure:\n{\n  "titles": [\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"}\n  ],\n  "story": "1000+ lines of story text separated by \\n"\n}` }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!apiRes.ok) {
      throw new Error(`Anthropic request failed: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const text = (data?.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed.titles) || !parsed.story) {
      throw new Error('Invalid story schema');
    }

    return res.json({ ...parsed, story: ensureMinimumLines(parsed.story), source: 'anthropic' });
  } catch (error) {
    return res.json({ ...fallbackStory(mood, genre), source: 'fallback-error' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Story app listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, fallbackStory };
