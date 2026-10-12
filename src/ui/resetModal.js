// @ts-check
/**
 * リセット（再発）確認ダイアログ。フェーズ1では再発日時は「現在」固定。
 */

import { elapsedSeconds } from '../calc.js';
import { formatDurationShort } from '../format.js';

/** @typedef {import('../model.js').Habit} Habit */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @param {{ onConfirm: (id: string, note: string) => void }} handlers
 */
export function createResetModal(handlers) {
  const dialog = /** @type {HTMLDialogElement} */ ($('reset-dialog'));
  const form = /** @type {HTMLFormElement} */ ($('reset-form'));
  const note = /** @type {HTMLTextAreaElement} */ ($('reset-note'));

  /** @type {string | null} */
  let habitId = null;

  /** @param {Habit} habit */
  function open(habit) {
    habitId = habit.id;
    $('reset-icon').textContent = habit.icon;
    $('reset-habit-title').textContent = habit.title;
    $('reset-duration').textContent = formatDurationShort(elapsedSeconds(habit.startedAt, Date.now()));
    note.value = '';
    dialog.showModal();
  }

  function close() {
    habitId = null;
    dialog.close();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (habitId) handlers.onConfirm(habitId, note.value);
    close();
  });

  $('reset-cancel').addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  return { open };
}
