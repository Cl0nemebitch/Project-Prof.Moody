const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /api/story rejects invalid mood/genre', async () => {
  const res = await request(app).post('/api/story').send({ mood: 'bad', genre: 'bad' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid mood or genre.');
});

test('POST /api/story returns fallback payload when no API key configured', async () => {
  const res = await request(app).post('/api/story').send({ mood: 'joyful', genre: 'fantasy' });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.titles));
  assert.ok(typeof res.body.story === 'string' && res.body.story.length > 0);
 codex/implement-short-story-generator-steps-dd268c
  assert.equal(res.body.source, 'fallback-no-key');
});

test('POST /api/story rate limits after burst traffic', async () => {
  for (let i = 0; i < 30; i += 1) {
    const res = await request(app).post('/api/story').send({ mood: 'joyful', genre: 'fantasy' });
    assert.equal(res.status, 200);
  }
  const limited = await request(app).post('/api/story').send({ mood: 'joyful', genre: 'fantasy' });
  assert.equal(limited.status, 429);
 main
});
