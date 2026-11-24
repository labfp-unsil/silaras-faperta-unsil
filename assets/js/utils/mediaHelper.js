export function normalizeDriveImgUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) {
    return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  }
  return s;
}

export function sortByItemName(list, order = 'asc') {
  const dir = order === 'desc' ? -1 : 1;
  return [...(list || [])].sort((a, b) => {
    const nameA = String(a?.item_name || '').trim();
    const nameB = String(b?.item_name || '').trim();
    return nameA.localeCompare(nameB, 'id', { sensitivity: 'base', numeric: true }) * dir;
  });
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name || 'upload.jpg',
        previewUrl: result,
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}
