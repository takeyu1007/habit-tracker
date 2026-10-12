import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatDurationShort, fromLocalInputValue, toLocalInputValue } from '../src/format.js';

test('datetime-local 値の往復（ローカル時刻）', () => {
  const d = new Date(2026, 9, 1, 8, 5); // 2026-10-01 08:05 local
  assert.equal(toLocalInputValue(d), '2026-10-01T08:05');
  assert.equal(fromLocalInputValue('2026-10-01T08:05')?.getTime(), d.getTime());
  // 秒付きの値も受け付ける
  assert.equal(fromLocalInputValue('2026-10-01T08:05:30')?.getTime(), d.getTime());
});

test('fromLocalInputValue: 不正値は null', () => {
  assert.equal(fromLocalInputValue(''), null);
  assert.equal(fromLocalInputValue('2026/10/01 08:00'), null);
});

test('formatDurationShort', () => {
  assert.equal(formatDurationShort(0), '0分');
  assert.equal(formatDurationShort(3 * 3600 + 120), '3時間 2分');
  assert.equal(formatDurationShort(12 * 86400 + 4 * 3600 + 18 * 60), '12日 4時間 18分');
});

test('escapeHtml', () => {
  assert.equal(escapeHtml(`<img src=x onerror="a">&'`), '&#60;img src=x onerror=&#34;a&#34;&#62;&#38;&#39;');
  assert.equal(escapeHtml('間食 🍩'), '間食 🍩');
});
