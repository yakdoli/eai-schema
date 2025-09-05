/**
 * 드래그 앤 드롭 파일 업로드 컴포넌트
 * 현대적이고 접근성을 고려한 파일 업로드 인터페이스
 */

export interface UploadOptions {
  acceptedTypes: string[];
  maxFileSize: number; // bytes
  maxFiles: number;
  allowMultiple: boolean;
  showPreview: boolean;
}

export interface UploadFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
}

export interface UploadCallbacks {
  onFileAdd?: (files: UploadFile[]) => void;
  onFileRemove?: (fileId: string) => void;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (fileId: string, result: any) => void;
  onUploadError?: (fileId: string, error: string) => void;
  onValidationError?: (file: File, error: string) => void;
}

export class DragDropUploadManager {
  private container: HTMLElement;
  private options: UploadOptions;
  private callbacks: UploadCallbacks;
  private files: Map<string, UploadFile> = new Map();
  private isDragOver = false;
  private dragCounter = 0;

  constructor(
    container: HTMLElement,
    options: Partial<UploadOptions> = {},
    callbacks: UploadCallbacks = {}
  ) {
    this.container = container;
    this.options = {
      acceptedTypes: ['.json', '.xml', '.yaml', '.yml', '.xsd', '.wsdl'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowMultiple: true,
      showPreview: true,
      ...options
    };
    this.callbacks = callbacks;

    this.initialize();
  }

  /**
   * 컴포넌트 초기화
   */
  private initialize(): void {
    this.createUploadInterface();
    this.setupEventListeners();
    this.setupAccessibility();
  }

  /**
   * 업로드 인터페이스 생성
   */
  private createUploadInterface(): void {
    this.container.innerHTML = `
      <div class="drag-drop-upload" role="region" aria-label="파일 업로드 영역">
        <div class="upload-zone" tabindex="0" role="button" aria-describedby="upload-instructions">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div class="upload-text">
            <h3>파일을 드래그하여 업로드하거나 클릭하여 선택하세요</h3>
            <p id="upload-instructions">
              지원 형식: ${this.options.acceptedTypes.join(', ')}<br>
              최대 파일 크기: ${this.formatFileSize(this.options.maxFileSize)}<br>
              최대 파일 수: ${this.options.maxFiles}개
            </p>
          </div>
          <button type="button" class="upload-button" aria-label="파일 선택">
            파일 선택
          </button>
        </div>
        
        <input type="file" 
               class="file-input" 
               ${this.options.allowMultiple ? 'multiple' : ''}
               accept="${this.options.acceptedTypes.join(',')}"
               aria-label="파일 선택 입력"
               style="display: none;">
        
        <div class="upload-progress" style="display: none;" role="status" aria-live="polite">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">업로드 중... 0%</div>
        </div>
        
        <div class="file-list" role="list" aria-label="업로드된 파일 목록">
          <!-- 파일 목록이 여기에 표시됩니다 -->
        </div>
        
        <div class="upload-actions" style="display: none;">
          <button type="button" class="btn-upload-all" aria-label="모든 파일 업로드">
            모든 파일 업로드
          </button>
          <button type="button" class="btn-clear-all" aria-label="모든 파일 제거">
            모두 제거
          </button>
        </div>
      </div>
    `;

    this.applyStyles();
  }

  /**
   * 스타일 적용
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .drag-drop-upload {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .upload-zone {
        border: 2px dashed #cbd5e0;
        border-radius: 12px;
        padding: 40px 20px;
        text-align: center;
        background-color: #f8f9fa;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .upload-zone:hover,
      .upload-zone:focus {
        border-color: #2196f3;
        background-color: #e3f2fd;
        outline: none;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }

      .upload-zone.drag-over {
        border-color: #4caf50;
        background-color: #e8f5e8;
        transform: scale(1.02);
      }

      .upload-zone.drag-over .upload-icon {
        color: #4caf50;
        transform: scale(1.1);
      }

      .upload-icon {
        color: #6c757d;
        margin-bottom: 16px;
        transition: all 0.3s ease;
      }

      .upload-text h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .upload-text p {
        margin: 0 0 20px 0;
        font-size: 14px;
        color: #6c757d;
        line-height: 1.5;
      }

      .upload-button {
        background-color: #2196f3;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .upload-button:hover {
        background-color: #1976d2;
        transform: translateY(-1px);
      }

      .upload-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
      }

      .upload-progress {
        margin-top: 20px;
        padding: 16px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background-color: #2196f3;
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .progress-text {
        font-size: 14px;
        color: #495057;
        text-align: center;
      }

      .file-list {
        margin-top: 20px;
      }

      .file-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background-color: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
      }

      .file-item:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .file-icon {
        width: 32px;
        height: 32px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f8f9fa;
        border-radius: 6px;
        color: #6c757d;
      }

      .file-info {
        flex: 1;
        min-width: 0;
      }

      .file-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-details {
        font-size: 12px;
        color: #6c757d;
      }

      .file-status {
        margin-left: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-icon {
        width: 20px;
        height: 20px;
      }

      .status-icon.success {
        color: #4caf50;
      }

      .status-icon.error {
        color: #f44336;
      }

      .status-icon.uploading {
        color: #2196f3;
        animation: spin 1s linear infinite;
      }

      .file-remove {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .file-remove:hover {
        color: #f44336;
        background-color: #ffebee;
      }

      .file-remove:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3);
      }

      .upload-actions {
        margin-top: 20px;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .btn-upload-all,
      .btn-clear-all {
        padding: 10px 20px;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        background-color: white;
        color: #495057;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .btn-upload-all {
        background-color: #4caf50;
        color: white;
        border-color: #4caf50;
      }

      .btn-upload-all:hover {
        background-color: #45a049;
      }

      .btn-clear-all:hover {
        background-color: #f8f9fa;
        border-color: #adb5bd;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* 반응형 디자인 */
      @media (max-width: 768px) {
        .upload-zone {
          padding: 30px 15px;
          min-height: 150px;
        }

        .upload-text h3 {
          font-size: 16px;
        }

        .upload-text p {
          font-size: 13px;
        }

        .upload-button {
          padding: 10px 20px;
          font-size: 14px;
        }

        .file-item {
          padding: 10px 12px;
        }

        .file-icon {
          width: 28px;
          height: 28px;
        }

        .upload-actions {
          flex-direction: column;
        }
      }

      /* 접근성 개선 */
      .reduced-motion .upload-zone,
      .reduced-motion .upload-icon,
      .reduced-motion .progress-fill,
      .reduced-motion .file-item {
        transition: none;
      }

      .reduced-motion .status-icon.uploading {
        animation: none;
      }

      /* 고대비 모드 */
      .high-contrast .upload-zone {
        border-color: #000;
        background-color: #fff;
      }

      .high-contrast .upload-zone:hover,
      .high-contrast .upload-zone:focus {
        border-color: #0066cc;
        background-color: #f0f8ff;
      }

      .high-contrast .upload-button {
        background-color: #0066cc;
        border: 2px solid #000;
      }

      .high-contrast .file-item {
        border-color: #000;
      }
    `;

    if (!document.getElementById('drag-drop-upload-styles')) {
      style.id = 'drag-drop-upload-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    const uploadZone = this.container.querySelector('.upload-zone') as HTMLElement;
    const fileInput = this.container.querySelector('.file-input') as HTMLInputElement;
    const uploadButton = this.container.querySelector('.upload-button') as HTMLButtonElement;
    const uploadAllBtn = this.container.querySelector('.btn-upload-all') as HTMLButtonElement;
    const clearAllBtn = this.container.querySelector('.btn-clear-all') as HTMLButtonElement;

    // 드래그 앤 드롭 이벤트
    uploadZone.addEventListener('dragenter', this.handleDragEnter.bind(this));
    uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadZone.addEventListener('drop', this.handleDrop.bind(this));

    // 클릭 이벤트
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadButton.addEventListener('click', () => fileInput.click());

    // 키보드 이벤트
    uploadZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });

    // 파일 선택 이벤트
    fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    // 액션 버튼 이벤트
    uploadAllBtn.addEventListener('click', this.uploadAllFiles.bind(this));
    clearAllBtn.addEventListener('click', this.clearAllFiles.bind(this));

    // 전역 드래그 이벤트 (페이지 전체에서 드래그 방지)
    document.addEventListener('dragenter', this.preventDefaultDrag);
    document.addEventListener('dragover', this.preventDefaultDrag);
    document.addEventListener('drop', this.preventDefaultDrag);
  }

  /**
   * 접근성 설정
   */
  private setupAccessibility(): void {
    const uploadZone = this.container.querySelector('.upload-zone') as HTMLElement;
    
    // ARIA 속성 설정
    uploadZone.setAttribute('aria-describedby', 'upload-instructions');
    uploadZone.setAttribute('aria-label', '파일 업로드 영역. 파일을 드래그하거나 클릭하여 선택하세요.');
    
    // 키보드 포커스 표시
    uploadZone.addEventListener('focus', () => {
      uploadZone.classList.add('focus-visible');
    });
    
    uploadZone.addEventListener('blur', () => {
      uploadZone.classList.remove('focus-visible');
    });
  }

  /**
   * 드래그 진입 처리
   */
  private handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    
    if (this.dragCounter === 1) {
      this.setDragOverState(true);
    }
  }

  /**
   * 드래그 오버 처리
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * 드래그 떠남 처리
   */
  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    
    if (this.dragCounter === 0) {
      this.setDragOverState(false);
    }
  }

  /**
   * 드롭 처리
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = 0;
    this.setDragOverState(false);
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  /**
   * 파일 선택 처리
   */
  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files) {
      this.handleFiles(Array.from(files));
    }
    
    // 입력 초기화 (같은 파일 재선택 가능)
    input.value = '';
  }

  /**
   * 파일 처리
   */
  private handleFiles(files: File[]): void {
    const validFiles: UploadFile[] = [];
    
    for (const file of files) {
      const validation = this.validateFile(file);
      
      if (validation.isValid) {
        const uploadFile: UploadFile = {
          file,
          id: this.generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0
        };
        
        validFiles.push(uploadFile);
        this.files.set(uploadFile.id, uploadFile);
      } else {
        this.callbacks.onValidationError?.(file, validation.error!);
        this.showValidationError(file.name, validation.error!);
      }
    }
    
    if (validFiles.length > 0) {
      this.renderFileList();
      this.updateActionButtons();
      this.callbacks.onFileAdd?.(validFiles);
      
      // 스크린 리더에 알림
      const message = `${validFiles.length}개의 파일이 추가되었습니다.`;
      this.announceToScreenReader(message);
    }
  }

  /**
   * 파일 유효성 검사
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // 파일 수 제한 확인
    if (this.files.size >= this.options.maxFiles) {
      return {
        isValid: false,
        error: `최대 ${this.options.maxFiles}개의 파일만 업로드할 수 있습니다.`
      };
    }
    
    // 파일 크기 확인
    if (file.size > this.options.maxFileSize) {
      return {
        isValid: false,
        error: `파일 크기가 ${this.formatFileSize(this.options.maxFileSize)}를 초과합니다.`
      };
    }
    
    // 파일 형식 확인
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.options.acceptedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        error: `지원하지 않는 파일 형식입니다. (${this.options.acceptedTypes.join(', ')})`
      };
    }
    
    // 중복 파일 확인
    for (const existingFile of this.files.values()) {
      if (existingFile.name === file.name && existingFile.size === file.size) {
        return {
          isValid: false,
          error: '이미 추가된 파일입니다.'
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * 드래그 오버 상태 설정
   */
  private setDragOverState(isDragOver: boolean): void {
    const uploadZone = this.container.querySelector('.upload-zone') as HTMLElement;
    
    this.isDragOver = isDragOver;
    
    if (isDragOver) {
      uploadZone.classList.add('drag-over');
    } else {
      uploadZone.classList.remove('drag-over');
    }
  }

  /**
   * 파일 목록 렌더링
   */
  private renderFileList(): void {
    const fileList = this.container.querySelector('.file-list') as HTMLElement;
    
    fileList.innerHTML = '';
    
    for (const file of this.files.values()) {
      const fileItem = this.createFileItem(file);
      fileList.appendChild(fileItem);
    }
  }

  /**
   * 파일 아이템 생성
   */
  private createFileItem(file: UploadFile): HTMLElement {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-file-id', file.id);
    
    const fileIcon = this.getFileIcon(file.type);
    const statusIcon = this.getStatusIcon(file.status);
    
    item.innerHTML = `
      <div class="file-icon">${fileIcon}</div>
      <div class="file-info">
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-details">
          ${this.formatFileSize(file.size)} • ${this.getFileTypeLabel(file.type)}
          ${file.status === 'uploading' ? `• ${file.progress}%` : ''}
          ${file.error ? `• ${file.error}` : ''}
        </div>
      </div>
      <div class="file-status">
        <div class="status-icon ${file.status}">${statusIcon}</div>
        <button type="button" 
                class="file-remove" 
                aria-label="${file.name} 파일 제거"
                data-file-id="${file.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    
    // 제거 버튼 이벤트
    const removeBtn = item.querySelector('.file-remove') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => this.removeFile(file.id));
    
