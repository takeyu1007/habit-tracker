// @ts-check
/**
 * リセット（再発）確認ダイアログ。フェーズ1では再発日時は「現在」固定。
 */

import { elapsedSeconds } from '../calc.js';
import { formatDurationShort } from '../format.js';

/** @typedef {import('../model.js').Habit} Habit */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const TRIGGER_TAG_PRESETS = ['ストレス', '疲労', '暇つぶし', '飲酒', '衝動', '付き合い', '感情の揺れ', '夜更かし'];

/**
 * @param {{ onConfirm: (id: string, note: string, triggerTags: string[]) => void }} handlers
 */
export function createResetModal(handlers) {
  const dialog = /** @type {HTMLDialogElement} */ ($('reset-dialog'));
  const form = /** @type {HTMLFormElement} */ ($('reset-form'));
  const note = /** @type {HTMLTextAreaElement} */ ($('reset-note'));
  const triggersList = $('reset-triggers-list');

  /** @type {string | null} */
  let habitId = null;
  /** @type {Set<string>} */
  const selectedTriggers = new Set();

  function renderTriggers() {
    triggersList.innerHTML = TRIGGER_TAG_PRESETS.map((tag) => {
      const active = selectedTriggers.has(tag);
      return `<button type="button" class="chip" data-trigger="${tag}" aria-checked="${active}">⚡ ${tag}</button>`;
    }).join('');
  }

  triggersList.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement} */ (e.target).closest('[data-trigger]');
    if (!(chip instanceof HTMLElement) || !chip.dataset.trigger) return;
    const tag = chip.dataset.trigger;
    if (selectedTriggers.has(tag)) selectedTriggers.delete(tag);
    else selectedTriggers.add(tag);
    renderTriggers();
  });

  /** @param {Habit} habit */
  function open(habit) {
    habitId = habit.id;
    selectedTriggers.clear();
    renderTriggers();
    $('reset-icon').textContent = habit.icon;
    $('reset-habit-title').textContent = habit.title;
    $('reset-duration').textContent = formatDurationShort(elapsedSeconds(habit.startedAt, Date.now()));
    note.value = '';
    dialog.showModal();
  }

  function close() {
    habitId = null;
    selectedTriggers.clear();
    dialog.close();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (habitId) handlers.onConfirm(habitId, note.value, [...selectedTriggers]);
    close();
  });

  $('reset-cancel').addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  return { open };
}
