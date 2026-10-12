// @ts-check
/**
 * エントリーポイント: ストア生成、UI の結線、毎秒タイマー、Service Worker 登録。
 */

import { createStore } from './store.js';
import { STORAGE_KEY } from './storage.js';
import { DEFAULT_TAGS, DEFAULT_MILESTONES } from './model.js';
import { createDashboard } from './ui/dashboard.js';
import { createHabitForm } from './ui/habitForm.js';
import { createResetModal } from './ui/resetModal.js';
import { createCravingModal } from './ui/cravingModal.js';
import { createHistoryView } from './ui/history.js';
import { createSettingsView } from './ui/settings.js';
import { setupTabs, updateTabBadges } from './ui/tabs.js';
import { setupInstallHint } from './ui/installHint.js';
import { showToast } from './ui/toast.js';

const store = createStore(localStorage);

const cravingModal = createCravingModal();
const historyView = createHistoryView();

function syncViews(state = store.getState()) {
  dashboard.render(state.habits, Date.now());
  historyView.update(state.resetLogs, state.habits);
  updateTabBadges(state.habits.length, state.resetLogs.length);
}

const settingsView = createSettingsView(store, () => syncViews());

const habitForm = createHabitForm(
  {
    onSubmit({ id, title, icon, startedAt, costPerPeriod, costPeriodUnit, timeSpentMinutesPerDay, reasons, tags, milestones }) {
      if (id) {
        store.updateHabit(id, {
          title,
          icon,
          startedAt,
          costPerPeriod,
          costPeriodUnit,
          timeSpentMinutesPerDay,
          reasons,
          tags,
          milestones,
        });
        showToast('保存しました');
      } else {
        store.addHabit({
          title,
          icon,
          startedAt,
          costPerPeriod,
          costPeriodUnit,
          timeSpentMinutesPerDay,
          reasons,
          tags,
          milestones,
        });
        showToast(`「${title}」の記録を始めました`);
      }
    },
    onDelete(id) {
      const title = store.getHabit(id)?.title ?? '';
      store.deleteHabit(id);
      showToast(`「${title}」を削除しました`);
    },
    onAddCustomTag(tag) {
      store.addCustomTag(tag);
      settingsView.render();
    },
  },
  () => {
    const state = store.getState();
    const custom = state.customTags || [];
    const allTags = [...new Set([...DEFAULT_TAGS, ...custom])];
    const defaultMilestones = state.defaultMilestones || [...DEFAULT_MILESTONES];
    return { allTags, defaultMilestones };
  },
);

const resetModal = createResetModal({
  onConfirm(id, note, triggerTags) {
    store.resetHabit(id, { note, triggerTags });
    showToast('記録を残しました。ここからまた始めましょう 💪');
  },
});

const dashboard = createDashboard({
  onEdit(id) {
    habitForm.open(store.getHabit(id));
  },
  onReset(id) {
    const habit = store.getHabit(id);
    if (habit) resetModal.open(habit);
  },
  onCraving(id) {
    const habit = store.getHabit(id);
    if (habit) cravingModal.open(habit);
  },
});

const openAddForm = () => habitForm.open(undefined);
document.getElementById('fab-add')?.addEventListener('click', openAddForm);
document.getElementById('empty-add-button')?.addEventListener('click', openAddForm);

setupTabs((tab) => {
  if (tab === 'history') {
    historyView.render();
  } else if (tab === 'settings') {
    settingsView.render();
  }
});

store.subscribe((state) => syncViews(state));
store.onSaveError(() =>
  showToast('保存に失敗しました。端末の空き容量を確認してください', { type: 'error', duration: 6000 }),
);

syncViews();

// PWA App Shortcut (#add) から起動された場合は自動で追加モーダルを開く
if (window.location.hash === '#add') {
  openAddForm();
  history.replaceState(null, '', window.location.pathname);
}

if (store.recoveredBackupKey) {
  showToast('保存データを読み込めなかったため、バックアップに退避して初期化しました', {
    type: 'error',
    duration: 8000,
  });
}

// 別タブ（ブラウザとホーム画面アプリ等）での変更を反映
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) store.reloadFromStorage();
});

// ---- 毎秒タイマー（秒の切り替わりに合わせる。非表示中は停止して電池を節約） ----
/** @type {ReturnType<typeof setTimeout> | undefined} */
let timerId;

function scheduleTick() {
  clearTimeout(timerId);
  const now = Date.now();
  dashboard.tick(now);
  timerId = setTimeout(scheduleTick, 1000 - (now % 1000) + 5);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(timerId);
  else scheduleTick();
});
scheduleTick();

setupInstallHint();

// ---- Service Worker（オフライン起動・PWA インストール要件） ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}
