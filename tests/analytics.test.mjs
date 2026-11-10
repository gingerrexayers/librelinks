import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../lib/analytics.js', import.meta.url),
  'utf8'
);
const { getTrackedReferrer } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);
const request = { headers: {} };

test('campaign sources override browser referrals and are normalized', () => {
  assert.equal(
    getTrackedReferrer(request, 'https://instagram.com/', 'band', ' TikTok '),
    'tiktok'
  );
  assert.equal(
    getTrackedReferrer(request, '', 'band', 'show-poster_11.12'),
    'show-poster_11.12'
  );
});

test('invalid campaign sources fall back to the normal referrer', () => {
  for (const value of [
    null,
    '',
    '   ',
    123,
    ['instagram'],
    '<script>',
    'x'.repeat(65),
  ]) {
    assert.equal(getTrackedReferrer(request, '', 'band', value), 'Direct');
  }
  assert.equal(
    getTrackedReferrer(
      request,
      'https://instagram.com/some-page',
      'band',
      '<invalid>'
    ),
    'instagram.com'
  );
});
