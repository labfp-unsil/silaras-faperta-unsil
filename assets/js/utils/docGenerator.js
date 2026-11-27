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
        const targetRes = 600; // Resolusi tinggi (~508 DPI untuk ukuran cetak 3 x 3 cm)
        const canvas = document.createElement('canvas');
        canvas.width = targetRes;
        canvas.height = targetRes;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetRes, targetRes);
        this._unsilLogoDataUrl = canvas.toDataURL('image/png');
        return this._unsilLogoDataUrl;
      } catch (_) {
        return new URL('./assets/img/logo-unsil.png', window.location.href).href;
      }
    },

    async buildEquipmentLoanDocPayload(loan) {
      if (!loan) return null;
      const jsPDF = window.jspdf?.jsPDF;
      if (!jsPDF) {
        throw new Error('Pustaka jsPDF belum dimuat. Muat ulang halaman dan coba lagi.');
      }

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
      const allLabs = [
        ...(this.dashData?.laboratories || []),
        ...(this.adminData?.labs || []),
        ...(this.publicData?.labs || []),
      ];
      const labInfo = allLabs.find((lb) => lb.lab_id === loan.lab_id || lb.lab_name === namaLab) || {};
      const jabatanPenyetuju = labInfo.approver_role || 'Kepala Laboratorium';
      const labelJabatanTtd = jabatanPenyetuju === 'Wakil Dekan Bidang Akademik'
        ? 'Wakil Dekan Bidang Akademik'
        : `Kepala ${namaLab}`;
      const namaPejabatPenyetuju = labInfo.pic_name || '....................................................';
      const namaLaboran = (labInfo.laboran_name && String(labInfo.laboran_name).trim())
        ? String(labInfo.laboran_name).trim()
        : '........................................';

      const itemsList = typeof this.uniqueLoanItems === 'function'
        ? this.uniqueLoanItems(loan.items || [])
        : (loan.items || []);

      const statusDisplay = (!loan.status || ['pending_verification', 'verified_laboran'].includes(loan.status))
        ? 'borrowed'
        : loan.status;

      // Inisialisasi dokumen PDF A4 (210 x 297 mm)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 18;
      const contentWidth = pageWidth - marginX * 2;
      let y = 14;

      // 1. KOP SURAT + LOGO UNSIL 3 x 3 cm (30 x 30 mm)
      if (logoSrc && logoSrc.startsWith('data:image')) {
        doc.addImage(logoSrc, 'PNG', marginX, y, 30, 30);
      }

      const textCenterX = marginX + 32 + (contentWidth - 32) / 2;
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.text('KEMENTERIAN PENDIDIKAN TINGGI,', textCenterX, y + 4.5, { align: 'center' });
      doc.text('SAINS, DAN TEKNOLOGI', textCenterX, y + 9.2, { align: 'center' });
      doc.setFontSize(13.5);
      doc.text('UNIVERSITAS SILIWANGI', textCenterX, y + 14.5, { align: 'center' });
      doc.setFontSize(12.5);
      doc.text('FAKULTAS PERTANIAN', textCenterX, y + 19.5, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text('Kampus 2, Jalan Tamansari, Kelurahan Mugarsari, Kecamatan Tamansari', textCenterX, y + 23.8, { align: 'center' });
      doc.text('Kota Tasikmalaya, Kode Pos 46191', textCenterX, y + 27.3, { align: 'center' });
      doc.text('Telepon (0265) 330634, 333092 Faksimil (0265) 325812', textCenterX, y + 30.8, { align: 'center' });
      doc.text('Laman: http://unsil.ac.id/fakultas/fakultas-pertanian/ Pos-el: fp@unsil.ac.id', textCenterX, y + 34.3, { align: 'center' });

      y += 37;
      doc.setLineWidth(0.7);
      doc.line(marginX, y, pageWidth - marginX, y);
      doc.setLineWidth(0.25);
      doc.line(marginX, y + 1.1, pageWidth - marginX, y + 1.1);

      // 2. JUDUL & NOMOR TRANSAKSI
      y += 8.5;
      doc.setFont('times', 'bold');
      doc.setFontSize(12.5);
      const titleText = 'FORMULIR PEMINJAMAN PERALATAN LABORATORIUM';
      doc.text(titleText, pageWidth / 2, y, { align: 'center' });
      const titleW = doc.getTextWidth(titleText);
      doc.setLineWidth(0.35);
      doc.line((pageWidth - titleW) / 2, y + 1, (pageWidth + titleW) / 2, y + 1);

      y += 5.5;
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      const nomorPrefix = 'Nomor Transaksi: ';
      const nomorVal = String(loan.loan_id || '-');
      const totalNomorW = doc.getTextWidth(nomorPrefix) + doc.setFont('times', 'bold').getTextWidth(nomorVal);
      const nomorStartX = (pageWidth - totalNomorW) / 2;
      doc.setFont('times', 'normal');
      doc.text(nomorPrefix, nomorStartX, y);
      doc.setFont('times', 'bold');
      doc.text(nomorVal, nomorStartX + doc.getTextWidth(nomorPrefix), y);

      // 3. IDENTITAS PEMINJAM
      y += 8;
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('Yang bertanda tangan di bawah ini:', marginX, y);
      y += 5.5;

      const infoRows = [
        ['Nama Lengkap', namaPeminjam, true],
        ['NIM / NIP', nimNip, false],
        ['Unit / Program Studi', unitProdi, false],
        ['Email / No. HP', `${emailPeminjam} / ${phonePeminjam}`, false],
        ['Laboratorium Tujuan', namaLab, true],
        ['Tanggal Peminjaman', `${formatDateIndo(loan.loan_date)} s.d. ${formatDateIndo(loan.due_date)}`, false],
        ['Tujuan Peminjaman', loan.purpose || '-', false],
      ];

      for (const [label, val, isBold] of infoRows) {
        doc.setFont('times', 'normal');
        doc.text(label, marginX + 1, y);
        doc.text(':', marginX + 46, y);
        doc.setFont('times', isBold ? 'bold' : 'normal');
        const wrappedVal = doc.splitTextToSize(String(val), contentWidth - 50);
        doc.text(wrappedVal, marginX + 49, y);
        y += Math.max(5.5, wrappedVal.length * 5);
      }

      // 4. TABEL RINCIAN PERALATAN (autoTable otomatis mengulang header jika lanjut halaman)
      y += 2;
      doc.setFont('times', 'normal');
      doc.text('Mengajukan permohonan peminjaman peralatan laboratorium dengan rincian sebagai berikut:', marginX, y);
      y += 3;

      const tableBody = itemsList.length > 0
        ? itemsList.map((it, idx) => [
            String(idx + 1),
            String(it.item_id || '-'),
            String(it.item_name || '-'),
            `${Number(it.qty_requested ?? it.qty ?? 0)} ${it.unit || 'Unit'}`,
            String(it.condition_before || it.condition_status || 'Baik'),
          ])
        : [['-', '-', 'Tidak ada rincian peralatan.', '-', '-']];

      doc.autoTable({
        startY: y,
        margin: { left: marginX, right: marginX, top: 15, bottom: 15 },
        head: [['No', 'Kode Barang', 'Nama Peralatan', 'Jumlah', 'Kondisi Awal']],
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 10.5,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          cellPadding: 2.2,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 11 },
          1: { halign: 'left', cellWidth: 27 },
          2: { halign: 'left', fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 26 },
        },
      });

      y = (doc.lastAutoTable?.finalY || y) + 5;

      // Helper pembangkit QR Code Data URL
      const buildQrDataUrl = (textPayload) => {
        try {
          if (typeof window.qrcode !== 'function') return null;
          const qr = window.qrcode(0, 'M');
          qr.addData(String(textPayload));
          qr.make();
          return qr.createDataURL(4, 1);
        } catch (_) {
          return null;
        }
      };

      // Helper penghitung kode checksum unik untuk validasi keaslian dokumen
      const computeDocDigest = (raw) => {
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < raw.length; i++) {
          const ch = raw.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).toUpperCase().padStart(12, '0');
      };

      // Helper menggambar Stempel Digital & QR Code E-Signature Terverifikasi Google pada kolom TTD
      const drawDigitalSignatureStamp = ({
        centerX,
        topY,
        signerName,
        signerRole,
        signerEmail,
        signedAt,
        isSigned,
      }) => {
        if (!isSigned) return;

        const stampW = 54;
        const stampH = 19.5;
        const boxX = centerX - stampW / 2;
        const boxY = topY;

        const cleanTimestamp = signedAt
          ? new Date(signedAt).toLocaleString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : tanggalCetak;

        const normLoanId = String(loan.loan_id || '').trim().toUpperCase();
        const normRole = String(signerRole || '').trim().toLowerCase();
        const normName = String(signerName || '').trim().toLowerCase();
        const normEmail = String(signerEmail || '').trim().toLowerCase();
        const sigHash = computeDocDigest(`${normLoanId}|${normRole}|${normName}|${normEmail}`);

        const verifyUrl = new URL(window.location.origin + window.location.pathname);
        verifyUrl.searchParams.set('verify_doc', normLoanId);
        verifyUrl.searchParams.set('sig', sigHash.slice(0, 10));
        const qrContent = verifyUrl.toString();

        const qrImg = buildQrDataUrl(qrContent);

        // Bingkai stempel elektronik hijau-emerald resmi
        doc.setDrawColor(16, 122, 87);
        doc.setFillColor(244, 251, 248);
        doc.setLineWidth(0.35);
        doc.roundedRect(boxX, boxY, stampW, stampH, 1.5, 1.5, 'FD');

        // QR Code di sisi kiri stempel
        const qrSize = 16.5;
        if (qrImg) {
          doc.addImage(qrImg, 'PNG', boxX + 1.5, boxY + 1.5, qrSize, qrSize);
        }

        // Teks verifikasi Google di sisi kanan QR
        const textX = boxX + qrSize + 2.8;
        const maxTextW = stampW - qrSize - 4.2;

        doc.setTextColor(12, 95, 68);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.text('E-SIGNED VIA GOOGLE', textX, boxY + 4.2);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        const emailLines = doc.splitTextToSize(String(signerEmail || 'Terverifikasi SILARAS'), maxTextW);
        doc.text(emailLines.slice(0, 2), textX, boxY + 7.5);

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(5.3);
        doc.text(`Wkt: ${cleanTimestamp}`, textX, boxY + 13.8);
        doc.setFont('courier', 'bold');
        doc.text(`ID:${sigHash.slice(0, 10)}`, textX, boxY + 17.2);

        // Kembalikan warna teks default hitam
        doc.setTextColor(0, 0, 0);
      };

      // 5. KOTAK STATUS + BLOK TANDA TANGAN + STEMPEL DIGITAL (DIKUNCI UTUH AGAR TIDAK PERNAH TERPOTONG)
      const statusBodyText = 'Peminjam bertanggung jawab penuh menjaga kebersihan, keamanan, dan keutuhan peralatan selama masa peminjaman hingga dikembalikan ke laboratorium. Jika dalam masa peminjaman terjadi kehilangan atau kerusakan, maka Peminjam bersedia memperbaiki/mengganti sesuai dengan spesifikasi.';
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const wrappedStatus = doc.splitTextToSize(statusBodyText, contentWidth - 6);
      const statusBoxHeight = 8 + wrappedStatus.length * 4.4;

      const jabatanLines = doc.splitTextToSize(labelJabatanTtd, 54);
      const headerTtdLines = Math.max(2, 1 + jabatanLines.length);
      const stampAreaHeight = 22.5;
      const ttdBlockHeight = headerTtdLines * 4.6 + stampAreaHeight + 11;
      const totalClosingHeight = statusBoxHeight + 6 + ttdBlockHeight;

      // Jika sisa ruang di halaman saat ini tidak cukup untuk seluruh kotak status + tanda tangan, pindah utuh ke halaman baru
      if (y + totalClosingHeight > pageHeight - 15) {
        doc.addPage();
        y = 18;
      }

      // Gambar kotak status
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.rect(marginX, y, contentWidth, statusBoxHeight, 'FD');

      let sy = y + 4.8;
      doc.setFont('times', 'bold');
      doc.text('Status Permohonan: ', marginX + 3, sy);
      const statusLabelW = doc.getTextWidth('Status Permohonan: ');
      doc.setFont('times', 'normal');
      doc.text(`DISETUJUI ${jabatanPenyetuju.toUpperCase()} (${statusDisplay})`, marginX + 3 + statusLabelW, sy);

      sy += 4.8;
      doc.text(wrappedStatus, marginX + 3, sy);

      // Gambar 3 kolom tanda tangan (utuh dalam 1 halaman)
      const ttdTopY = y + statusBoxHeight + 7;
      const colW = contentWidth / 3;
      const col1X = marginX + colW * 0.5;
      const col2X = marginX + colW * 1.5;
      const col3X = marginX + colW * 2.5;

      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);

      // Kolom 1: Pejabat Penyetuju
      doc.text('Menyetujui,', col1X, ttdTopY, { align: 'center' });
      doc.text(jabatanLines, col1X, ttdTopY + 4.6, { align: 'center' });

      // Kolom 2: Laboran Pengelola
      doc.text('Mengetahui / Verifikasi,', col2X, ttdTopY, { align: 'center' });
      doc.text('Laboran Pengelola', col2X, ttdTopY + 4.6, { align: 'center' });

      // Kolom 3: Peminjam
      doc.text(`Tasikmalaya, ${tanggalCetak}`, col3X, ttdTopY, { align: 'center' });
      doc.text('Peminjam', col3X, ttdTopY + 4.6, { align: 'center' });

      // Cari data email Google verifikator & penyetuju dari daftar users jika tersedia
      const allUsers = this.adminData?.users || [];
      const approverName = loan.approved_by || loan.wd_approved_by || namaPejabatPenyetuju;
      const approverUser = allUsers.find((u) => u.full_name === approverName) || {};
      const verifierName = loan.verified_by || namaLaboran;
      const verifierUser = allUsers.find((u) => u.full_name === verifierName) || {};

      const isApprovedSigned = ['approved', 'approved_kalab', 'borrowed', 'return_requested', 'returned_partial', 'returned'].includes(String(statusDisplay));
      const isVerifiedSigned = Boolean(loan.verified_by || loan.verified_at || isApprovedSigned);
      const isBorrowerSigned = true;

      const stampTopY = ttdTopY + headerTtdLines * 4.6 + 1.2;

      // Stempel E-Signature Kolom 1 (Kepala Lab / WD)
      drawDigitalSignatureStamp({
        centerX: col1X,
        topY: stampTopY,
        signerName: approverName,
        signerRole: jabatanPenyetuju,
        signerEmail: approverUser.email || labInfo.pic_email || 'kalab.fp@unsil.ac.id',
        signedAt: loan.approved_at || loan.handover_at || loan.updated_at,
        isSigned: isApprovedSigned,
      });

      // Stempel E-Signature Kolom 2 (Laboran)
      drawDigitalSignatureStamp({
        centerX: col2X,
        topY: stampTopY,
        signerName: verifierName,
        signerRole: 'Laboran Pengelola',
        signerEmail: verifierUser.email || 'laboran.fp@unsil.ac.id',
        signedAt: loan.verified_at || loan.approved_at || loan.created_at,
        isSigned: isVerifiedSigned,
      });

      // Stempel E-Signature Kolom 3 (Peminjam)
      drawDigitalSignatureStamp({
        centerX: col3X,
        topY: stampTopY,
        signerName: namaPeminjam,
        signerRole: 'Peminjam',
        signerEmail: emailPeminjam,
        signedAt: loan.created_at,
        isSigned: isBorrowerSigned,
      });

      // Baris Nama & Keterangan di bawah stempel QR
      const nameY = stampTopY + stampAreaHeight + 3.2;
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`( ${approverName} )`, col1X, nameY, { align: 'center' });
      doc.text(`( ${verifierName} )`, col2X, nameY, { align: 'center' });
      doc.text(`( ${namaPeminjam} )`, col3X, nameY, { align: 'center' });

      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.text('Ditandatangani Elektronik (Google Auth)', col1X, nameY + 4.2, { align: 'center' });
      doc.text('Diverifikasi Elektronik (Google Auth)', col2X, nameY + 4.2, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.text(`NIM/NIP. ${nimNip}`, col3X, nameY + 4.2, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
      let binary = '';
      for (let i = 0; i < pdfBytes.length; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const base64DataUrl = 'data:application/pdf;base64,' + btoa(binary);
      const fileName = `Formulir_Peminjaman_${loan.loan_id || 'SILARAS'}.pdf`;
      return { pdfBlob, base64DataUrl, fileName };
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
        a.download = `Formulir_Peminjaman_${loan.loan_id || 'SILARAS'}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
        }, 1500);

        this.showToast('Mengunduh Dokumen Peminjaman (.pdf) dari Google Drive...');
        return;
      }

      const payload = await this.buildEquipmentLoanDocPayload(loan);
      if (!payload) return;

      const url = URL.createObjectURL(payload.pdfBlob);
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
      this.showToast('Dokumen Peminjaman Peralatan (.pdf) berhasil diunduh');
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