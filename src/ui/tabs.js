// @ts-check
/**
 * タブ切り替え（進行中 / 履歴）。
 */

/**
 * @param {(activeTab: 'progress' | 'history') => void} onTabChange
 */
export function setupTabs(onTabChange) {
  const tabProgress = /** @type {HTMLButtonElement} */ (document.getElementById('tab-progress'));
  const tabHistory = /** @type {HTMLButtonElement} */ (document.getElementById('tab-history'));
  const viewProgress = /** @type {HTMLElement} */ (document.getElementById('view-progress'));
  const viewHistory = /** @type {HTMLElement} */ (document.getElementById('view-history'));
  const fabAdd = /** @type {HTMLElement} */ (document.getElementById('fab-add'));

  /** @param {'progress' | 'history'} tab */
  function switchTab(tab) {
    const isProgress = tab === 'progress';
    tabProgress.classList.toggle('is-active', isProgress);
    tabProgress.setAttribute('aria-selected', String(isProgress));
    tabHistory.classList.toggle('is-active', !isProgress);
    tabHistory.setAttribute('aria-selected', String(!isProgress));

    viewProgress.hidden = !isProgress;
    viewHistory.hidden = isProgress;
    if (fabAdd) fabAdd.hidden = !isProgress;

    onTabChange(tab);
  }

  tabProgress.addEventListener('click', () => switchTab('progress'));
  tabHistory.addEventListener('click', () => switchTab('history'));

  return { switchTab };
}

/**
 * タブのバッジ数字を更新する。
 * @param {number} progressCount
 * @param {number} historyCount
 */
export function updateTabBadges(progressCount, historyCount) {
  const bP = document.getElementById('tab-badge-progress');
  const bH = document.getElementById('tab-badge-history');
  if (bP) bP.textContent = String(progressCount);
  if (bH) bH.textContent = String(historyCount);
}
