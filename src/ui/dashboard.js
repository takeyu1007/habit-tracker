// @ts-check
/**
 * ダッシュボード（習慣カード一覧）。
 * - render(): 状態変更時のみ一覧を再構築
 * - tick():   毎秒、タイマーの数字テキストだけを書き換える（全体再描画しない）
 */

import { elapsedSeconds, splitDuration, savedMoney, savedMinutes, annualProjectedLoss, getTargetProgress } from '../calc.js';
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
  const tagsHtml = habit.tags && habit.tags.length > 0
    ? `<div class="habit-card__tags">${habit.tags.map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const hasCost = habit.costPerPeriod > 0;
  const hasTime = habit.timeSpentMinutesPerDay > 0;
  const annualLoss = hasCost ? annualProjectedLoss(habit.costPerPeriod, habit.costPeriodUnit) : 0;

  const metricsHtml = (hasCost || hasTime)
    ? `<div class="habit-metrics">
        ${hasCost ? `<div class="metric-pill"><span class="metric-pill__label">浮いたお金</span><span class="metric-pill__value" data-t="saved-money">¥0</span></div>` : ''}
        ${hasTime ? `<div class="metric-pill"><span class="metric-pill__label">取り戻した時間</span><span class="metric-pill__value" data-t="saved-time">0h</span></div>` : ''}
        ${hasCost ? `<div class="metric-pill"><span class="metric-pill__label">年間想定の損失</span><span class="metric-pill__value metric-pill__value--loss">¥${Math.round(annualLoss).toLocaleString()}/年</span></div>` : ''}
      </div>`
    : '';

  const targetHtml = `
    <div class="target-box" data-t="target-box">
      <div class="target-box__header">
        <span class="target-box__title" data-t="target-label">🎯 目標: 計算中...</span>
        <span class="target-box__percent" data-t="target-percent">0%</span>
      </div>
      <div class="target-box__track">
        <div class="target-box__fill" data-t="target-fill" style="width: 0%;"></div>
      </div>
      <div class="target-box__footer">
        <span class="target-box__sub" data-t="target-sub">あと - 日</span>
        <button type="button" class="target-box__action-btn" data-action="set-goal" data-t="target-action">目標を変更</button>
      </div>
    </div>`;

  return `
  <article class="habit-card glass" data-id="${escapeHtml(habit.id)}" style="--i:${index}">
    <div class="habit-card__head">
      <span class="habit-card__icon" aria-hidden="true">${escapeHtml(habit.icon)}</span>
      <div class="habit-card__meta">
        <h3 class="habit-card__title">${title}</h3>
        <p class="habit-card__since">${formatDateTime(habit.startedAt)} から</p>
        ${tagsHtml}
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

    ${targetHtml}
    ${metricsHtml}

    <div class="habit-card__foot">
      <span class="live-dot">記録中</span>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn btn--sos" data-action="craving" title="衝動が来たときの対策">🚨 衝動SOS</button>
        <button type="button" class="btn btn--reset" data-action="reset">リセット</button>
      </div>
    </div>
  </article>`;
}

/**
 * @typedef {Object} DashboardHandlers
 * @property {(id: string) => void} onEdit
 * @property {(id: string) => void} onReset
 * @property {(id: string) => void} onCraving
 * @property {(id: string) => void} onSetGoal
 */

/**
 * @param {DashboardHandlers} handlers
 */
export function createDashboard(handlers) {
  /** @type {Map<HTMLElement, Habit>} カード要素 → Habit */
  let cards = new Map();

  grid.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const button = target.closest('button[data-action]');
    const card = target.closest('.habit-card');
    if (!button || !(card instanceof HTMLElement) || !card.dataset.id) return;
    const action = /** @type {HTMLElement} */ (button).dataset.action;
    if (action === 'edit') handlers.onEdit(card.dataset.id);
    if (action === 'reset') handlers.onReset(card.dataset.id);
    if (action === 'craving') handlers.onCraving(card.dataset.id);
    if (action === 'set-goal') handlers.onSetGoal(card.dataset.id);
  });

  /** @param {number} nowMs */
  function tick(nowMs) {
    cards.forEach((habit, card) => {
      const elapsed = elapsedSeconds(habit.startedAt, nowMs);
      const { days, hours, minutes, seconds } = splitDuration(elapsed);
      setText(card, 'days', String(days));
      setText(card, 'hours', pad2(hours));
      setText(card, 'minutes', pad2(minutes));
      setText(card, 'seconds', pad2(seconds));

      // 節約メトリクス
      if (habit.costPerPeriod > 0) {
        const money = Math.round(savedMoney(elapsed, habit.costPerPeriod, habit.costPeriodUnit));
        setText(card, 'saved-money', `¥${money.toLocaleString()}`);
      }
      if (habit.timeSpentMinutesPerDay > 0) {
        const mins = savedMinutes(elapsed, habit.timeSpentMinutesPerDay);
        const hrs = (mins / 60).toFixed(1);
        setText(card, 'saved-time', `${hrs}時間`);
      }

      // 個別目標の進捗と達成判定
      const targetDays = habit.targetDays || 7;
      const tp = getTargetProgress(elapsed, targetDays);
      const targetBox = card.querySelector('[data-t="target-box"]');
      const actionBtn = card.querySelector('[data-t="target-action"]');
      const fillEl = card.querySelector('[data-t="target-fill"]');

      if (tp.isAchieved) {
        setText(card, 'target-label', `🎉 目標（${tp.targetDays}日）達成！`);
        setText(card, 'target-percent', '100%');
        setText(card, 'target-sub', '達成おめでとう！');
        if (actionBtn instanceof HTMLElement) {
          actionBtn.textContent = '🎯 次の目標を設定';
          actionBtn.className = 'btn btn--primary btn--sm target-box__btn-celebrate';
        }
        if (targetBox instanceof HTMLElement) {
          targetBox.classList.add('target-box--achieved');
        }
        if (fillEl instanceof HTMLElement) {
          fillEl.style.width = '100%';
          fillEl.classList.add('target-box__fill--achieved');
        }
      } else {
        setText(card, 'target-label', `🎯 目標: ${tp.targetDays}日`);
        setText(card, 'target-percent', `${tp.percent}%`);
        setText(card, 'target-sub', `あと ${tp.remainingDays}日`);
        if (actionBtn instanceof HTMLElement) {
          actionBtn.textContent = '目標を変更';
          actionBtn.className = 'target-box__action-btn';
        }
        if (targetBox instanceof HTMLElement) {
          targetBox.classList.remove('target-box--achieved');
        }
        if (fillEl instanceof HTMLElement) {
          fillEl.style.width = `${tp.percent}%`;
          fillEl.classList.remove('target-box__fill--achieved');
        }
      }
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
      cards.set(/** @type {HTMLElement} */ (el), habits[i]);
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
