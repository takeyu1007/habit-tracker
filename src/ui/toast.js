// @ts-check
/**
 * 画面下部の一時メッセージ。
 */

const region = /** @type {HTMLElement} */ (document.getElementById('toast-region'));

/**
 * @param {string} message
 * @param {{ type?: 'info' | 'error', duration?: number }} [opts]
 */
export function showToast(message, opts = {}) {
  const { type = 'info', duration = 3200 } = opts;
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  el.textContent = message;
  region.append(el);

  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // アニメーション無効環境向けの保険
    setTimeout(() => el.remove(), 400);
  }, duration);
}
