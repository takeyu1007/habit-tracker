// @ts-check
/**
 * 衝動（Craving）SOS モーダル。
 * 4-7-8 呼吸法（4秒吸う、7秒止める、8秒吐く）と「やめる理由」を提示して衝動の波をやり過ごす。
 */

import { escapeHtml } from '../format.js';

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export function createCravingModal() {
  const dialog = /** @type {HTMLDialogElement} */ ($('craving-dialog'));
  const circle = $('breathing-circle');
  const text = $('breathing-text');
  const secEl = $('breathing-sec');
  const reasonsList = $('craving-reasons-list');
  const reasonsCard = $('craving-reasons-card');
  const closeBtn = $('craving-close');

  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timerId;
  let phase = 'inhale'; // inhale(4s) -> hold(7s) -> exhale(8s)
  let count = 4;

  function resetBreath() {
    clearInterval(timerId);
    phase = 'inhale';
    count = 4;
    circle.className = 'breathing-circle inhale';
    text.textContent = '吸って';
    secEl.textContent = '4s';
  }

  function startBreath() {
    resetBreath();
    timerId = setInterval(() => {
      count--;
      if (count > 0) {
        secEl.textContent = `${count}s`;
        return;
      }

      // フェーズ移行
      if (phase === 'inhale') {
        phase = 'hold';
        count = 7;
        circle.className = 'breathing-circle hold';
        text.textContent = '止めて';
      } else if (phase === 'hold') {
        phase = 'exhale';
        count = 8;
        circle.className = 'breathing-circle exhale';
        text.textContent = '吐いて';
      } else {
        phase = 'inhale';
        count = 4;
        circle.className = 'breathing-circle inhale';
        text.textContent = '吸って';
      }
      secEl.textContent = `${count}s`;
    }, 1000);
  }

  /**
   * @param {import('../model.js').Habit} habit
   */
  function open(habit) {
    if (habit.reasons && habit.reasons.length > 0) {
      reasonsCard.hidden = false;
      reasonsList.innerHTML = habit.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
    } else {
      reasonsCard.hidden = true;
      reasonsList.innerHTML = '';
    }

    startBreath();
    dialog.showModal();
  }

  function close() {
    clearInterval(timerId);
    dialog.close();
  }

  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  return { open };
}
