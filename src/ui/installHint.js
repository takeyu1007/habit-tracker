// @ts-check
/**
 * 「ホーム画面に追加」の案内バナー。
 * iOS はインストール API が無いため手順を文章で案内し、Android / PC の Chrome はインストールボタンを出す。
 * ホーム画面に追加すると、iOS Safari の「7日間未使用でデータ削除」の対象外になる点も重要。
 */

const DISMISS_KEY = 'habitTracker.installHintDismissed';

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /** @type {any} */ (navigator).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS 13+ は Mac と同じ UA を返すため、タッチ対応かどうかで判定
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setupInstallHint() {
  if (isStandalone() || isDismissed()) return;

  const banner = $('install-hint');
  const text = $('install-hint-text');
  const installButton = $('install-hint-install');

  $('install-hint-close').addEventListener('click', () => {
    banner.hidden = true;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 保存できなくても閉じるだけで問題ない
    }
  });

  if (isIos()) {
    text.textContent =
      'ホーム画面に追加すると、アプリとして使えてデータも消えにくくなります。Safari の共有ボタン（□↑）→「ホーム画面に追加」';
    banner.hidden = false;
    return;
  }

  /** @type {any} */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    text.textContent = 'ホーム画面に追加すると、アプリとして全画面で使えます。';
    installButton.hidden = false;
    banner.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    banner.hidden = true;
  });
}
