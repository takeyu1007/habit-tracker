import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, migrate, emptyData, STORAGE_KEY, BACKUP_KEY_PREFIX, SCHEMA_VERSION } from '../src/storage.js';
import { createStore } from '../src/store.js';
import { MemoryStorage } from './helpers.js';

// ---- storage ----

test('load: 未保存なら空データ', () => {
  const { data, recoveredBackupKey } = load(new MemoryStorage());
  assert.deepEqual(data, emptyData());
  assert.equal(recoveredBackupKey, null);
});

test('save → load の往復', () => {
  const storage = new MemoryStorage();
  const store = createStore(storage);
  store.addHabit({ title: '間食', icon: '🍩', startedAt: '2026-10-01T00:00:00.000Z' });
  const { data } = load(storage);
  assert.equal(data.habits.length, 1);
  assert.equal(data.habits[0].title, '間食');
});

test('load: 壊れた JSON は退避してから初期化（データを捨てない）', () => {
  const storage = new MemoryStorage({ [STORAGE_KEY]: '{broken' });
  const { data, recoveredBackupKey } = load(storage);
  assert.equal(data.habits.length, 0);
  assert.ok(recoveredBackupKey?.startsWith(BACKUP_KEY_PREFIX));
  assert.equal(storage.getItem(recoveredBackupKey), '{broken');
});

test('load: 未来バージョンのデータも退避する', () => {
  const raw = JSON.stringify({ version: SCHEMA_VERSION + 1, habits: [] });
  const storage = new MemoryStorage({ [STORAGE_KEY]: raw });
  const { recoveredBackupKey } = load(storage);
  assert.equal(storage.getItem(recoveredBackupKey), raw);
});

test('migrate: 欠損フィールドを既定値で補完し、不正な習慣は除外', () => {
  const data = migrate({
    version: 1,
    habits: [
      { id: 'a', title: 'SNS' },
      { title: 'id なし' },
      null,
    ],
  });
  assert.equal(data.habits.length, 1);
  const h = data.habits[0];
  assert.equal(h.costPerPeriod, 0);
  assert.equal(h.costPeriodUnit, 'day');
  assert.deepEqual(h.reasons, []);
  assert.deepEqual(h.tags, []);
  assert.deepEqual(h.milestones, [1, 3, 7, 14, 30, 90, 180, 365]);
  assert.deepEqual(data.resetLogs, []);
});

test('migrate: v1 から v2 へのマイグレーション', () => {
  const v1Data = {
    version: 1,
    habits: [{ id: 'h1', title: 'タバコ', icon: '🚬', startedAt: '2026-10-01T00:00:00.000Z' }],
    resetLogs: [{ id: 'r1', habitId: 'h1', startedAt: '2026-10-01T00:00:00.000Z', resetAt: '2026-10-02T00:00:00.000Z' }],
    rewards: [],
  };
  const migrated = migrate(v1Data);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.habits[0].tags, []);
  assert.deepEqual(migrated.resetLogs[0].triggerTags, []);
});

test('save: 書き込み失敗時は false', () => {
  const storage = new MemoryStorage();
  storage.failWrites = true;
  assert.equal(save(storage, migrate({ version: 2 })), false);
});

// ---- store ----

const T0 = new Date('2026-10-01T00:00:00.000Z');
const hoursLater = (h) => new Date(T0.getTime() + h * 3600_000);

test('addHabit: SPEC の全フィールドを既定値付きで保存', () => {
  const store = createStore(new MemoryStorage(), { now: () => T0 });
  const h = store.addHabit({ title: '  エナドリ  ', icon: '⚡', startedAt: T0.toISOString() });
  assert.equal(h.title, 'エナドリ');
  assert.equal(h.createdAt, T0.toISOString());
  assert.deepEqual(Object.keys(h).sort(), [
    'costPerPeriod', 'costPeriodUnit', 'createdAt', 'icon', 'id', 'milestones',
    'reasons', 'startedAt', 'tags', 'targetDays', 'timeSpentMinutesPerDay', 'title',
  ]);
});

test('resetHabit: ログを記録し、再発日時が新しい開始日時になる', () => {
  let current = T0;
  const store = createStore(new MemoryStorage(), { now: () => current });
  const h = store.addHabit({ title: '間食', icon: '🍩', startedAt: T0.toISOString() });
  store.updateHabit(h.id, {}); // 何も変えない更新でも壊れない

  current = hoursLater(48);
  const log = store.resetHabit(h.id, { note: ' 疲れていた ' });

  assert.ok(log);
  assert.equal(log.durationSeconds, 48 * 3600);
  assert.equal(log.startedAt, T0.toISOString());
  assert.equal(log.resetAt, current.toISOString());
  assert.equal(log.reasonNote, '疲れていた');
  assert.equal(store.getHabit(h.id)?.startedAt, current.toISOString());
  assert.equal(store.getState().resetLogs.length, 1);
});

