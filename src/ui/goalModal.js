// @ts-check
/**
 * 個別の目標設定・再設定モーダル。
 * 習慣達成時または目標変更時に呼び出され、ワンタップで次の目標を設定可能。
 */

import { elapsedSeconds } from '../calc.js';
import { escapeHtml } from '../format.js';

/** @typedef {import('../model.js').Habit} Habit */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @param {Object} handlers
 * @param {(habitId: string, newTargetDays: number) => void} handlers.onSave
 */
export function createGoalModal(handlers) {
  const dialog = /** @type {HTMLDialogElement} */ ($('goal-dialog'));
  const titleEl = $('goal-dialog-title');
  const statusEl = $('goal-dialog-status');
  const chipsContainer = $('goal-preset-chips');
  const inputEl = /** @type {HTMLInputElement} */ ($('goal-custom-input'));
  const saveBtn = $('btn-save-goal');
  const cancelBtn = $('btn-cancel-goal');

  /** @type {Habit | null} */
  let currentHabit = null;

  /**
   * @param {number} days 現在の経過日数
   * @param {number} currentTarget 現在の目標
   * @returns {{ label: string, days: number }[]}
   */
  function computePresets(days, currentTarget) {
    const isAchieved = days >= currentTarget;
    if (!isAchieved) {
      const candidates = [3, 7, 14, 30, 90].filter((n) => n > days);
      const list = candidates.length > 0 ? candidates : [days + 7, days + 14, days + 30];
      return list.map((n) => ({
        label: n === 7 ? '7日 (1週間)' : n === 14 ? '14日 (2週間)' : n === 30 ? '30日 (1ヶ月)' : `${n}日`,
        days: n,
      }));
    }

    // 達成時は現在日数基準でのステップアップ
    const step1 = Math.max(days + 3, currentTarget + 3);
    const step2 = Math.max(days + 7, currentTarget + 7);
    const step3 = Math.max(days + 14, currentTarget + 14);
    const step4 = Math.max(days + 30, currentTarget + 30);

    return [
      { label: `+3日 (${step1}日)`, days: step1 },
      { label: `+7日 (${step2}日)`, days: step2 },
      { label: `+14日 (${step3}日)`, days: step3 },
      { label: `+30日 (${step4}日)`, days: step4 },
    ];
  }

  /**
   * @param {Habit} habit
   */
  function open(habit) {
    currentHabit = habit;
    const nowMs = Date.now();
    const elapsed = elapsedSeconds(habit.startedAt, nowMs);
    const currentDays = Math.floor(elapsed / 86400);
    const target = habit.targetDays || 7;
    const isAchieved = currentDays >= target;

    if (isAchieved) {
      titleEl.textContent = `🎉 目標達成！次の目標を設定`;
      statusEl.innerHTML = `<span class="congrats-text">「${escapeHtml(habit.title)}」${target}日の目標を達成しました！<br>現在 <strong>${currentDays}日</strong> 継続中です。次の目標を決めましょう 💪</span>`;
    } else {
      titleEl.textContent = `🎯 「${escapeHtml(habit.title)}」の目標設定`;
      statusEl.innerHTML = `現在 <strong>${currentDays}日</strong> 継続中（現在の目標: ${target}日）`;
    }

    const presets = computePresets(currentDays, target);
    chipsContainer.innerHTML = presets
      .map(
        (p, idx) =>
          `<button type="button" class="chip ${idx === 1 ? 'chip--active' : ''}" data-days="${p.days}">${escapeHtml(p.label)}</button>`,
      )
      .join('');

    const defaultPick = presets[1] ? presets[1].days : (presets[0]?.days ?? target + 7);
    inputEl.value = String(defaultPick);

    dialog.showModal();
  }

  chipsContainer.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement} */ (e.target).closest('[data-days]');
    if (!(chip instanceof HTMLElement) || !chip.dataset.days) return;
    const days = Number(chip.dataset.days);
    if (days > 0) {
      inputEl.value = String(days);
      chipsContainer.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
    }
  });

  inputEl.addEventListener('input', () => {
    const val = Number(inputEl.value);
    chipsContainer.querySelectorAll('.chip').forEach((c) => {
      const chipDays = Number(/** @type {HTMLElement} */ (c).dataset.days);
      c.classList.toggle('chip--active', chipDays === val);
    });
  });

  function close() {
    dialog.close();
    currentHabit = null;
  }

  saveBtn.addEventListener('click', () => {
    if (!currentHabit) return;
    const days = Math.max(1, Math.floor(Number(inputEl.value) || 0));
    const habitId = currentHabit.id;
    close();
    handlers.onSave(habitId, days);
  });

  cancelBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  return { open, close };
}
