export function createDocGeneratorMixin() {
  return {
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