test('resetHabit: 再発日時は「開始〜現在」に収める', () => {
  let current = hoursLater(10);
  const store = createStore(new MemoryStorage(), { now: () => current });
  const h = store.addHabit({ title: 'SNS', icon: '📱', startedAt: T0.toISOString() });

  const past = store.resetHabit(h.id, { resetAt: new Date(T0.getTime() - 3600_000) });
  assert.equal(past?.durationSeconds, 0); // 開始より前 → 開始時刻に補正

  const future = store.resetHabit(h.id, { resetAt: hoursLater(99) });
  assert.equal(future?.resetAt, current.toISOString()); // 未来 → 現在に補正
});

test('resetHabit: 節約額を記録する', () => {
  let current = T0;
  const store = createStore(new MemoryStorage(), { now: () => current });
  const h = store.addHabit({ title: 'タバコ', icon: '🚬', startedAt: T0.toISOString() });
  // フェーズ1の UI からは設定しないが、データとしては計算されること
  store.getState().habits[0].costPerPeriod = 600;
  current = hoursLater(72);
  assert.equal(store.resetHabit(h.id)?.savedAmount, 1800);
});

test('deleteHabit: 関連する履歴も削除', () => {
  let current = T0;
  const store = createStore(new MemoryStorage(), { now: () => current });
  const a = store.addHabit({ title: 'A', icon: '🅰️', startedAt: T0.toISOString() });
  const b = store.addHabit({ title: 'B', icon: '🅱️', startedAt: T0.toISOString() });
  current = hoursLater(1);
  store.resetHabit(a.id);
  store.resetHabit(b.id);
  store.deleteHabit(a.id);
  assert.deepEqual(store.getState().habits.map((h) => h.title), ['B']);
  assert.deepEqual(store.getState().resetLogs.map((l) => l.habitId), [b.id]);
});

test('subscribe / onSaveError', () => {
  const storage = new MemoryStorage();
  const store = createStore(storage, { now: () => T0 });
  let notified = 0;
  let errors = 0;
  const unsubscribe = store.subscribe(() => notified++);
  store.onSaveError(() => errors++);

  store.addHabit({ title: 'X', icon: '❌', startedAt: T0.toISOString() });
  storage.failWrites = true;
  store.addHabit({ title: 'Y', icon: '❌', startedAt: T0.toISOString() });
  unsubscribe();
  store.addHabit({ title: 'Z', icon: '❌', startedAt: T0.toISOString() });

  assert.equal(notified, 2);
  assert.equal(errors, 2);
  assert.equal(store.getState().habits.length, 3); // 保存失敗でもメモリ上は保持
});

test('customTags: 追加と削除の重複防止・空白トリム', () => {
  const store = createStore(new MemoryStorage(), { now: () => T0 });
  assert.equal(store.addCustomTag('  夜更かし  '), true);
  assert.equal(store.addCustomTag('夜更かし'), false); // 重複
  assert.equal(store.addCustomTag(''), false); // 空白
  assert.deepEqual(store.getState().customTags, ['夜更かし']);

  assert.equal(store.deleteCustomTag('夜更かし'), true);
  assert.equal(store.deleteCustomTag('存在しない'), false);
  assert.deepEqual(store.getState().customTags, []);
});

test('defaultMilestones: 正の整数でソート・重複除外して更新', () => {
  const store = createStore(new MemoryStorage(), { now: () => T0 });
  assert.equal(store.setDefaultMilestones([7, 1, 30, 7, -5, 0, 14]), true);
  assert.deepEqual(store.getState().defaultMilestones, [1, 7, 14, 30]);
  assert.equal(store.setDefaultMilestones([]), false); // 空配列は拒否
});

test('importData: 有効な JSON で置換、無効なら拒否', () => {
  const store = createStore(new MemoryStorage(), { now: () => T0 });
  store.addHabit({ title: '旧データ', icon: '🗑️', startedAt: T0.toISOString() });

  const invalid = store.importData('{bad json');
  assert.equal(invalid, false);
  assert.equal(store.getState().habits.length, 1);

  const validJson = JSON.stringify({
    version: 2,
    habits: [{ id: 'new-1', title: '新習慣', icon: '✨', startedAt: T0.toISOString() }],
    customTags: ['自作タグ'],
    defaultMilestones: [3, 10],
  });
  const valid = store.importData(validJson);
  assert.equal(valid, true);
  assert.equal(store.getState().habits[0].title, '新習慣');
  assert.deepEqual(store.getState().customTags, ['自作タグ']);
  assert.deepEqual(store.getState().defaultMilestones, [3, 10]);
});

test('resetAll: 全データを空状態に戻す', () => {
  const store = createStore(new MemoryStorage(), { now: () => T0 });
  store.addHabit({ title: '習慣', icon: '🌟', startedAt: T0.toISOString() });
  store.addCustomTag('タグ');
  store.resetAll();
  assert.equal(store.getState().habits.length, 0);
  assert.equal(store.getState().customTags.length, 0);
});
