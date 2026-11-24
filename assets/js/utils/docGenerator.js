import { formatDateIndonesian } from './dateHelper.js';

export function downloadDisposalBeritaAcaraDoc(record, session) {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Berita Acara Penghapusan Aset</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">
      <h3 style="text-align: center; margin-bottom: 4px;">KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI</h3>
      <h3 style="text-align: center; margin-top: 0; margin-bottom: 4px;">UNIVERSITAS SILIWANGI &mdash; FAKULTAS PERTANIAN</h3>
      <hr/>
      <h4 style="text-align: center; text-decoration: underline;">BERITA ACARA PENGHAPUSAN INVENTARIS LABORATORIUM</h4>
      <p>Pada hari ini, <b>${formatDateIndonesian(record.disposal_date || new Date().toISOString().slice(0, 10))}</b>, telah dilakukan pemeriksaan dan penghapusan inventaris peralatan laboratorium dengan rincian sebagai berikut:</p>
      <table border="1" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <tr><td style="width: 35%;"><b>Nama Alat</b></td><td>${record.item_name || '-'}</td></tr>
        <tr><td><b>Merk / Spesifikasi</b></td><td>${record.brand || '-'} ${record.spec ? '(' + record.spec + ')' : ''}</td></tr>
        <tr><td><b>Laboratorium</b></td><td>${record.lab_name || '-'}</td></tr>
        <tr><td><b>Jumlah Dihapuskan</b></td><td>${record.qty || 1} ${record.unit || 'Unit'}</td></tr>
        <tr><td><b>Alasan Penghapusan</b></td><td>${record.reason || 'Rusak berat dan tidak dapat diperbaiki'}</td></tr>
      </table>
      <p>Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.</p>
      <br/>
      <table style="width: 100%; text-align: center; margin-top: 32px;">
        <tr>
          <td style="width: 50%;">Mengetahui,<br/>Kepala Laboratorium<br/><br/><br/><br/>( ........................................ )</td>
          <td style="width: 50%;">Tasikmalaya, ${formatDateIndonesian(new Date().toISOString().slice(0, 10))}<br/>Petugas / Laboran<br/><br/><br/><br/><b>${session?.full_name || '........................................'}</b></td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BA_Penghapusan_${(record.item_name || 'Alat').replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
