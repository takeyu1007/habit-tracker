// @ts-check
/**
 * アプリ状態の管理。状態変更は必ずこのモジュールの関数経由で行い、変更のたびに自動保存する。
 * UI は subscribe() で変更通知を受け取って再描画する。
 */

import { createHabit, newId, DEFAULT_MILESTONES } from './model.js';
import { elapsedSeconds, savedMoney } from './calc.js';
import { load, save, emptyData } from './storage.js';

/** @typedef {import('./model.js').Habit} Habit */
/** @typedef {import('./model.js').AppData} AppData */
/** @typedef {import('./storage.js').StorageLike} StorageLike */

/**
 * @typedef {Object} HabitInput
 * @property {string} title
 * @property {string} icon
 * @property {string} startedAt ISO 8601
 * @property {number} [costPerPeriod]
 * @property {import('./model.js').CostPeriodUnit} [costPeriodUnit]
 * @property {number} [timeSpentMinutesPerDay]
 * @property {string[]} [reasons]
 * @property {string[]} [tags]
 * @property {number[]} [milestones]
 */

/**
 * @param {StorageLike} storage
 * @param {{ now?: () => Date }} [options] テスト用に現在時刻を差し替え可能
 */
export function createStore(storage, options = {}) {
  const now = options.now ?? (() => new Date());
  const loaded = load(storage);
  /** @type {AppData} */
  let state = loaded.data;
  /** @type {Set<(state: AppData) => void>} */
  const listeners = new Set();
  /** @type {Set<() => void>} */
  const saveErrorListeners = new Set();

  function commit() {
    if (!save(storage, state)) {
      saveErrorListeners.forEach((fn) => fn());
    }
    listeners.forEach((fn) => fn(state));
  }

  return {
    /** 破損データを退避した場合、そのキー（起動時の通知用） */
    recoveredBackupKey: loaded.recoveredBackupKey,

    /** @returns {AppData} */
    getState: () => state,

    /** @param {string} id */
    getHabit: (id) => state.habits.find((h) => h.id === id),

    /**
     * @param {(state: AppData) => void} fn
     * @returns {() => void} 購読解除関数
     */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** @param {() => void} fn 保存失敗（容量超過など）時に呼ばれる */
    onSaveError(fn) {
      saveErrorListeners.add(fn);
    },

    /**
     * @param {HabitInput} input
     * @returns {Habit}
     */
    addHabit(input) {
      const milestones = input.milestones && input.milestones.length > 0
        ? input.milestones
        : (state.defaultMilestones || [...DEFAULT_MILESTONES]);
      const habit = createHabit({ ...input, milestones }, now());
      state = { ...state, habits: [...state.habits, habit] };
      commit();
      return habit;
    },

    /**
     * @param {string} id
     * @param {Partial<HabitInput>} patch
     */
    updateHabit(id, patch) {
      state = {
        ...state,
        habits: state.habits.map((h) =>
          h.id === id
            ? {
                ...h,
                ...patch,
                title: patch.title !== undefined ? patch.title.trim() : h.title,
                costPerPeriod: patch.costPerPeriod !== undefined ? patch.costPerPeriod : h.costPerPeriod,
                costPeriodUnit: patch.costPeriodUnit !== undefined ? patch.costPeriodUnit : h.costPeriodUnit,
                timeSpentMinutesPerDay:
                  patch.timeSpentMinutesPerDay !== undefined
                    ? patch.timeSpentMinutesPerDay
                    : h.timeSpentMinutesPerDay,
                reasons: patch.reasons !== undefined ? [...patch.reasons] : h.reasons,
                tags: patch.tags !== undefined ? [...patch.tags] : h.tags,
                milestones: patch.milestones !== undefined ? [...patch.milestones] : h.milestones,
              }
            : h,
        ),
      };
      commit();
    },

    /**
     * 習慣と、それに紐づく履歴・ご褒美を削除する。
     * @param {string} id
     */
    deleteHabit(id) {
      state = {
        ...state,
        habits: state.habits.filter((h) => h.id !== id),
        resetLogs: state.resetLogs.filter((l) => l.habitId !== id),
        rewards: state.rewards.filter((r) => r.habitId !== id),
      };
      commit();
    },

    /**
     * リセット（再発）を記録し、再発日時を新しい開始日時にする。
     * @param {string} id
     * @param {{ resetAt?: Date, note?: string, triggerTags?: string[] }} [opts]
     * @returns {import('./model.js').ResetLog | undefined}
     */
    resetHabit(id, opts = {}) {
      const habit = state.habits.find((h) => h.id === id);
      if (!habit) return undefined;

      const nowMs = now().getTime();
      const startMs = Date.parse(habit.startedAt);
      // 再発日時は「開始日時 〜 現在」の範囲に収める
      const requested = opts.resetAt ? opts.resetAt.getTime() : nowMs;
      const resetMs = Math.min(nowMs, Math.max(Number.isNaN(startMs) ? requested : startMs, requested));
      const resetAt = new Date(resetMs).toISOString();
      const durationSeconds = elapsedSeconds(habit.startedAt, resetMs);

      /** @type {import('./model.js').ResetLog} */
      const log = {
        id: newId(),
        habitId: id,
        startedAt: habit.startedAt,
        resetAt,
        durationSeconds,
        savedAmount: Math.round(savedMoney(durationSeconds, habit.costPerPeriod, habit.costPeriodUnit)),
        reasonNote: (opts.note ?? '').trim(),
        triggerTags: opts.triggerTags ? [...opts.triggerTags] : [],
      };

      state = {
        ...state,
        habits: state.habits.map((h) => (h.id === id ? { ...h, startedAt: resetAt } : h)),
        resetLogs: [...state.resetLogs, log],
      };
      commit();
      return log;
    },

    /** 別タブでの変更を取り込む（storage イベント用） */
    reloadFromStorage() {
      state = load(storage).data;
      listeners.forEach((fn) => fn(state));
    },

    /**
     * カスタムタグの追加
     * @param {string} tag
     * @returns {boolean}
     */
    addCustomTag(tag) {
      const clean = tag.trim();
      if (!clean) return false;
      const current = state.customTags || [];
      if (current.includes(clean)) return false;
      state = { ...state, customTags: [...current, clean] };
      commit();
      return true;
    },

    /**
     * カスタムタグの削除
     * @param {string} tag
     * @returns {boolean}
     */
    deleteCustomTag(tag) {
      const current = state.customTags || [];
      if (!current.includes(tag)) return false;
      state = {
        ...state,
        customTags: current.filter((t) => t !== tag),
      };
      commit();
      return true;
    },

    /**
     * デフォルトマイルストーンの更新
     * @param {number[]} milestones
     * @returns {boolean}
     */
    setDefaultMilestones(milestones) {
      const valid = Array.from(new Set(milestones.filter((n) => Number.isFinite(n) && n > 0))).sort((a, b) => a - b);
      if (valid.length === 0) return false;
      state = {
        ...state,
        defaultMilestones: valid,
      };
      commit();
      return true;
    },

    /**
     * JSON インポートによる全データ復元
     * @param {string} jsonString
     * @returns {boolean}
     */
    importData(jsonString) {
      try {
        const raw = JSON.parse(jsonString);
        const migrated = load({
          getItem: () => jsonString,
          setItem: () => {},
        }).data;
        state = migrated;
        commit();
        return true;
      } catch {
        return false;
      }
    },

    /** 全データの初期化 */
    resetAll() {
      state = emptyData();
      commit();
    },
  };
}

/** @typedef {ReturnType<typeof createStore>} Store */
