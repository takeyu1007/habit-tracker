// @ts-check
/**
 * 履歴タブ（リセットタイムライン、習慣タグ/習慣別フィルタ、ソート）。
 */

import { escapeHtml, formatDateTime, formatDurationShort } from '../format.js';

/** @typedef {import('../model.js').ResetLog} ResetLog */
/** @typedef {import('../model.js').Habit} Habit */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export function createHistoryView() {
  const container = $('history-timeline');
  const emptyState = $('history-empty-state');
  const habitSelect = /** @type {HTMLSelectElement} */ ($('history-filter-habit'));
  const tagSelect = /** @type {HTMLSelectElement} */ ($('history-filter-tag'));
  const sortSelect = /** @type {HTMLSelectElement} */ ($('history-sort'));

  /** @type {ResetLog[]} */
  let logs = [];
  /** @type {Habit[]} */
  let habits = [];

  function updateFilterOptions() {
    const prevHabit = habitSelect.value;
    const prevTag = tagSelect.value;

    habitSelect.innerHTML =
      '<option value="all">すべての習慣</option>' +
      habits.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.icon)} ${escapeHtml(h.title)}</option>`).join('');
    habitSelect.value = habits.some((h) => h.id === prevHabit) ? prevHabit : 'all';

    // 習慣タグとトリガータグの全集合
    const allTags = new Set();
    habits.forEach((h) => h.tags.forEach((t) => allTags.add(t)));
    logs.forEach((l) => l.triggerTags.forEach((t) => allTags.add(t)));

    tagSelect.innerHTML =
      '<option value="all">すべてのタグ</option>' +
      [...allTags].sort().map((t) => `<option value="${escapeHtml(t)}">#${escapeHtml(t)}</option>`).join('');
    tagSelect.value = allTags.has(prevTag) ? prevTag : 'all';
  }

  function render() {
    updateFilterOptions();

    const selectedHabit = habitSelect.value;
    const selectedTag = tagSelect.value;
    const selectedSort = sortSelect.value;

    /** @type {Map<string, Habit>} */
    const habitMap = new Map(habits.map((h) => [h.id, h]));

    let filtered = logs.filter((log) => {
      if (selectedHabit !== 'all' && log.habitId !== selectedHabit) return false;
      if (selectedTag !== 'all') {
        const h = habitMap.get(log.habitId);
        const hasHabitTag = h ? h.tags.includes(selectedTag) : false;
        const hasTriggerTag = log.triggerTags.includes(selectedTag);
        if (!hasHabitTag && !hasTriggerTag) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (selectedSort === 'oldest') return Date.parse(a.resetAt) - Date.parse(b.resetAt);
      if (selectedSort === 'longest') return b.durationSeconds - a.durationSeconds;
      if (selectedSort === 'saved') return b.savedAmount - a.savedAmount;
      // newest
      return Date.parse(b.resetAt) - Date.parse(a.resetAt);
    });

    emptyState.hidden = filtered.length > 0;

    container.innerHTML = filtered
      .map((log) => {
        const habit = habitMap.get(log.habitId);
        const title = habit ? habit.title : '削除された習慣';
        const icon = habit ? habit.icon : '⏱️';
        const durationText = formatDurationShort(log.durationSeconds);
        const savedText = log.savedAmount > 0 ? `・¥${log.savedAmount.toLocaleString()} 浮いた` : '';

        const habitTagsHtml = habit
          ? habit.tags.map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')
          : '';
        const triggerTagsHtml = log.triggerTags
          .map((t) => `<span class="trigger-badge">⚡ ${escapeHtml(t)}</span>`)
          .join('');

        const noteHtml = log.reasonNote
          ? `<div class="history-card__note">${escapeHtml(log.reasonNote)}</div>`
          : '';

        return `
        <article class="history-card glass">
          <div class="history-card__head">
            <span class="history-card__title">
              <span aria-hidden="true">${escapeHtml(icon)}</span>
              <strong>${escapeHtml(title)}</strong>
            </span>
            <span class="history-card__date">${formatDateTime(log.resetAt)}</span>
          </div>
          <p class="history-card__duration">
            継続記録: <strong>${durationText}</strong> ${savedText}
          </p>
          <div class="history-card__tags">
            ${habitTagsHtml}
            ${triggerTagsHtml}
          </div>
          ${noteHtml}
        </article>`;
      })
      .join('');
  }

  habitSelect.addEventListener('change', render);
  tagSelect.addEventListener('change', render);
  sortSelect.addEventListener('change', render);

  /**
   * @param {ResetLog[]} newLogs
   * @param {Habit[]} newHabits
   */
  function update(newLogs, newHabits) {
    logs = newLogs;
    habits = newHabits;
    render();
  }

  return { update, render };
}
