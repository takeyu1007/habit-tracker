// @ts-check
/**
 * エントリーポイント: ストア生成、UI の結線、毎秒タイマー、Service Worker 登録。
 */

import { createStore } from './store.js';
import { STORAGE_KEY } from './storage.js';
import { createDashboard } from './ui/dashboard.js';
import { createHabitForm } from './ui/habitForm.js';
import { createResetModal } from './ui/resetModal.js';
import { setupInstallHint } from './ui/installHint.js';
import { showToast } from './ui/toast.js';

const store = createStore(localStorage);

const habitForm = createHabitForm({
  onSubmit({ id, title, icon, startedAt }) {
    if (id) {
      store.updateHabit(id, { title, icon, startedAt });
      showToast('保存しました');
    } else {
      store.addHabit({ title, icon, startedAt });
      showToast(`「${title}」の記録を始めました`);
    }
  },
  onDelete(id) {
    const title = store.getHabit(id)?.title ?? '';
    store.deleteHabit(id);
    showToast(`「${title}」を削除しました`);
  },
});

const resetModal = createResetModal({
  onConfirm(id, note) {
    store.resetHabit(id, { note });
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
});

const openAddForm = () => habitForm.open(undefined);
document.getElementById('fab-add')?.addEventListener('click', openAddForm);
document.getElementById('empty-add-button')?.addEventListener('click', openAddForm);

store.subscribe((state) => dashboard.render(state.habits, Date.now()));
store.onSaveError(() =>
  showToast('保存に失敗しました。端末の空き容量を確認してください', { type: 'error', duration: 6000 }),
);
dashboard.render(store.getState().habits, Date.now());

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
