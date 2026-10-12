// @ts-check
/**
 * ダッシュボード（習慣カード一覧）。
 * - render(): 状態変更時のみ一覧を再構築
 * - tick():   毎秒、タイマーの数字テキストだけを書き換える（全体再描画しない）
 */

import { elapsedSeconds, splitDuration } from '../calc.js';
import { escapeHtml, formatDateTime, pad2 } from '../format.js';

/** @typedef {import('../model.js').Habit} Habit */

const grid = /** @type {HTMLElement} */ (document.getElementById('habit-grid'));
const emptyState = /** @type {HTMLElement} */ (document.getElementById('empty-state'));
const summary = /** @type {HTMLElement} */ (document.getElementById('header-summary'));

const EDIT_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

/**
 * @param {Habit} habit
 * @param {number} index
 */
function cardHtml(habit, index) {
  const title = escapeHtml(habit.title);
  return `
  <article class="habit-card glass" data-id="${escapeHtml(habit.id)}" style="--i:${index}">
    <div class="habit-card__head">
      <span class="habit-card__icon" aria-hidden="true">${escapeHtml(habit.icon)}</span>
      <div class="habit-card__meta">
        <h3 class="habit-card__title">${title}</h3>
        <p class="habit-card__since">${formatDateTime(habit.startedAt)} から</p>
      </div>
      <button type="button" class="icon-btn" data-action="edit" aria-label="「${title}」を編集">${EDIT_ICON}</button>
    </div>
    <div class="habit-card__timer" aria-label="経過時間">
      <div class="timer-days">
        <span class="timer-days__value" data-t="days">0</span><span class="timer-days__unit">日</span>
      </div>
      <div class="timer-clock">
        <span class="timer-clock__seg"><span class="timer-clock__num" data-t="hours">00</span><span class="timer-clock__unit">時間</span></span>
        <span class="timer-clock__seg"><span class="timer-clock__num" data-t="minutes">00</span><span class="timer-clock__unit">分</span></span>
        <span class="timer-clock__seg"><span class="timer-clock__num" data-t="seconds">00</span><span class="timer-clock__unit">秒</span></span>
      </div>
    </div>
    <div class="habit-card__foot">
      <span class="live-dot">記録中</span>
      <button type="button" class="btn btn--reset" data-action="reset">リセット</button>
    </div>
  </article>`;
}

/**
 * @typedef {Object} DashboardHandlers
 * @property {(id: string) => void} onEdit
 * @property {(id: string) => void} onReset
 */

/**
 * @param {DashboardHandlers} handlers
 */
export function createDashboard(handlers) {
  /** @type {Map<HTMLElement, string>} カード要素 → startedAt */
  let cards = new Map();

  grid.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const button = target.closest('button[data-action]');
    const card = target.closest('.habit-card');
    if (!button || !(card instanceof HTMLElement) || !card.dataset.id) return;
    const action = /** @type {HTMLElement} */ (button).dataset.action;
    if (action === 'edit') handlers.onEdit(card.dataset.id);
    if (action === 'reset') handlers.onReset(card.dataset.id);
  });

  /** @param {number} nowMs */
  function tick(nowMs) {
    cards.forEach((startedAt, card) => {
      const { days, hours, minutes, seconds } = splitDuration(elapsedSeconds(startedAt, nowMs));
      setText(card, 'days', String(days));
      setText(card, 'hours', pad2(hours));
      setText(card, 'minutes', pad2(minutes));
      setText(card, 'seconds', pad2(seconds));
    });
  }

  /**
   * @param {Habit[]} habits
   * @param {number} nowMs
   */
  function render(habits, nowMs) {
    grid.innerHTML = habits.map(cardHtml).join('');
    emptyState.hidden = habits.length > 0;
    summary.textContent =
      habits.length > 0 ? `${habits.length}つの習慣を記録中` : 'やめたい習慣を、記録で断ち切る';

    cards = new Map();
    grid.querySelectorAll('.habit-card').forEach((el, i) => {
      cards.set(/** @type {HTMLElement} */ (el), habits[i].startedAt);
    });
    tick(nowMs);
  }

  return { render, tick };
}

/**
 * 値が変わったときだけ DOM を更新する。
 * @param {HTMLElement} card
 * @param {string} key
 * @param {string} value
 */
function setText(card, key, value) {
  const el = card.querySelector(`[data-t="${key}"]`);
  if (el && el.textContent !== value) el.textContent = value;
}
