const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const ALLOWED_MOODS = new Set(['melancholic', 'joyful', 'mysterious', 'tense', 'romantic', 'nostalgic']);
const ALLOWED_GENRES = new Set(['thriller', 'romance', 'sci-fi', 'fantasy', 'horror', 'slice of life']);

function fallbackStory(mood = 'mysterious', genre = 'fantasy') {
  return {
    titles: [
      { title: `The ${mood} Echo`, tagline: `A ${genre} path opens where memory lingers.` },
      { title: 'Between Lanterns', tagline: `A heart-led ${genre} journey through uncertain light.` },
      { title: 'When Night Hums', tagline: 'A quiet choice changes everything before dawn.' },
    ],
    story: `At dusk, the town looked ordinary, but ordinary things had a way of shifting when someone listened closely enough.\n\nMara paused beneath the station clock, fingers wrapped around a paper note she did not remember writing. The ink was hers; the message was not: Follow the second song.\n\nA violin floated from an alley cafe, thin and bright as thread. She followed it through narrow streets where shop windows reflected a younger version of her, one who still believed every wrong turn could become a beginning.\n\nAt the riverwalk, a stranger waited beside a lantern boat. He held out a hand as if they had arranged this years ago. “You can keep what you know,” he said, “or trade it for what you need.”\n\nMara looked at the dark water. In its surface she saw her careful life: safe, polished, and quietly incomplete. Beyond the bridge, lights flickered like promises.\n\nShe stepped into the boat. It rocked once, then steadied. The city receded into a soft glow while the current carried her toward a horizon that smelled of rain and possibility.\n\nBy dawn, she understood the note was permission — to choose wonder while fear still whispered.`,
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/story', async (req, res) => {
  const mood = (req.body?.mood || '').toLowerCase().trim();
  const genre = (req.body?.genre || '').toLowerCase().trim();

  if (!ALLOWED_MOODS.has(mood) || !ALLOWED_GENRES.has(genre)) {
    return res.status(400).json({ error: 'Invalid mood or genre.' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.json(fallbackStory(mood, genre));
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
        messages: [{ role: 'user', content: `Write a ${mood} ${genre} short story of about 400 words. Return ONLY this exact JSON structure:\n{\n  "titles": [\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"}\n  ],\n  "story": "full story with paragraph breaks using \\n\\n"\n}` }],
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

    return res.json(parsed);
  } catch (error) {
    return res.json(fallbackStory(mood, genre));
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Story app listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, fallbackStory };
