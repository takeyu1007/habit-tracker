// @ts-check
/**
 * 習慣の追加・編集ダイアログ。
 */

import { fromLocalInputValue, toLocalInputValue } from '../format.js';

/** @typedef {import('../model.js').Habit} Habit */

/** よく使う習慣のテンプレート（タップで名前とアイコンを入力） */
const TEMPLATES = [
  { title: 'タバコ', icon: '🚬' },
  { title: 'お酒', icon: '🍺' },
  { title: '間食', icon: '🍩' },
  { title: 'SNS', icon: '📱' },
  { title: 'エナジードリンク', icon: '⚡' },
  { title: 'カフェイン', icon: '☕' },
  { title: 'ゲーム', icon: '🎮' },
  { title: '衝動買い', icon: '🛒' },
  { title: '夜更かし', icon: '🌙' },
];

const ICONS = ['✨', '🚬', '🍺', '🍷', '🍩', '🍫', '🍔', '🥤', '⚡', '☕', '📱', '💬', '🎮', '📺', '🛒', '💸', '🎰', '🌙', '🛌', '💊'];

/** 未来日時チェックの許容誤差（入力中に分が進むケース対策） */
const FUTURE_TOLERANCE_MS = 60_000;

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @typedef {Object} HabitFormResult
 * @property {string | null} id      編集時は対象 ID、追加時は null
 * @property {string} title
 * @property {string} icon
 * @property {string} startedAt     ISO 8601
 */

/**
 * @typedef {Object} HabitFormHandlers
 * @property {(result: HabitFormResult) => void} onSubmit
 * @property {(id: string) => void} onDelete
 */

/** @param {HabitFormHandlers} handlers */
export function createHabitForm(handlers) {
  const dialog = /** @type {HTMLDialogElement} */ ($('habit-dialog'));
  const form = /** @type {HTMLFormElement} */ ($('habit-form'));
  const heading = $('habit-dialog-title');
  const templateField = $('template-field');
  const templateList = $('template-list');
  const iconList = $('icon-list');
  const titleInput = /** @type {HTMLInputElement} */ ($('habit-title'));
  const titleError = $('habit-title-error');
  const startedInput = /** @type {HTMLInputElement} */ ($('habit-started-at'));
  const startedError = $('habit-started-at-error');
  const deleteButton = /** @type {HTMLButtonElement} */ ($('habit-delete'));

  /** @type {string | null} */
  let editingId = null;
  let selectedIcon = ICONS[0];
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let disarmTimer;

  templateList.innerHTML = TEMPLATES.map(
    (t, i) => `<button type="button" class="chip" data-template="${i}"><span aria-hidden="true">${t.icon}</span>${t.title}</button>`,
  ).join('');

  templateList.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement} */ (e.target).closest('[data-template]');
    if (!(chip instanceof HTMLElement)) return;
    const t = TEMPLATES[Number(chip.dataset.template)];
    titleInput.value = t.title;
    setIcon(t.icon);
    clearErrors();
  });

  /** @param {string[]} icons */
  function renderIcons(icons) {
    iconList.innerHTML = icons
      .map(
        (icon) =>
          `<button type="button" class="icon-option" role="radio" aria-checked="false" aria-label="${icon}" data-icon="${icon}">${icon}</button>`,
      )
      .join('');
  }

  /** @param {string} icon */
  function setIcon(icon) {
    selectedIcon = icon;
    iconList.querySelectorAll('[data-icon]').forEach((el) => {
      el.setAttribute('aria-checked', String(/** @type {HTMLElement} */ (el).dataset.icon === icon));
    });
  }

  iconList.addEventListener('click', (e) => {
    const option = /** @type {HTMLElement} */ (e.target).closest('[data-icon]');
    if (option instanceof HTMLElement && option.dataset.icon) setIcon(option.dataset.icon);
  });

  function clearErrors() {
    titleError.hidden = true;
    startedError.hidden = true;
    titleInput.removeAttribute('aria-invalid');
    startedInput.removeAttribute('aria-invalid');
  }

  function disarmDelete() {
    clearTimeout(disarmTimer);
    deleteButton.classList.remove('is-armed');
    deleteButton.textContent = '削除';
  }

  /**
   * @param {Habit | undefined} habit 指定時は編集モード
   */
  function open(habit) {
    editingId = habit?.id ?? null;
    const now = new Date();
    form.reset();
    clearErrors();
    disarmDelete();

    const icons = habit && !ICONS.includes(habit.icon) ? [habit.icon, ...ICONS] : ICONS;
    renderIcons(icons);

    heading.textContent = habit ? '習慣を編集' : '習慣を追加';
    templateField.hidden = Boolean(habit);
    deleteButton.hidden = !habit;
    titleInput.value = habit?.title ?? '';
    startedInput.max = toLocalInputValue(now);
    startedInput.value = toLocalInputValue(habit ? new Date(habit.startedAt) : now);
    setIcon(habit?.icon ?? ICONS[0]);

    dialog.showModal();
    // スマホでいきなりキーボードが出ると操作しづらいため、追加時の自動フォーカスは PC のみ
    if (!habit && window.matchMedia('(hover: hover)').matches) titleInput.focus();
  }

  function close() {
    disarmDelete();
    dialog.close();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const title = titleInput.value.trim();
    const started = fromLocalInputValue(startedInput.value);
    let valid = true;

    if (!title) {
      titleError.hidden = false;
      titleInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!started || started.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      startedError.textContent = started ? '未来の日時は指定できません' : '日時を入力してください';
      startedError.hidden = false;
      startedInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!valid || !started) return;

    // 入力が未来側に少しずれていた場合は現在時刻に丸める
    const startedAt = new Date(Math.min(started.getTime(), Date.now())).toISOString();
    handlers.onSubmit({ id: editingId, title, icon: selectedIcon, startedAt });
    close();
  });

  deleteButton.addEventListener('click', () => {
    if (!editingId) return;
    if (!deleteButton.classList.contains('is-armed')) {
      // 誤操作防止: 1回目は確認状態にするだけ
      deleteButton.classList.add('is-armed');
      deleteButton.textContent = 'もう一度押して削除';
      disarmTimer = setTimeout(disarmDelete, 3000);
      return;
    }
    const id = editingId;
    close();
    handlers.onDelete(id);
  });

  $('habit-cancel').addEventListener('click', close);
  // 背景タップで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  return { open };
}
