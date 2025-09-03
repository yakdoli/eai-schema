// EAI Schema Toolkit - Frontend JavaScript
class EAISchemaApp {
    constructor() {
        this.apiUrl = localStorage.getItem('apiUrl') || 'http://localhost:3001';
        this.currentFileId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupDropZone();
        this.loadFiles();
        this.showToast('애플리케이션이 시작되었습니다.', 'success');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());

        // URL fetch
        document.getElementById('urlInput').addEventListener('input', (e) => this.validateUrl(e.target.value));
        document.getElementById('fetchBtn').addEventListener('click', () => this.fetchFromUrl());

        // Actions
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadFile());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteFile());
        document.getElementById('newUploadBtn').addEventListener('click', () => this.resetUpload());
        document.getElementById('refreshFilesBtn').addEventListener('click', () => this.loadFiles());

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());

        // Modal backdrop click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settingsModal')) {
                this.closeSettings();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    setupTabs() {
        this.switchTab('file-upload');
    }

    setupDropZone() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        // Click to select file
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelect({ target: { files: files } });
            }
        });
    }

    switchTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Reset forms
        this.resetForms();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const uploadBtn = document.getElementById('uploadBtn');

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            this.showToast('파일 크기가 50MB를 초과합니다.', 'error');
            return;
        }

        // Validate file type
        const validTypes = ['.xml', '.json', '.yaml', '.yml'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (!validTypes.includes(fileExtension)) {
            this.showToast('지원되지 않는 파일 형식입니다.', 'error');
            return;
        }

        uploadBtn.disabled = false;
        this.showToast(`파일 선택됨: ${file.name}`, 'success');
    }

    async uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('업로드할 파일을 선택하세요.', 'error');
            return;
        }

        this.showLoading();

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiUrl}/api/upload/file`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.currentFileId = data.data.fileId;
                this.showResults(data.data);
                this.loadFiles();
                this.showToast('파일이 성공적으로 업로드되었습니다.', 'success');
            } else {
                this.showToast(data.message || '업로드에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('서버 연결에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    validateUrl(url) {
        const fetchBtn = document.getElementById('fetchBtn');
        const urlPattern = /^https?:\/\/.+\..+/;

        fetchBtn.disabled = !url || !urlPattern.test(url);
    }

    async fetchFromUrl() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();

        if (!url) {
            this.showToast('URL을 입력하세요.', 'error');
            return;
        }

        this.showLoading();

        try {
            // First validate the URL
            const validateResponse = await fetch(`${this.apiUrl}/api/upload/validate-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const validateData = await validateResponse.json();

            if (!validateData.success) {
                this.showToast(validateData.message || 'URL이 유효하지 않습니다.', 'error');
                return;
            }

            // Now fetch the schema
            const response = await fetch(`${this.apiUrl}/api/upload/url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (data.success) {
                this.currentFileId = data.data.fileId;
                this.showResults(data.data);
                this.loadFiles();
                this.showToast('URL에서 스키마를 성공적으로 가져왔습니다.', 'success');
            } else {
                this.showToast(data.message || 'URL에서 가져오기에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('URL fetch error:', error);
            this.showToast('서버 연결에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loadingContainer').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingContainer').style.display = 'none';
    }

    showResults(fileData) {
        const resultsSection = document.getElementById('resultsSection');
        const fileInfoCard = document.getElementById('fileInfoCard');

        // Format file size
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Format date
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleString('ko-KR');
        };

        fileInfoCard.innerHTML = `
            <div class="file-info-item">
                <span class="file-info-label">파일 이름:</span>
                <span class="file-info-value">${fileData.originalName}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">파일 크기:</span>
                <span class="file-info-value">${formatFileSize(fileData.size)}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">MIME 타입:</span>
                <span class="file-info-value">${fileData.mimetype}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">업로드 시간:</span>
                <span class="file-info-value">${formatDate(fileData.uploadedAt)}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">만료 시간:</span>
                <span class="file-info-value">${formatDate(fileData.expiresAt)}</span>
            </div>
            ${fileData.sourceUrl ? `
            <div class="file-info-item">
                <span class="file-info-label">소스 URL:</span>
                <span class="file-info-value"><a href="${fileData.sourceUrl}" target="_blank">${fileData.sourceUrl}</a></span>
            </div>` : ''}
        `;

        resultsSection.style.display = 'block';
    }

    async downloadFile() {
        if (!this.currentFileId) {
            this.showToast('다운로드할 파일이 없습니다.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/upload/file/${this.currentFileId}/content`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'schema';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showToast('파일이 다운로드되었습니다.', 'success');
            } else {
                this.showToast('다운로드에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async deleteFile() {
        if (!this.currentFileId) {
            this.showToast('삭제할 파일이 없습니다.', 'error');
            return;
        }

        if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/upload/file/${this.currentFileId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('파일이 삭제되었습니다.', 'success');
                this.resetUpload();
                this.loadFiles();
            } else {
                this.showToast(data.message || '삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    resetUpload() {
        this.currentFileId = null;
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('loadingContainer').style.display = 'none';
        this.resetForms();
    }

    resetForms() {
        document.getElementById('fileInput').value = '';
        document.getElementById('urlInput').value = '';
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('fetchBtn').disabled = true;
    }

    async loadFiles() {
        try {
            const response = await fetch(`${this.apiUrl}/api/upload/files`);
            const data = await response.json();

            const filesContainer = document.getElementById('filesContainer');

            if (data.success && data.data.length > 0) {
                filesContainer.innerHTML = data.data.map(file => this.createFileItem(file)).join('');
            } else {
                filesContainer.innerHTML = '<p class="no-files">업로드된 파일이 없습니다.</p>';
            }
        } catch (error) {
            console.error('Load files error:', error);
            document.getElementById('filesContainer').innerHTML = '<p class="no-files">파일 목록을 불러올 수 없습니다.</p>';
        }
    }

    createFileItem(file) {
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleString('ko-KR');
        };

        return `
            <div class="file-item">
                <div class="file-item-info">
                    <h4>${file.originalName}</h4>
                    <div class="file-item-meta">
                        크기: ${formatFileSize(file.size)} |
                        타입: ${file.mimetype} |
                        업로드: ${formatDate(file.uploadedAt)}
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn btn-secondary" onclick="app.downloadFileById('${file.fileId}')">
                        <i class="fas fa-download"></i> 다운로드
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteFileById('${file.fileId}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `;
    }

    async downloadFileById(fileId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}/content`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'schema';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showToast('파일이 다운로드되었습니다.', 'success');
            } else {
                this.showToast('다운로드에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async deleteFileById(fileId) {
        if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('파일이 삭제되었습니다.', 'success');
                this.loadFiles();
            } else {
                this.showToast(data.message || '삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    openSettings() {
        document.getElementById('apiUrl').value = this.apiUrl;
        document.getElementById('settingsModal').style.display = 'flex';
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    saveSettings() {
        const apiUrl = document.getElementById('apiUrl').value.trim();

        if (!apiUrl) {
            this.showToast('API URL을 입력하세요.', 'error');
            return;
        }

        // Remove trailing slash
        this.apiUrl = apiUrl.replace(/\/$/, '');
        localStorage.setItem('apiUrl', this.apiUrl);

        this.showToast('설정이 저장되었습니다.', 'success');
        this.closeSettings();
        this.loadFiles(); // Reload files with new API URL
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
        toastMessage.textContent = message;

        // Remove existing type classes and add new one
        toast.className = `toast ${type}`;

        // Show toast
        toast.classList.add('show');

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EAISchemaApp();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
}
