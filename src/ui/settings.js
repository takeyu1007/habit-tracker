// @ts-check
/**
 * 設定ビュー（JSONインポート/エクスポート、カスタムタグ管理、デフォルトマイルストーン設定、初期化）。
 */

import { escapeHtml } from '../format.js';
import { showToast } from './toast.js';

/** @typedef {import('../store.js').Store} Store */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * @param {Store} store
 * @param {() => void} onDataChanged
 */
export function createSettingsView(store, onDataChanged) {
  const exportBtn = $('btn-export-json');
  const importInput = /** @type {HTMLInputElement} */ ($('input-import-json'));
  const newTagInput = /** @type {HTMLInputElement} */ ($('new-custom-tag-input'));
  const addTagBtn = $('btn-add-custom-tag');
  const tagsList = $('settings-tags-list');
  const milestonesInput = /** @type {HTMLInputElement} */ ($('settings-milestones-input'));
  const saveMilestonesBtn = $('btn-save-milestones');
  const resetAllBtn = $('btn-reset-all');

  function renderTags() {
    const customTags = store.getState().customTags || [];
    if (customTags.length === 0) {
      tagsList.innerHTML = '<span class="field__hint">カスタムタグはまだありません</span>';
      return;
    }
    tagsList.innerHTML = customTags
      .map(
        (t) =>
          `<span class="chip chip--removable">#${escapeHtml(t)}<button type="button" class="chip-remove-btn" data-delete-tag="${escapeHtml(t)}" aria-label="${escapeHtml(t)}を削除">×</button></span>`,
      )
      .join('');
  }

  tagsList.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('[data-delete-tag]');
    if (!(btn instanceof HTMLElement) || !btn.dataset.deleteTag) return;
    const tag = btn.dataset.deleteTag;
    store.deleteCustomTag(tag);
    renderTags();
    showToast(`タグ「#${tag}」を削除しました`);
  });

  function handleAddTag() {
    const tag = newTagInput.value.trim().replace(/^#/, '');
    if (!tag) return;
    store.addCustomTag(tag);
    newTagInput.value = '';
    renderTags();
    showToast(`タグ「#${tag}」を追加しました`);
  }

  addTagBtn.addEventListener('click', handleAddTag);
  newTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  });

  function renderMilestones() {
    const defaultMilestones = store.getState().defaultMilestones || [1, 3, 7, 14, 30, 90, 180, 365];
    milestonesInput.value = defaultMilestones.join(', ');
  }

  saveMilestonesBtn.addEventListener('click', () => {
    const parsed = milestonesInput.value
      .split(/[,、\s]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    if (parsed.length === 0) {
      showToast('1つ以上の正の整数を指定してください', { type: 'error' });
      return;
    }
    store.setDefaultMilestones(parsed);
    renderMilestones();
    showToast('デフォルト目標日数を保存しました');
  });

  // JSON エクスポート
  exportBtn.addEventListener('click', () => {
    const data = store.getState();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `habit-tracker-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('バックアップJSONをダウンロードしました');
  });

  // JSON インポート
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const ok = store.importData(content);
      if (ok) {
        onDataChanged();
        render();
        showToast('データを正常に復元しました！');
      } else {
        showToast('ファイルの形式が正しくありません', { type: 'error' });
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // 全初期化（2段階安全確認）
  let resetArmed = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let resetTimer;
  resetAllBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      resetAllBtn.textContent = '本当に全データを初期化しますか？';
      resetAllBtn.classList.add('is-armed');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        resetArmed = false;
        resetAllBtn.textContent = '全データを初期化';
        resetAllBtn.classList.remove('is-armed');
      }, 4000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    resetAllBtn.textContent = '全データを初期化';
    resetAllBtn.classList.remove('is-armed');
    store.resetAll();
    onDataChanged();
    render();
    showToast('すべてのデータを初期化しました');
  });

  function render() {
    renderTags();
    renderMilestones();
  }

  return { render };
}
