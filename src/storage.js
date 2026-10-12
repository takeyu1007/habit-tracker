// @ts-check
/**
 * localStorage への保存・読み込み・スキーマ移行。
 *
 * ルール:
 * - 保存形式を変えたら SCHEMA_VERSION を上げ、migrate() に「旧 → 新」の変換を追加する。
 * - 読み込めないデータは絶対に黙って捨てない。退避キーに生データを保存してから初期化する。
 */

import { DEFAULT_MILESTONES } from './model.js';

export const STORAGE_KEY = 'habitTracker.data';
export const BACKUP_KEY_PREFIX = 'habitTracker.backup.';
export const SCHEMA_VERSION = 2;

/**
 * テスト時に差し替えられるよう、Storage 互換の最小インターフェースで扱う。
 * @typedef {Pick<Storage, 'getItem' | 'setItem'>} StorageLike
 */

/** @returns {import('./model.js').AppData} */
export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    habits: [],
    resetLogs: [],
    rewards: [],
    customTags: [],
    defaultMilestones: [...DEFAULT_MILESTONES],
  };
}

/**
 * 生データ退避（データ消失防止）。
 * @param {StorageLike} storage
 * @param {string} raw
 * @param {Date} [now]
 * @returns {string} 退避先キー
 */
function backupRaw(storage, raw, now = new Date()) {
  const key = `${BACKUP_KEY_PREFIX}${now.toISOString()}`;
  try {
    storage.setItem(key, raw);
  } catch {
    // 容量不足などで退避できない場合も、起動は継続させる
  }
  return key;
}

/**
 * @param {any} h
 * @returns {import('./model.js').Habit | null}
 */
function normalizeHabit(h) {
  if (!h || typeof h !== 'object' || typeof h.id !== 'string' || typeof h.title !== 'string') {
    return null;
  }
  const unit = ['day', 'week', 'month'].includes(h.costPeriodUnit) ? h.costPeriodUnit : 'day';
  return {
    id: h.id,
    title: h.title,
    icon: typeof h.icon === 'string' && h.icon ? h.icon : '✨',
    startedAt: typeof h.startedAt === 'string' ? h.startedAt : new Date().toISOString(),
    costPerPeriod: Number(h.costPerPeriod) || 0,
    costPeriodUnit: unit,
    timeSpentMinutesPerDay: Number(h.timeSpentMinutesPerDay) || 0,
    reasons: Array.isArray(h.reasons)
      ? h.reasons.filter(/** @param {unknown} r */ (r) => typeof r === 'string')
      : [],
    tags: Array.isArray(h.tags)
      ? h.tags.filter(/** @param {unknown} t */ (t) => typeof t === 'string')
      : [],
    targetDays: Number(h.targetDays) > 0
      ? Number(h.targetDays)
      : (Array.isArray(h.milestones) && Number(h.milestones[0]) > 0 ? Number(h.milestones[0]) : 7),
    milestones: Array.isArray(h.milestones)
      ? h.milestones
          .map(Number)
          .filter(/** @param {number} n */ (n) => Number.isFinite(n) && n > 0)
          .sort(/** @param {number} a @param {number} b */ (a, b) => a - b)
      : [...DEFAULT_MILESTONES],
    createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
  };
}

/**
 * @param {any} l
 * @returns {import('./model.js').ResetLog | null}
 */
function normalizeResetLog(l) {
  if (!l || typeof l !== 'object' || typeof l.id !== 'string' || typeof l.habitId !== 'string') {
    return null;
  }
  return {
    id: l.id,
    habitId: l.habitId,
    startedAt: typeof l.startedAt === 'string' ? l.startedAt : new Date().toISOString(),
    resetAt: typeof l.resetAt === 'string' ? l.resetAt : new Date().toISOString(),
    durationSeconds: Number(l.durationSeconds) || 0,
    savedAmount: Number(l.savedAmount) || 0,
    reasonNote: typeof l.reasonNote === 'string' ? l.reasonNote : '',
    triggerTags: Array.isArray(l.triggerTags)
      ? l.triggerTags.filter(/** @param {unknown} t */ (t) => typeof t === 'string')
      : [],
  };
}

/**
 * 任意バージョンの保存データを現行スキーマへ変換する。
 * @param {any} raw パース済みオブジェクト
 * @returns {import('./model.js').AppData}
 * @throws {Error} 解釈不能な場合
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') {
    throw new Error('invalid data shape');
  }
  if (raw.version > SCHEMA_VERSION) {
    throw new Error(`unsupported future version: ${raw.version}`);
  }

  let data = raw;
  // v1 -> v2 移行
  if (data.version === 1) {
    data = {
      ...data,
      version: 2,
      habits: (Array.isArray(data.habits) ? data.habits : []).map(/** @param {any} h */ (h) =>
        h && typeof h === 'object' ? { ...h, tags: Array.isArray(h.tags) ? h.tags : [] } : h,
      ),
      resetLogs: (Array.isArray(data.resetLogs) ? data.resetLogs : []).map(/** @param {any} l */ (l) =>
        l && typeof l === 'object' ? { ...l, triggerTags: Array.isArray(l.triggerTags) ? l.triggerTags : [] } : l,
      ),
    };
  }

  return {
    version: SCHEMA_VERSION,
    habits: /** @type {any[]} */ (Array.isArray(data.habits) ? data.habits : [])
      .map(normalizeHabit)
      .filter(
        /** @param {import('./model.js').Habit | null} h @returns {h is import('./model.js').Habit} */
        (h) => h !== null,
      ),
    resetLogs: /** @type {any[]} */ (Array.isArray(data.resetLogs) ? data.resetLogs : [])
      .map(normalizeResetLog)
      .filter(
        /** @param {import('./model.js').ResetLog | null} l @returns {l is import('./model.js').ResetLog} */
        (l) => l !== null,
      ),
    rewards: Array.isArray(data.rewards) ? data.rewards : [],
    customTags: Array.isArray(data.customTags)
      ? data.customTags.filter(/** @param {unknown} t */ (t) => typeof t === 'string' && t.trim().length > 0)
      : [],
    defaultMilestones: Array.isArray(data.defaultMilestones)
      ? data.defaultMilestones
          .map(Number)
          .filter(/** @param {number} n */ (n) => Number.isFinite(n) && n > 0)
          .sort(/** @param {number} a @param {number} b */ (a, b) => a - b)
      : [...DEFAULT_MILESTONES],
  };
}

/**
 * @typedef {Object} LoadResult
 * @property {import('./model.js').AppData} data
 * @property {string | null} recoveredBackupKey 破損データを退避した場合のキー
 */

/**
 * @param {StorageLike} storage
 * @returns {LoadResult}
 */
export function load(storage) {
  /** @type {string | null} */
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData(), recoveredBackupKey: null };
  }
  if (raw === null) return { data: emptyData(), recoveredBackupKey: null };

  try {
    return { data: migrate(JSON.parse(raw)), recoveredBackupKey: null };
  } catch {
    const key = backupRaw(storage, raw);
    return { data: emptyData(), recoveredBackupKey: key };
  }
}

/**
 * @param {StorageLike} storage
 * @param {import('./model.js').AppData} data
 * @returns {boolean} 保存に成功したか（容量超過などで false）
 */
export function save(storage, data) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: SCHEMA_VERSION }));
    return true;
  } catch {
    return false;
  }
}
