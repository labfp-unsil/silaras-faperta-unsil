export function createPublicModule() {
  return {
    publicData: { labs: [], catalog: [], schedules: [] },

    publicLoading: true,

    publicCatalogSearch: '',

    publicCatalogView: 'grid',

    publicCatalogPage: 1,

    publicCatalogPerPage: 12,

    pubFilterLab: '',

    pubFilterType: '',

    pubFilterDate: '',

    pubFilterSearch: '',

    calendarMode: 'month',

    calendarAnchorDate: new Date().toISOString().slice(0, 10),

    selectedCalendarDate: new Date().toISOString().slice(0, 10),

    async loadPublicHome() {
          this.publicLoading = true;
          try {
            const res = await this.runGasSilent('apiGetPublicHomeData');
            this.publicData = {
              labs: res.labs || [],
              catalog: res.catalog || [],
              schedules: (res.schedules || []).map(s => ({
                ...s,
                booking_date: this.normalizeYMD(s.booking_date)
              }))
            };
            this.publicCatalogPage = 1;
          } catch (e) {
            console.warn(e.message);
          } finally {
            this.publicLoading = false;
          }
        },

    filteredPublicCatalog() {
          const q = this.publicCatalogSearch.toLowerCase().trim();
          const list = this.publicData.catalog || [];
          if (!q) return list;
          return list.filter(x =>
            (x.item_name || '').toLowerCase().includes(q) ||
            (x.laboratories || '').toLowerCase().includes(q) ||
            (x.maker_type_spec || '').toLowerCase().includes(q)
          );
        },

    publicCatalogTotalPages() {
          const total = this.filteredPublicCatalog().length;
          return Math.max(1, Math.ceil(total / this.publicCatalogPerPage));
        },

    paginatedPublicCatalog() {
          const list = this.filteredPublicCatalog();
          const totalPages = Math.max(1, Math.ceil(list.length / this.publicCatalogPerPage));
          if (this.publicCatalogPage > totalPages) {
            this.publicCatalogPage = totalPages;
          }
          const start = (this.publicCatalogPage - 1) * this.publicCatalogPerPage;
          return list.slice(start, start + this.publicCatalogPerPage);
        },

    goToPublicCatalogPage(page) {
          const totalPages = this.publicCatalogTotalPages();
          const target = Math.min(Math.max(1, Number(page) || 1), totalPages);
          this.publicCatalogPage = target;
          const el = document.getElementById('katalog-publik');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

    getPublicCatalogPageNumbers() {
          const total = this.publicCatalogTotalPages();
          const current = this.publicCatalogPage;
          if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
          }
          const pages = [];
          if (current <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', total);
          } else if (current >= total - 3) {
            pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
          } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', total);
          }
          return pages;
        },

    filteredPublicSchedules() {
          return (this.publicData.schedules || []).filter(s => {
            if (s.status !== 'Terkonfirmasi') return false;
            if (this.pubFilterLab && s.lab_id !== this.pubFilterLab) return false;
            if (this.pubFilterType && s.activity_type !== this.pubFilterType) return false;
            if (this.pubFilterDate && this.normalizeYMD(s.booking_date) !== this.pubFilterDate) return false;
            if (this.pubFilterSearch) {
              const q = this.pubFilterSearch.toLowerCase();
              const hay = `${s.activity_title} ${s.pic_display} ${s.lab_name}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
        },

    getCalendarEventsForDate(dateStr) {
          const targetYMD = this.normalizeYMD(dateStr);
          return (this.publicData.schedules || []).filter(s => {
            if (this.normalizeYMD(s.booking_date) !== targetYMD) return false;
            if (this.pubFilterLab && s.lab_id !== this.pubFilterLab) return false;
            return true;
          }).sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
        },

    getSelectedDateEvents() {
          return this.getCalendarEventsForDate(this.selectedCalendarDate);
        },

    formatShortEventPill(ev) {
          const start = String(ev.start_time || '').slice(0, 5);
          if (ev.status === 'Proses Pengajuan') return `${start} Proses`;
          const prefix = ev.activity_type === 'Praktikum' ? 'Prak:' : (ev.activity_type === 'Penelitian' ? 'Pen:' : '');
          return `${start} ${prefix} ${ev.activity_title}`.trim();
        },

    getEventBadgeClass(ev) {
          if (ev.status === 'Proses Pengajuan') {
            return 'bg-amber-100 text-amber-900 border border-amber-300';
          }
          if (ev.activity_type === 'Praktikum') {
            return 'bg-[#064E3B] text-white';
          }
          if (ev.activity_type === 'Penelitian') {
            return 'bg-[#84CC16] text-emerald-950';
          }
          return 'bg-[#0284C7] text-white';
        },

    getEventCardClass(ev) {
          if (ev.status === 'Proses Pengajuan') {
            return 'bg-amber-50 border border-amber-300 text-amber-950';
          }
          if (ev.activity_type === 'Praktikum') {
            return 'bg-[#064E3B] text-white';
          }
          if (ev.activity_type === 'Penelitian') {
            return 'bg-[#84CC16] text-emerald-950';
          }
          return 'bg-[#0284C7] text-white';
        },

    verifyModal: {
      open: false,
      tab: 'manual', // 'manual' | 'camera'
      loanId: '',
      sigId: '',
      loading: false,
      result: null,
      error: '',
      scanning: false,
      scanStream: null,
      scanTimer: null,
    },

    initPublicUrlVerifier() {
      try {
        const params = new URLSearchParams(window.location.search);
        const docParam = params.get('verify_doc') || params.get('doc');
        const sigParam = params.get('sig') || params.get('sig_id');
        if (docParam || sigParam) {
          this.openVerifyModal({
            loanId: docParam || '',
            sigId: sigParam || '',
            autoSubmit: true,
          });
        }
      } catch (_) {}
    },

    openVerifyModal(opts = {}) {
      this.stopQrScanner();
      this.verifyModal = {
        open: true,
        tab: opts.tab || 'manual',
        loanId: String(opts.loanId || '').trim(),
        sigId: String(opts.sigId || '').trim(),
        loading: false,
        result: null,
        error: '',
        scanning: false,
        scanStream: null,
        scanTimer: null,
      };
      if (opts.autoSubmit && (this.verifyModal.loanId || this.verifyModal.sigId)) {
        this.submitVerifyDocument();
      } else if (this.verifyModal.tab === 'camera') {
        this.$nextTick(() => this.startQrScanner());
      }
    },

    closeVerifyModal() {
      this.stopQrScanner();
      this.verifyModal.open = false;
    },

    parseScannedQrPayload(rawText) {
      const raw = String(rawText || '').trim();
      if (!raw) return { loanId: '', sigId: '' };

      // 1. Jika format URL (?verify_doc=...&sig=...)
      try {
        const u = new URL(raw);
        const doc = u.searchParams.get('verify_doc') || u.searchParams.get('doc') || '';
        const sig = u.searchParams.get('sig') || u.searchParams.get('sig_id') || '';
        if (doc || sig) return { loanId: doc.trim(), sigId: sig.trim() };
      } catch (_) {}

      // 2. Jika format multi-baris lama (Doc: ... / SigID: ...)
      const docMatch = raw.match(/Doc:\s*([A-Za-z0-9\-_]+)/i);
      const sigMatch = raw.match(/SigID:\s*([A-Fa-f0-9]+)/i);
      if (docMatch || sigMatch) {
        return {
          loanId: docMatch ? docMatch[1].trim() : '',
          sigId: sigMatch ? sigMatch[1].trim() : '',
        };
      }

      // 3. Jika hanya kode SigID hex atau Nomor Transaksi tunggal
      if (/^[A-Fa-f0-9]{10,12}$/.test(raw)) {
        return { loanId: '', sigId: raw.toUpperCase() };
      }
      return { loanId: raw, sigId: '' };
    },

    async submitVerifyDocument() {
      const loanId = String(this.verifyModal.loanId || '').trim();
      const sigId = String(this.verifyModal.sigId || '').trim();
      if (!loanId && !sigId) {
        this.verifyModal.error = 'Masukkan Nomor Transaksi atau Kode SigID terlebih dahulu.';
        return;
      }
      this.verifyModal.loading = true;
      this.verifyModal.error = '';
      this.verifyModal.result = null;
      try {
        const res = await this.runGasSilent('apiVerifyDocumentSignature', loanId, sigId);
        this.verifyModal.result = res;
        if (!res?.valid) {
          this.verifyModal.error = res?.message || 'Tanda tangan dokumen tidak valid.';
        }
      } catch (e) {
        this.verifyModal.error = e.message || 'Gagal memverifikasi dokumen.';
      } finally {
        this.verifyModal.loading = false;
      }
    },

    async startQrScanner() {
      this.stopQrScanner();
      this.verifyModal.tab = 'camera';
      this.verifyModal.error = '';

      if (!navigator.mediaDevices?.getUserMedia) {
        this.verifyModal.error = 'Perangkat/browser ini tidak mendukung akses kamera. Gunakan unggah gambar QR atau input manual.';
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        this.verifyModal.scanStream = stream;
        this.verifyModal.scanning = true;

        await this.$nextTick();
        const video = document.getElementById('silarasQrVideo');
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const detector = 'BarcodeDetector' in window
          ? new window.BarcodeDetector({ formats: ['qr_code'] })
          : null;

        this.verifyModal.scanTimer = setInterval(async () => {
          if (!this.verifyModal.scanning || video.readyState < 2) return;
          try {
            let decodedText = '';
            if (detector) {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0) decodedText = codes[0].rawValue || '';
            } else if (typeof window.jsQR === 'function') {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR(imgData.data, imgData.width, imgData.height);
              if (code?.data) decodedText = code.data;
            }

            if (decodedText) {
              const parsed = this.parseScannedQrPayload(decodedText);
              this.verifyModal.loanId = parsed.loanId;
              this.verifyModal.sigId = parsed.sigId;
              this.stopQrScanner();
              this.verifyModal.tab = 'manual';
              await this.submitVerifyDocument();
            }
          } catch (_) {}
        }, 350);
      } catch (err) {
        this.verifyModal.scanning = false;
        this.verifyModal.error = 'Izin kamera ditolak atau kamera tidak tersedia: ' + (err?.message || '');
      }
    },

    stopQrScanner() {
      if (this.verifyModal?.scanTimer) {
        clearInterval(this.verifyModal.scanTimer);
        this.verifyModal.scanTimer = null;
      }
      if (this.verifyModal?.scanStream) {
        this.verifyModal.scanStream.getTracks().forEach((t) => t.stop());
        this.verifyModal.scanStream = null;
      }
      if (this.verifyModal) {
        this.verifyModal.scanning = false;
      }
    },

    async handleQrImageUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      this.verifyModal.error = '';
      try {
        const imgUrl = URL.createObjectURL(file);
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = imgUrl;
        });

        let decodedText = '';
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const codes = await detector.detect(img);
          if (codes && codes.length > 0) decodedText = codes[0].rawValue || '';
        }
        if (!decodedText && typeof window.jsQR === 'function') {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imgData.data, imgData.width, imgData.height);
          if (code?.data) decodedText = code.data;
        }
        URL.revokeObjectURL(imgUrl);

        if (!decodedText) {
          this.verifyModal.error = 'QR Code tidak terbaca dari gambar tersebut. Pastikan gambar tajam dan tidak terpotong.';
          return;
        }
        const parsed = this.parseScannedQrPayload(decodedText);
        this.verifyModal.loanId = parsed.loanId;
        this.verifyModal.sigId = parsed.sigId;
        this.verifyModal.tab = 'manual';
        await this.submitVerifyDocument();
      } catch (e) {
        this.verifyModal.error = 'Gagal memproses gambar QR: ' + (e?.message || '');
      } finally {
        event.target.value = '';
      }
    },	
  };
}
