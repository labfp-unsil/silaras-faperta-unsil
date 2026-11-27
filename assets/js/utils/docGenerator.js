export function createDocGeneratorMixin() {
  return {
    async getUnsilLogoDataUrl() {
      if (this._unsilLogoDataUrl) return this._unsilLogoDataUrl;
      try {
        const logoUrl = new URL('./assets/img/logo-unsil.png', window.location.href).href;
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = 'anonymous';
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = logoUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 88;
        canvas.height = 88;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 88, 88);
        this._unsilLogoDataUrl = canvas.toDataURL('image/png');
        return this._unsilLogoDataUrl;
      } catch (_) {
        return new URL('./assets/img/logo-unsil.png', window.location.href).href;
      }
    },

    async buildEquipmentLoanDocPayload(loan) {
      if (!loan) return null;
      const logoSrc = await this.getUnsilLogoDataUrl();
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const formatDateIndo = (ymd) => {
        const raw = String(ymd || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '-';
        const [y, m, d] = raw.split('-');
        return `${Number(d)} ${months[Number(m) - 1] || m} ${y}`;
      };

      const today = new Date();
      const tanggalCetak = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      const prof = loan.borrower_profile || {};
      const fallbackUser = (this.adminData?.users || []).find(
        (u) => u.user_id === loan.user_id || (u.full_name && u.full_name === loan.borrower_name)
      ) || {};

      const namaPeminjam = prof.full_name || fallbackUser.full_name || loan.borrower_name || '-';
      const nimNip = prof.nim_nip || fallbackUser.nim_nip || '-';
      const unitProdi = prof.unit_prodi || fallbackUser.unit_prodi || '-';
      const emailPeminjam = prof.email || fallbackUser.email || '-';
      const phonePeminjam = prof.phone || fallbackUser.phone || '-';
      const namaLab = loan.lab_name || loan.lab_id || 'Laboratorium Fakultas Pertanian';
      const labInfo = (this.publicData?.labs || this.adminData?.labs || []).find((lb) => lb.lab_id === loan.lab_id) || {};
      const jabatanPenyetuju = labInfo.approver_role || 'Kepala Laboratorium';
      const labelJabatanTtd = jabatanPenyetuju === 'Wakil Dekan Bidang Akademik'
        ? 'Wakil Dekan Bidang Akademik'
        : `Kepala ${namaLab}`;
      const namaPejabatPenyetuju = labInfo.pic_name || '....................................................';
      const namaLaboran = labInfo.laboran_name || '........................................';

      const itemsList = typeof this.uniqueLoanItems === 'function'
        ? this.uniqueLoanItems(loan.items || [])
        : (loan.items || []);

      const rowsHtml = itemsList.length > 0
        ? itemsList.map((it, idx) => {
            const qty = Number(it.qty_requested ?? it.qty ?? 0);
            const unit = it.unit || 'Unit';
            const kondisi = it.condition_before || it.condition_status || 'Baik';
            return `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${it.item_id || '-'}</td>
                <td><b>${it.item_name || '-'}</b></td>
                <td style="text-align:center;">${qty} ${unit}</td>
                <td style="text-align:center;">${kondisi}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="5" style="text-align:center;">Tidak ada rincian peralatan.</td></tr>`;

      const statusDisplay = (!loan.status || ['pending_verification', 'verified_laboran'].includes(loan.status))
        ? 'borrowed'
        : loan.status;

      const htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Formulir Peminjaman Peralatan Laboratorium - ${loan.loan_id || ''}</title>
        <style>
          @page { size: A4; margin: 1.5cm 1.8cm 1.5cm 1.8cm; }
          body { font-family: 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.38; margin: 0; color: #000; }
          table.kop-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #000; margin-bottom: 14px; }
          table.kop-table td { vertical-align: middle; padding-bottom: 8px; }
          .kop-text { text-align: center; }
          .kop-kementerian { font-size: 12pt; font-weight: bold; margin: 0; letter-spacing: 0.2px; }
          .kop-univ { font-size: 14pt; font-weight: bold; margin: 1px 0; }
          .kop-fak { font-size: 13pt; font-weight: bold; margin: 1px 0 3px 0; }
          .kop-alamat { font-size: 9pt; margin: 0; line-height: 1.25; }
          .title { text-align: center; font-weight: bold; text-decoration: underline; margin: 12px 0 2px 0; font-size: 12.5pt; }
          .nomor { text-align: center; margin-bottom: 14px; font-size: 11pt; }
          p.intro { margin: 8px 0 6px 0; }
          table.info { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11pt; }
          table.info td { padding: 2.5px 4px; vertical-align: top; }
          table.data { width: 100%; border-collapse: collapse; margin: 8px 0 12px 0; }
          table.data thead { display: table-header-group; }
          table.data tr { page-break-inside: avoid; break-inside: avoid; }
          table.data th, table.data td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 10.5pt; }
          table.data th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
          .closing-block { page-break-inside: avoid; break-inside: avoid; }
          .status-box { border: 1px solid #000; background-color: #f8fafc; padding: 8px 10px; margin: 10px 0 16px 0; font-size: 10.5pt; text-align: justify; page-break-inside: avoid; break-inside: avoid; }
          table.ttd { width: 100%; margin-top: 12px; text-align: center; font-size: 10.5pt; page-break-inside: avoid; break-inside: avoid; }
          table.ttd tr { page-break-inside: avoid; break-inside: avoid; }
          table.ttd td { width: 33.3%; vertical-align: top; padding: 0 4px; }
        </style>
        </head>
        <body>
          <table class="kop-table">
            <tr>
              <td style="width: 92px; text-align: center;">
                <img src="${logoSrc}" width="84" height="84" alt="Logo UNSIL" />
              </td>
              <td class="kop-text">
                <p class="kop-kementerian">KEMENTERIAN PENDIDIKAN TINGGI,<br/>SAINS, DAN TEKNOLOGI</p>
                <p class="kop-univ">UNIVERSITAS SILIWANGI</p>
                <p class="kop-fak">FAKULTAS PERTANIAN</p>
                <p class="kop-alamat">
                  Kampus 2, Jalan Tamansari, Kelurahan Mugarsari, Kecamatan Tamansari<br/>
                  Kota Tasikmalaya, Kode Pos 46191<br/>
                  Telepon (0265) 330634, 333092 Faksimil (0265) 325812<br/>
                  Laman: http://unsil.ac.id/fakultas/fakultas-pertanian/ Pos-el: fp@unsil.ac.id
                </p>
              </td>
            </tr>
          </table>

          <div class="title">FORMULIR PEMINJAMAN PERALATAN LABORATORIUM</div>
          <div class="nomor">Nomor Transaksi: <b>${loan.loan_id || '-'}</b></div>

          <p class="intro">Yang bertanda tangan di bawah ini:</p>
          <table class="info">
            <tr><td style="width:165px;">Nama Lengkap</td><td style="width:14px;">:</td><td><b>${namaPeminjam}</b></td></tr>
            <tr><td>NIM / NIP</td><td>:</td><td>${nimNip}</td></tr>
            <tr><td>Unit / Program Studi</td><td>:</td><td>${unitProdi}</td></tr>
            <tr><td>Email / No. HP</td><td>:</td><td>${emailPeminjam} / ${phonePeminjam}</td></tr>
            <tr><td>Laboratorium Tujuan</td><td>:</td><td><b>${namaLab}</b></td></tr>
            <tr><td>Tanggal Peminjaman</td><td>:</td><td>${formatDateIndo(loan.loan_date)} s.d. ${formatDateIndo(loan.due_date)}</td></tr>
            <tr><td>Tujuan Peminjaman</td><td>:</td><td>${loan.purpose || '-'}</td></tr>
          </table>

          <p class="intro">Mengajukan permohonan peminjaman peralatan laboratorium dengan rincian sebagai berikut:</p>
          <table class="data">
            <thead>
              <tr>
                <th style="width:36px;">No</th>
                <th style="width:95px;">Kode Barang</th>
                <th>Nama Peralatan</th>
                <th style="width:88px;">Jumlah</th>
                <th style="width:95px;">Kondisi Awal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="closing-block">
            <div class="status-box">
              <b>Status Permohonan:</b> DISETUJUI ${jabatanPenyetuju.toUpperCase()} (<i>${statusDisplay}</i>)<br/>
              Peminjam bertanggung jawab penuh menjaga kebersihan, keamanan, dan keutuhan peralatan selama masa peminjaman hingga dikembalikan ke laboratorium. Jika dalam masa peminjaman terjadi kehilangan atau kerusakan, maka Peminjam bersedia memperbaiki/mengganti sesuai dengan spesifikasi.
            </div>

            <table class="ttd">
              <tr>
                <td>
                  Menyetujui,<br/>${labelJabatanTtd}
                  <br/><br/><br/><br/>
                  <b>( ${namaPejabatPenyetuju} )</b><br/>
                  <i>Disetujui via Sistem SILARAS</i>
                </td>
                <td>
                  Mengetahui / Verifikasi,<br/>Laboran Pengelola
                  <br/><br/><br/><br/>
                  <b>( ${namaLaboran} )</b><br/>
                  <i>Diverifikasi via Sistem SILARAS</i>
                </td>
                <td>
                  Tasikmalaya, ${tanggalCetak}<br/>Peminjam
                  <br/><br/><br/><br/>
                  <b>( ${namaPeminjam} )</b><br/>
                  NIM/NIP. ${nimNip}
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `;

      const utf8Bytes = new TextEncoder().encode('\ufeff' + htmlDoc);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64DataUrl = 'data:application/msword;base64,' + btoa(binary);
      const fileName = `Formulir_Peminjaman_${loan.loan_id || 'SILARAS'}.doc`;
      return { htmlDoc, base64DataUrl, fileName };
    },

    async generateEquipmentLoanDoc(loan) {
      if (!loan) return;
      const now = Date.now();
      const lockKey = String(loan.loan_id || 'SILARAS');
      if (this._lastLoanDocKey === lockKey && now - (this._lastLoanDocTime || 0) < 1200) {
        return;
      }
      this._lastLoanDocKey = lockKey;
      this._lastLoanDocTime = now;

      if (loan.loan_doc_url && /^https?:\/\//i.test(loan.loan_doc_url)) {
        const rawUrl = String(loan.loan_doc_url);
        const idMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const downloadUrl = idMatch && idMatch[1]
          ? `https://drive.google.com/uc?export=download&id=${idMatch[1]}`
          : rawUrl;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.download = `Formulir_Peminjaman_${loan.loan_id || 'SILARAS'}.doc`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
        }, 1500);

        this.showToast('Mengunduh Dokumen Peminjaman dari Google Drive...');
        return;
      }

      const payload = await this.buildEquipmentLoanDocPayload(loan);
      if (!payload) return;

      const blob = new Blob(['\ufeff', payload.htmlDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      this.showToast('Dokumen Peminjaman Peralatan (.doc) berhasil diunduh');
    },

    generateAssetDisposalBA(item) {
      if (!item) return;
      const today = new Date();
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const tanggalStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      const qty = Number(item.qty_total || item.qty_available || 1);
      const unit = item.unit || 'Unit';
      const namaLab = item.location_name || 'Laboratorium Fakultas Pertanian';
      const petugas = this.session?.full_name || 'Laboran / Pengelola Laboratorium';

      const htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Berita Acara Pemeriksaan & Usulan Penghapusan Aset</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
          .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
          .kop h2, .kop h3, .kop p { margin: 2px 0; }
          .title { text-align: center; font-weight: bold; text-decoration: underline; margin: 18px 0 4px 0; font-size: 13pt; }
          .nomor { text-align: center; margin-bottom: 20px; }
          table.data { width: 100%; border-collapse: collapse; margin: 16px 0; }
          table.data th, table.data td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11pt; }
          table.data th { background-color: #f0f0f0; }
          table.ttd { width: 100%; margin-top: 40px; text-align: center; }
          table.ttd td { width: 50%; vertical-align: top; }
        </style>
        </head>
        <body>
          <div class="kop">
            <h3>KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI</h3>
            <h2>UNIVERSITAS SILIWANGI</h2>
            <h3>FAKULTAS PERTANIAN</h3>
            <p style="font-size:10pt;">Jalan Siliwangi No. 24 Kotak Pos 164 Tasikmalaya 46115</p>
          </div>

          <div class="title">BERITA ACARA PEMERIKSAAN KONDISI & USULAN PENGHAPUSAN ASET LABORATORIUM</div>
          <div class="nomor">Nomor: ....../UN58.04/LL/BA/${today.getFullYear()}</div>

          <p>Pada hari ini, tanggal <b>${tanggalStr}</b>, bertempat di <b>${namaLab}</b> Fakultas Pertanian Universitas Siliwangi, telah dilakukan pemeriksaan fisik dan kelayakan operasional terhadap barang inventaris laboratorium dengan rincian sebagai berikut:</p>

          <table class="data">
            <thead>
              <tr>
                <th>No</th>
                <th>Kode Barang</th>
                <th>Nama Peralatan & Spesifikasi</th>
                <th>Tahun / BMN</th>
                <th>Jumlah</th>
                <th>Status Kondisi</th>
                <th>Keterangan Kerusakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;">1</td>
                <td>${item.item_id || '-'}</td>
                <td><b>${item.item_name || '-'}</b><br/>${item.maker_type_spec || '-'}</td>
                <td>${item.acquisition_year || '-'} / ${item.bmn_category || '-'}</td>
                <td>${qty} ${unit}</td>
                <td><b>${item.condition_status || 'Rusak Berat'}</b></td>
                <td>${item.damage_notes || 'Mengalami kerusakan teknis dan tidak layak digunakan kembali.'}</td>
              </tr>
            </tbody>
          </table>

          <p>Berdasarkan hasil pemeriksaan teknis di lapangan, peralatan tersebut dinyatakan dalam kondisi <b>${item.condition_status || 'Rusak Berat'}</b> sehingga tidak dapat menunjang kegiatan praktikum maupun penelitian secara optimal, dan diusulkan untuk dilakukan tindak lanjut perbaikan menyeluruh atau proses penghapusan Barang Milik Negara (BMN) sesuai ketentuan yang berlaku.</p>

          <p>Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p>

          <table class="ttd">
            <tr>
              <td>
                Mengetahui,<br/>Kepala ${namaLab}
                <br/><br/><br/><br/><br/>
                ( .................................................... )<br/>
                NIP. ............................................
              </td>
              <td>
                Tasikmalaya, ${tanggalStr}<br/>Petugas Pemeriksa / Laboran
                <br/><br/><br/><br/><br/>
                <b>( ${petugas} )</b><br/>
                NIP/NIK. ....................................
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BA_Penghapusan_Aset_${item.item_id || 'SILARAS'}_${today.toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Dokumen Berita Acara (.doc) berhasil diunduh');
    },

    async exportExcel(type) {
      try {
        const res = await this.runGas('apiExportReportExcel', this.session.token, type, this.session.active_lab_id);
        const link = document.createElement('a');
        link.href = 'data:' + res.mimeType + ';base64,' + res.base64;
        link.download = res.filename;
        link.click();
      } catch (e) { this.showToast(e.message, 'error'); }
    }
  };
}