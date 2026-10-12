// @ts-check
/**
 * タブ切り替え（進行中 / 履歴）。
 */

/**
 * @param {(activeTab: 'progress' | 'history' | 'settings') => void} onTabChange
 */
export function setupTabs(onTabChange) {
  const tabProgress = /** @type {HTMLButtonElement} */ (document.getElementById('tab-progress'));
  const tabHistory = /** @type {HTMLButtonElement} */ (document.getElementById('tab-history'));
  const tabSettings = /** @type {HTMLButtonElement} */ (document.getElementById('tab-settings'));
  const viewProgress = /** @type {HTMLElement} */ (document.getElementById('view-progress'));
  const viewHistory = /** @type {HTMLElement} */ (document.getElementById('view-history'));
  const viewSettings = /** @type {HTMLElement} */ (document.getElementById('view-settings'));
  const fabAdd = /** @type {HTMLElement} */ (document.getElementById('fab-add'));

  /** @param {'progress' | 'history' | 'settings'} tab */
  function switchTab(tab) {
    tabProgress.classList.toggle('is-active', tab === 'progress');
    tabProgress.setAttribute('aria-selected', String(tab === 'progress'));
    tabHistory.classList.toggle('is-active', tab === 'history');
    tabHistory.setAttribute('aria-selected', String(tab === 'history'));
    tabSettings.classList.toggle('is-active', tab === 'settings');
    tabSettings.setAttribute('aria-selected', String(tab === 'settings'));

    viewProgress.hidden = tab !== 'progress';
    viewHistory.hidden = tab !== 'history';
    viewSettings.hidden = tab !== 'settings';

    if (fabAdd) fabAdd.hidden = tab !== 'progress';

    onTabChange(tab);
  }

  tabProgress.addEventListener('click', () => switchTab('progress'));
  tabHistory.addEventListener('click', () => switchTab('history'));
  tabSettings.addEventListener('click', () => switchTab('settings'));

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
