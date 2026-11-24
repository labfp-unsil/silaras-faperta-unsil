import { CONFIG } from '../config/constants.js';

export function isSessionExpiredError(msg) {
  const text = String(msg || '').toLowerCase();
  return (
    text.includes('session_expired') ||
    text.includes('sesi anda telah berakhir') ||
    text.includes('belum login') ||
    text.includes('akun tidak aktif')
  );
}

export function callGasTransport(context, fnName, args = [], showLoader = true) {
  if (showLoader) {
    context.loading = true;
    context.loadingText = 'Memproses permintaan...';
  } else {
    context.syncing = true;
  }

  const finishLoading = () => {
    if (showLoader) context.loading = false;
    context.syncing = false;
  };

  const handleError = (errMsg, reject) => {
    if (isSessionExpiredError(errMsg)) {
      context.handleSessionExpired(errMsg);
    }
    reject(new Error(errMsg));
  };

  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined' && window.google.script?.run) {
      window.google.script.run
        .withSuccessHandler((res) => {
          finishLoading();
          if (res && res.success === false) {
            return handleError(res.message || 'Terjadi kesalahan pada server.', reject);
          }
          resolve(res);
        })
        .withFailureHandler((err) => {
          finishLoading();
          const errMsg = err?.message ? err.message : String(err || 'Gagal terhubung ke server GAS');
          handleError(errMsg, reject);
        })[fnName](...args);
      return;
    }

    if (CONFIG.GAS_WEB_APP_URL) {
      fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: fnName, args }),
      })
        .then((r) => r.json())
        .then((res) => {
          finishLoading();
          if (res && res.success === false) {
            return handleError(res.message || 'Terjadi kesalahan pada server.', reject);
          }
          resolve(res);
        })
        .catch((err) => {
          finishLoading();
          reject(new Error('Gagal terhubung ke endpoint GAS: ' + err.message));
        });
      return;
    }

    finishLoading();
    reject(new Error('URL Web App Google Apps Script belum dikonfigurasi.'));
  });
}
