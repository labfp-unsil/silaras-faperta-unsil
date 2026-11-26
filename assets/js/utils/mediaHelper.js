export function createMediaHelperMixin() {
  return {
    sortByItemName(list, order = 'asc') {
          const dir = order === 'desc' ? -1 : 1;
          return [...(list || [])].sort((a, b) => {
            const nameA = String(a?.item_name || '').trim();
            const nameB = String(b?.item_name || '').trim();
            return nameA.localeCompare(nameB, 'id', { sensitivity: 'base', numeric: true }) * dir;
          });
        },

    clearPhotoTarget(target) {
          if (target === 'whIn') {
            this.whInForm.photo_base64 = '';
            this.whInForm.photo_url = '';
          } else if (target === 'whEdit') {
            this.whEditModal.data.photo_base64 = '';
            this.whEditModal.data.photo_url = '';
          } else if (target === 'masterForm') {
            this.masterFormModal.data.photo_base64 = '';
            this.masterFormModal.data.photo_url = '';
          } else if (target === 'invForm') {
            this.invFormModal.data.photo_base64 = '';
            this.invFormModal.data.photo_url = '';
          }
        },

    normalizeDriveImgUrl(url) {
          if (!url) return '';
          const s = String(url).trim();
          if (s.startsWith('data:image')) return s;
          const m =
            s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
            s.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/) ||
            s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (m && m[1]) {
            return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1000';
          }
          return s;
        },

    handleImageFile(event, target) {
          const file = event.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            if (target === 'whIn') this.whInForm.photo_base64 = e.target.result;
            else if (target === 'whEdit') this.whEditModal.data.photo_base64 = e.target.result;
            else if (target === 'masterForm') this.masterFormModal.data.photo_base64 = e.target.result;
            else if (target === 'invForm') this.invFormModal.data.photo_base64 = e.target.result;
          };
          reader.readAsDataURL(file);
        },

    async openCameraModal(target) {
          this.cameraModal.open = true;
          this.cameraModal.target = target;
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            this.cameraModal.stream = stream;
            document.getElementById('silarasCameraVideo').srcObject = stream;
          } catch (e) {
            this.showToast('Kamera tidak dapat diakses: ' + e.message, 'error');
            this.closeCameraModal();
          }
        },

    captureCameraFrame() {
          const video = document.getElementById('silarasCameraVideo');
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (this.cameraModal.target === 'whIn') this.whInForm.photo_base64 = dataUrl;
          else if (this.cameraModal.target === 'whEdit') this.whEditModal.data.photo_base64 = dataUrl;
          else if (this.cameraModal.target === 'masterForm') this.masterFormModal.data.photo_base64 = dataUrl;
          else if (this.cameraModal.target === 'invForm') this.invFormModal.data.photo_base64 = dataUrl;
          this.closeCameraModal();
        },

    closeCameraModal() {
          if (this.cameraModal.stream) {
            this.cameraModal.stream.getTracks().forEach(t => t.stop());
          }
          this.cameraModal = { open: false, target: '', stream: null };
        }
  };
}