    return item;
  }

  /**
   * 파일 아이콘 반환
   */
  private getFileIcon(type: string): string {
    if (type.includes('json')) {
      return '📄';
    } else if (type.includes('xml')) {
      return '🏷️';
    } else if (type.includes('yaml')) {
      return '📋';
    } else {
      return '📁';
    }
  }

  /**
   * 상태 아이콘 반환
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'uploading':
        return '⏳';
      default:
        return '⏸️';
    }
  }

  /**
   * 파일 타입 레이블 반환
   */
  private getFileTypeLabel(type: string): string {
    if (type.includes('json')) {return 'JSON';}
    if (type.includes('xml')) {return 'XML';}
    if (type.includes('yaml')) {return 'YAML';}
    return '파일';
  }

  /**
   * 파일 크기 포맷팅
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) {return '0 Bytes';}
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 파일 제거
   */
  private removeFile(fileId: string): void {
    const file = this.files.get(fileId);
    if (!file) {return;}
    
    this.files.delete(fileId);
    this.renderFileList();
    this.updateActionButtons();
    this.callbacks.onFileRemove?.(fileId);
    
    // 스크린 리더에 알림
    this.announceToScreenReader(`${file.name} 파일이 제거되었습니다.`);
  }

  /**
   * 모든 파일 업로드
   */
  private async uploadAllFiles(): Promise<void> {
    const pendingFiles = Array.from(this.files.values()).filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await this.uploadFile(file.id);
    }
  }

  /**
   * 개별 파일 업로드
   */
  private async uploadFile(fileId: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {return;}
    
    file.status = 'uploading';
    file.progress = 0;
    this.renderFileList();
    this.callbacks.onUploadStart?.(fileId);
    
    try {
      // 실제 업로드 로직은 콜백으로 처리
      // 여기서는 진행률 시뮬레이션
      await this.simulateUpload(file);
      
      file.status = 'success';
      file.progress = 100;
      this.callbacks.onUploadComplete?.(fileId, { success: true });
      
    } catch (error) {
      file.status = 'error';
      file.error = error instanceof Error ? error.message : '업로드 실패';
      this.callbacks.onUploadError?.(fileId, file.error);
    }
    
    this.renderFileList();
    this.updateActionButtons();
  }

  /**
   * 업로드 시뮬레이션 (실제 구현에서는 실제 업로드 로직으로 대체)
   */
  private async simulateUpload(file: UploadFile): Promise<void> {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        file.progress = Math.min(progress, 100);
        
        this.callbacks.onUploadProgress?.(file.id, file.progress);
        this.renderFileList();
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // 90% 확률로 성공
          if (Math.random() > 0.1) {
            resolve();
          } else {
            reject(new Error('네트워크 오류'));
          }
        }
      }, 200);
    });
  }

  /**
   * 모든 파일 제거
   */
  private clearAllFiles(): void {
    this.files.clear();
    this.renderFileList();
    this.updateActionButtons();
    
    // 스크린 리더에 알림
    this.announceToScreenReader('모든 파일이 제거되었습니다.');
  }

  /**
   * 액션 버튼 상태 업데이트
   */
  private updateActionButtons(): void {
    const actionsContainer = this.container.querySelector('.upload-actions') as HTMLElement;
    const uploadAllBtn = this.container.querySelector('.btn-upload-all') as HTMLButtonElement;
    const clearAllBtn = this.container.querySelector('.btn-clear-all') as HTMLButtonElement;
    
    const hasFiles = this.files.size > 0;
    const hasPendingFiles = Array.from(this.files.values()).some(f => f.status === 'pending');
    
    if (hasFiles) {
      actionsContainer.style.display = 'flex';
      uploadAllBtn.disabled = !hasPendingFiles;
      clearAllBtn.disabled = false;
    } else {
      actionsContainer.style.display = 'none';
    }
  }

  /**
   * 유효성 검사 오류 표시
   */
  private showValidationError(fileName: string, error: string): void {
    // 임시 오류 메시지 표시
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #f44336;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.innerHTML = `
      <strong>${fileName}</strong><br>
      ${error}
    `;
    
    document.body.appendChild(errorDiv);
    
    // 3초 후 제거
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
    
    // 스크린 리더에 알림
    this.announceToScreenReader(`파일 업로드 오류: ${fileName} - ${error}`, 'assertive');
  }

  /**
   * 기본 드래그 이벤트 방지
   */
  private preventDefaultDrag(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * 파일 ID 생성
   */
  private generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 스크린 리더에 메시지 전달
   */
  private announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const regionId = priority === 'assertive' ? 'alert-live-region' : 'status-live-region';
    const region = document.getElementById(regionId);
    
    if (region) {
      region.textContent = message;
      setTimeout(() => region.textContent = '', 1000);
    }
  }

  /**
   * 파일 목록 반환
   */
  public getFiles(): UploadFile[] {
    return Array.from(this.files.values());
  }

  /**
   * 특정 파일 반환
   */
  public getFile(fileId: string): UploadFile | undefined {
    return this.files.get(fileId);
  }

  /**
   * 컴포넌트 정리
   */
  public destroy(): void {
    // 이벤트 리스너 제거
    document.removeEventListener('dragenter', this.preventDefaultDrag);
    document.removeEventListener('dragover', this.preventDefaultDrag);
    document.removeEventListener('drop', this.preventDefaultDrag);
    
    // 파일 목록 초기화
    this.files.clear();
    
    // 컨테이너 초기화
    this.container.innerHTML = '';
  }
}