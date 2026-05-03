const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const ALLOWED_MOODS = new Set(['melancholic', 'joyful', 'mysterious', 'tense', 'romantic', 'nostalgic']);
const ALLOWED_GENRES = new Set(['thriller', 'romance', 'sci-fi', 'fantasy', 'horror', 'slice of life']);
 codex/implement-short-story-generator-steps-dd268c
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindow = new Map();
 main

function fallbackStory(mood = 'mysterious', genre = 'fantasy') {
  return {
    titles: [
      { title: `The ${mood} Echo`, tagline: `A ${genre} path opens where memory lingers.` },
      { title: 'Between Lanterns', tagline: `A heart-led ${genre} journey through uncertain light.` },
      { title: 'When Night Hums', tagline: 'A quiet choice changes everything before dawn.' },
    ],
 codex/implement-short-story-generator-steps-dd268c
    story: `At dusk, the town looked ordinary, but ordinary things had a way of shifting when someone listened closely enough. The tram wires sang when wind crossed them, and the old stone clocktower made a sound like a tired bellows each time it struck the hour.\n\nMara paused beneath that clock, fingers wrapped around a paper note she did not remember writing. The ink was hers; the pressure of the pen was hers; even the slight rightward slant looked familiar. But the sentence was not: Follow the second song.\n\nShe almost laughed. She had made a life of not following strange instructions. Her apartment was tidy, her desk calendars color-coded, her choices so careful they could be filed. Yet as she folded the note, a violin phrase slipped out of an alley cafe nearby — bright, hesitant, unfinished — and something in her chest answered before her mind did.\n\nShe followed the music through streets lit by amber windows and rain-damp signs. In one bakery window she caught her reflection and, for a breath, saw herself at nineteen: impulsive, hopeful, convinced that one brave choice could reroute an entire life. The image vanished when a bus hissed past.\n\nAt the riverwalk, lantern boats bobbed against iron rings bolted into stone steps. A stranger stood beside one boat, coat dark with mist, hat brim low. He did not look surprised to see her.\n\n“You heard it,” he said.\n\n“I heard something.”\n\nHe held out a hand as if this had been arranged years ago. “You can keep what you know,” he said quietly, “or trade it for what you need.”\n\nThe river was black glass. In it Mara saw her current life: polished routines, dependable salary, messages answered on time, nights that ended exactly as expected. Safe. Respectable. Incomplete.\n\nAcross the water, the opposite bank looked like another country. Rooftops climbed in uneven rows. A night market shimmered with paper lights. Somewhere, percussion rose beneath the violin, that same unfinished melody now pulling toward resolution.\n\nMara stepped into the lantern boat. It rocked hard enough to make her catch her breath, then steadied as the stranger untied the rope. He did not board; he only pushed her out with one practiced motion, and the current took over.\n\nAs she drifted, the city she knew receded into a watercolor blur. The air changed first — metal and dust giving way to rain and citrus — and then the silence changed too. It no longer felt empty; it felt open.\n\nWhen she reached the far bank, children ran between market stalls carrying tiny paper crowns. A woman with silver hair handed Mara a warm cup of tea and called her by name without asking it. Musicians under a striped canopy were playing the melody she had followed all evening. This time, it arrived at its final note and stayed there, ringing.\n\nMara laughed then, not because anything was funny, but because her body finally understood what her mind had refused to admit: she had been lonely inside her certainty.\n\nBy dawn, with market lights fading and the first pale band of morning lifting over the river, she understood the note had never been a warning. It was permission — to become someone brave enough to choose wonder while fear still whispered, someone willing to be changed before she had proof she would survive the change.\n\nWhen she crossed back over the bridge hours later, the city looked the same. But she didn't. She still had deadlines and rent and messages waiting. She still had ordinary mornings ahead. Only now, tucked inside the routine, there was a second song she knew how to hear.`,

    story: `At dusk, the town looked ordinary, but ordinary things had a way of shifting when someone listened closely enough.\n\nMara paused beneath the station clock, fingers wrapped around a paper note she did not remember writing. The ink was hers; the message was not: Follow the second song.\n\nA violin floated from an alley cafe, thin and bright as thread. She followed it through narrow streets where shop windows reflected a younger version of her, one who still believed every wrong turn could become a beginning.\n\nAt the riverwalk, a stranger waited beside a lantern boat. He held out a hand as if they had arranged this years ago. “You can keep what you know,” he said, “or trade it for what you need.”\n\nMara looked at the dark water. In its surface she saw her careful life: safe, polished, and quietly incomplete. Beyond the bridge, lights flickered like promises.\n\nShe stepped into the boat. It rocked once, then steadied. The city receded into a soft glow while the current carried her toward a horizon that smelled of rain and possibility.\n\nBy dawn, she understood the note was permission — to choose wonder while fear still whispered.`,
 main
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

 codex/implement-short-story-generator-steps-dd268c
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

app.post('/api/story', async (req, res) => {
 main
  const mood = (req.body?.mood || '').toLowerCase().trim();
  const genre = (req.body?.genre || '').toLowerCase().trim();

  if (!ALLOWED_MOODS.has(mood) || !ALLOWED_GENRES.has(genre)) {
 codex/implement-short-story-generator-steps-dd268c
    return res.status(400).json({ error: 'Invalid mood or genre.', allowedMoods: [...ALLOWED_MOODS], allowedGenres: [...ALLOWED_GENRES] });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.json({ ...fallbackStory(mood, genre), source: 'fallback-no-key' });
   return res.status(400).json({ error: 'Invalid mood or genre.' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.json(fallbackStory(mood, genre));
 main
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
  codex/implement-short-story-generator-steps-dd268c
        messages: [{ role: 'user', content: `Write a ${mood} ${genre} short story of about 900 words. Return ONLY this exact JSON structure:\n{\n  "titles": [\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"}\n  ],\n  "story": "full story with paragraph breaks using \\n\\n"\n}` }],

        messages: [{ role: 'user', content: `Write a ${mood} ${genre} short story of about 400 words. Return ONLY this exact JSON structure:\n{\n  "titles": [\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"},\n    {"title": "...", "tagline": "compelling one-line hook"}\n  ],\n  "story": "full story with paragraph breaks using \\n\\n"\n}` }],
 main
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

codex/implement-short-story-generator-steps-dd268c
    return res.json({ ...parsed, source: 'anthropic' });
  } catch (error) {
    return res.json({ ...fallbackStory(mood, genre), source: 'fallback-error' });

    return res.json(parsed);
  } catch (error) {
    return res.json(fallbackStory(mood, genre));
 main
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Story app listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, fallbackStory };
