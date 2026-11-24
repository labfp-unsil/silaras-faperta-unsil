export function createGasApiMixin() {
  return {
    runGas(fnName, ...args) {
          return this.callGasTransport_(fnName, args, true);
        },

    runGasSilent(fnName, ...args) {
          return this.callGasTransport_(fnName, args, false);
        },

    callGasTransport_(fnName, args = [], showLoader = true) {
          if (showLoader) {
            this.loading = true;
            this.loadingText = 'Memproses permintaan...';
          } else {
            this.syncing = true;
          }

          const finishLoading = () => {
            if (showLoader) this.loading = false;
            this.syncing = false;
          };

          return new Promise((resolve, reject) => {
            // 1. Jika berjalan di dalam lingkungan Google Apps Script (google.script.run tersedia)
            if (typeof window.google !== 'undefined' && window.google.script && window.google.script.run) {
              window.google.script.run
                .withSuccessHandler((res) => {
                  finishLoading();
                  if (res && res.success === false) {
                    const errMsg = res.message || 'Terjadi kesalahan pada server.';
                    if (this.isSessionExpiredError(errMsg)) {
                      this.handleSessionExpired(errMsg);
                    }
                    reject(new Error(errMsg));
                    return;
                  }
                  resolve(res);
                })
                .withFailureHandler((err) => {
                  finishLoading();
                  const errMsg = (err && err.message) ? err.message : String(err || 'Gagal terhubung ke server GAS');
                  if (this.isSessionExpiredError(errMsg)) {
                    this.handleSessionExpired(errMsg);
                  }
                  reject(new Error(errMsg));
                })[fnName](...args);
              return;
            }

            // 2. Fallback jika file HTML dibuka di luar GAS (menggunakan fetch ke URL Web App doPost)
            if (this.GAS_WEB_APP_URL) {
              fetch(this.GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: fnName, args: args })
              })
                .then(r => r.json())
                .then(res => {
                  finishLoading();
                  if (res && res.success === false) {
                    const errMsg = res.message || 'Terjadi kesalahan pada server.';
                    if (this.isSessionExpiredError(errMsg)) {
                      this.handleSessionExpired(errMsg);
                    }
                    reject(new Error(errMsg));
                    return;
                  }
                  resolve(res);
                })
                .catch(err => {
                  finishLoading();
                  reject(new Error('Gagal terhubung ke endpoint GAS: ' + err.message));
                });
              return;
            }

            // 3. Jika dibuka lokal tanpa URL Web App dan di luar iframe GAS
            finishLoading();
            reject(new Error('Lingkungan Google Apps Script tidak terdeteksi. Buka aplikasi melalui URL Web App Google Apps Script (/exec) atau isi GAS_WEB_APP_URL.'));
          });
        }
  };
}
