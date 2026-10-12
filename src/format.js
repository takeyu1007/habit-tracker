// @ts-check
/**
 * 表示用の整形ヘルパー（DOM 非依存）。
 */

import { splitDuration } from './calc.js';

/** @param {number} n */
export const pad2 = (n) => String(n).padStart(2, '0');

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * ISO 文字列を「2026/10/01 08:00」形式（端末のタイムゾーン）で表示する。
 * @param {string} iso
 */
export function formatDateTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateTimeFormatter.format(d);
}

/**
 * 秒数を「12日 4時間 18分」のような短い表記にする（0 の大きい単位は省略）。
 * @param {number} seconds
 */
export function formatDurationShort(seconds) {
  const { days, hours, minutes } = splitDuration(seconds);
  if (days > 0) return `${days}日 ${hours}時間 ${minutes}分`;
  if (hours > 0) return `${hours}時間 ${minutes}分`;
  return `${minutes}分`;
}

/**
 * Date → `<input type="datetime-local">` 用の値（ローカル時刻 "YYYY-MM-DDTHH:mm"）。
 * @param {Date} date
 */
export function toLocalInputValue(date) {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

/**
 * `<input type="datetime-local">` の値 → Date（不正値は null）。
 * @param {string} value
 * @returns {Date | null}
 */
export function fromLocalInputValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * innerHTML に埋め込む文字列のエスケープ。ユーザー入力は必ずこれを通す。
 * @param {string} s
 */
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
