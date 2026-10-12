// @ts-check
/**
 * データモデル定義（SPEC.md「3. データモデル定義」に対応）。
 * 保存形式を変更する場合は storage.js の SCHEMA_VERSION を上げ、migrate() に変換処理を追加すること。
 */

/** @typedef {'day' | 'week' | 'month'} CostPeriodUnit */

/**
 * 習慣データ
 * @typedef {Object} Habit
 * @property {string} id
 * @property {string} title                    習慣名
 * @property {string} icon                     アイコン（絵文字）
 * @property {string} startedAt                現在の連続記録の開始日時（ISO 8601）
 * @property {number} costPerPeriod            単価（円）
 * @property {CostPeriodUnit} costPeriodUnit   費用周期
 * @property {number} timeSpentMinutesPerDay   1日あたり消費していた時間（分）
 * @property {string[]} reasons                やめたい理由リスト
 * @property {string[]} tags                   分類カテゴリ・タグ（例: "健康", "節約"）
 * @property {number} targetDays               現在の目標日数（例: 7）
 * @property {number[]} [milestones]           旧マイルストーン互換用（任意）
 * @property {string} createdAt
 */

/**
 * リセット（スリップ）履歴ログ
 * @typedef {Object} ResetLog
 * @property {string} id
 * @property {string} habitId
 * @property {string} startedAt         その回の開始日時（統計計算用に保持）
 * @property {string} resetAt           再発日時
 * @property {number} durationSeconds   その回で継続できた秒数
 * @property {number} savedAmount       その回で浮いた金額（円）
 * @property {string} reasonNote        引き金・反省メモ
 * @property {string[]} triggerTags     再発トリガー要因（例: "ストレス", "疲労"）
 */

/**
 * ご褒美（ウィッシュリスト）※フェーズ3で使用
 * @typedef {Object} Reward
 * @property {string} id
 * @property {string} habitId
 * @property {string} name
 * @property {number} targetAmount
 * @property {boolean} isClaimed
 */

/**
 * 保存データ全体
 * @typedef {Object} AppData
 * @property {number} version
 * @property {Habit[]} habits
 * @property {ResetLog[]} resetLogs
 * @property {Reward[]} rewards
 * @property {string[]} [customTags]
 * @property {number[]} [defaultMilestones]
 */

export const DEFAULT_TAGS = Object.freeze([
  '健康',
  '節約',
  'メンタル',
  '時間',
  '睡眠',
  'ダイエット',
  '集中力',
  '食生活',
  'デジタルデトックス',
]);

export const DEFAULT_MILESTONES = Object.freeze([1, 3, 7, 14, 30, 90, 180, 365]);

/** @returns {string} */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // HTTP 配信時など randomUUID が使えない環境向けのフォールバック
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * フォーム入力などから Habit を生成する。未指定項目は既定値で埋める。
 * @param {Partial<Habit> & { title: string }} input
 * @param {Date} [now]
 * @returns {Habit}
 */
export function createHabit(input, now = new Date()) {
  const nowIso = now.toISOString();
  return {
    id: newId(),
    title: input.title.trim(),
    icon: input.icon || '✨',
    startedAt: input.startedAt || nowIso,
    costPerPeriod: input.costPerPeriod ?? 0,
    costPeriodUnit: input.costPeriodUnit ?? 'day',
    timeSpentMinutesPerDay: input.timeSpentMinutesPerDay ?? 0,
    reasons: input.reasons ? [...input.reasons] : [],
    tags: input.tags ? [...input.tags] : [],
    targetDays: Number(input.targetDays) > 0 ? Number(input.targetDays) : 7,
    milestones: input.milestones ? [...input.milestones] : [...DEFAULT_MILESTONES],
    createdAt: nowIso,
  };
}
