// @ts-check
/**
 * コア計算ロジック（SPEC.md「4. コア計算ロジック仕様」に対応）。
 * DOM・localStorage に依存しない純粋関数のみを置くこと。変更時は tests/calc.test.js を更新する。
 */

const SECONDS_PER_DAY = 86400;
/** 1ヶ月の平均日数（365.25 / 12） */
const DAYS_PER_MONTH = 30.4375;

/**
 * 開始日時から現在までの経過秒数。未来日時・不正な日時は 0。
 * @param {string} startedAt ISO 8601
 * @param {number} nowMs     Date.now() 相当
 * @returns {number}
 */
export function elapsedSeconds(startedAt, nowMs) {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 1000));
}

/**
 * 秒数を 日・時・分・秒 に分解する。
 * @param {number} totalSeconds
 * @returns {{ days: number, hours: number, minutes: number, seconds: number }}
 */
export function splitDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / SECONDS_PER_DAY),
    hours: Math.floor((s % SECONDS_PER_DAY) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * 1日あたりの金額に換算する。
 * @param {number} costPerPeriod
 * @param {import('./model.js').CostPeriodUnit} unit
 * @returns {number}
 */
export function dailyCost(costPerPeriod, unit) {
  const cost = Number.isFinite(costPerPeriod) ? Math.max(0, costPerPeriod) : 0;
  switch (unit) {
    case 'week':
      return cost / 7;
    case 'month':
      return cost / DAYS_PER_MONTH;
    case 'day':
    default:
      return cost;
  }
}

/**
 * 経過秒数に対する節約金額（円、小数を含む。表示時に丸めること）。
 * @param {number} seconds
 * @param {number} costPerPeriod
 * @param {import('./model.js').CostPeriodUnit} unit
 * @returns {number}
 */
export function savedMoney(seconds, costPerPeriod, unit) {
  return (Math.max(0, seconds) / SECONDS_PER_DAY) * dailyCost(costPerPeriod, unit);
}

/**
 * 経過秒数に対する取り戻した時間（分）。
 * @param {number} seconds
 * @param {number} minutesPerDay
 * @returns {number}
 */
export function savedMinutes(seconds, minutesPerDay) {
  const perDay = Number.isFinite(minutesPerDay) ? Math.max(0, minutesPerDay) : 0;
  return (Math.max(0, seconds) / SECONDS_PER_DAY) * perDay;
}
