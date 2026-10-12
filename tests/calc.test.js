import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elapsedSeconds, splitDuration, dailyCost, savedMoney, savedMinutes } from '../src/calc.js';

const START = '2026-10-01T00:00:00.000Z';
const startMs = Date.parse(START);

test('elapsedSeconds: 基本', () => {
  assert.equal(elapsedSeconds(START, startMs), 0);
  assert.equal(elapsedSeconds(START, startMs + 1500), 1); // 切り捨て
  assert.equal(elapsedSeconds(START, startMs + 86400_000), 86400);
});

test('elapsedSeconds: 未来日時・不正値は 0', () => {
  assert.equal(elapsedSeconds(START, startMs - 10_000), 0);
  assert.equal(elapsedSeconds('not-a-date', startMs), 0);
});

test('elapsedSeconds: タイムゾーン付き ISO も同一時刻として扱う', () => {
  assert.equal(elapsedSeconds('2026-10-01T09:00:00+09:00', startMs + 60_000), 60);
});

test('splitDuration: 日跨ぎ・境界値', () => {
  assert.deepEqual(splitDuration(0), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(splitDuration(59), { days: 0, hours: 0, minutes: 0, seconds: 59 });
  assert.deepEqual(splitDuration(86399), { days: 0, hours: 23, minutes: 59, seconds: 59 });
  assert.deepEqual(splitDuration(86400), { days: 1, hours: 0, minutes: 0, seconds: 0 });
  // SPEC 例: 12日 04時間 18分 22秒
  assert.deepEqual(splitDuration(12 * 86400 + 4 * 3600 + 18 * 60 + 22), {
    days: 12, hours: 4, minutes: 18, seconds: 22,
  });
  assert.deepEqual(splitDuration(-5), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('dailyCost: 周期ごとの換算', () => {
  assert.equal(dailyCost(700, 'day'), 700);
  assert.equal(dailyCost(700, 'week'), 100);
  assert.equal(dailyCost(30437.5, 'month'), 1000);
  assert.equal(dailyCost(-100, 'day'), 0);
  assert.equal(dailyCost(Number.NaN, 'day'), 0);
});

test('savedMoney / savedMinutes', () => {
  assert.equal(savedMoney(86400 * 3, 500, 'day'), 1500);
  assert.equal(savedMoney(43200, 1000, 'day'), 500); // 半日
  assert.equal(savedMoney(-1, 1000, 'day'), 0);
  assert.equal(savedMinutes(86400 * 2, 90), 180);
  assert.equal(savedMinutes(86400, Number.NaN), 0);
});
