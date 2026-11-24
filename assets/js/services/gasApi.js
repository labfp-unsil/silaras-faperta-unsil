import { CONFIG } from '../config/constants.js';

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

      const endpointUrl = this.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL;
      const anonKey = this.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY;

      return new Promise((resolve, reject) => {
        if (!endpointUrl) {
          finishLoading();
          reject(new Error('URL Endpoint Supabase Edge Function belum dikonfigurasi di constants.js.'));
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
        };
        if (anonKey) {
          headers['apikey'] = anonKey;
          headers['Authorization'] = `Bearer ${anonKey}`;
        }

        fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: fnName, args: args })
        })
          .then(async (r) => {
            const text = await r.text();
            let res;
            try {
              res = JSON.parse(text);
            } catch (_) {
              throw new Error(`Respons server tidak valid (HTTP ${r.status}): ${text.slice(0, 150)}`);
            }
            return res;
          })
          .then((res) => {
            finishLoading();
            if (res && res.success === false) {
              const errMsg = res.message || 'Terjadi kesalahan pada server.';
              if (res.code === 'SESSION_EXPIRED' || this.isSessionExpiredError(errMsg)) {
                this.handleSessionExpired(errMsg);
              }
              reject(new Error(errMsg));
              return;
            }
            resolve(res);
          })
          .catch((err) => {
            finishLoading();
            const errMsg = (err && err.message) ? err.message : 'Gagal terhubung ke server Supabase.';
            if (this.isSessionExpiredError(errMsg)) {
              this.handleSessionExpired(errMsg);
            }
            reject(new Error(errMsg));
          });
      });
    }
  };
}