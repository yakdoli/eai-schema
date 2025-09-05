/**
 * 로딩 상태 및 진행률 표시 시스템
 * 사용자 친화적인 로딩 인터페이스와 진행률 표시
 */

export interface LoadingOptions {
  message?: string;
  showProgress?: boolean;
  showPercentage?: boolean;
  allowCancel?: boolean;
  timeout?: number; // milliseconds
  overlay?: boolean;
  position?: 'center' | 'top' | 'bottom';
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
}

export interface ProgressOptions {
  min?: number;
  max?: number;
  value?: number;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  color?: string;
  striped?: boolean;
}

export interface LoadingState {
  id: string;
  message: string;
  progress: number;
  isIndeterminate: boolean;
  startTime: number;
  cancelable: boolean;
  onCancel?: () => void;
}

export class LoadingManager {
  private loadingStates: Map<string, LoadingState> = new Map();
  private overlayElement: HTMLElement | null = null;
  private progressElements: Map<string, HTMLElement> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * 로딩 시스템 초기화
   */
  private initialize(): void {
    this.createStyles();
    this.setupGlobalLoadingOverlay();
  }

  /**
   * 스타일 생성
   */
  private createStyles(): void {
    const style = document.createElement('style');
    style.id = 'loading-system-styles';
    style.textContent = `
      /* 로딩 오버레이 */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      .loading-overlay.show {
        opacity: 1;
        visibility: visible;
      }

      .loading-overlay.light {
        background-color: rgba(255, 255, 255, 0.8);
      }

      /* 로딩 컨테이너 */
      .loading-container {
        background-color: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        text-align: center;
        max-width: 400px;
        min-width: 280px;
        position: relative;
      }

      .loading-container.dark {
        background-color: #2d3748;
        color: white;
      }

      .loading-container.small {
        padding: 20px;
        min-width: 200px;
      }

      .loading-container.large {
        padding: 48px;
        min-width: 320px;
      }

      /* 로딩 스피너 */
      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2196f3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      .loading-spinner.small {
        width: 32px;
        height: 32px;
        border-width: 3px;
        margin-bottom: 16px;
      }

      .loading-spinner.large {
        width: 64px;
        height: 64px;
        border-width: 5px;
        margin-bottom: 24px;
      }

      .loading-spinner.dark {
        border-color: #4a5568;
        border-top-color: #63b3ed;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* 펄스 애니메이션 */
      .loading-pulse {
        width: 48px;
        height: 48px;
        background-color: #2196f3;
        border-radius: 50%;
        margin: 0 auto 20px;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.8);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.5;
        }
        100% {
          transform: scale(0.8);
          opacity: 1;
        }
      }

      /* 도트 애니메이션 */
      .loading-dots {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin: 0 auto 20px;
        height: 48px;
      }

      .loading-dot {
        width: 12px;
        height: 12px;
        background-color: #2196f3;
        border-radius: 50%;
        animation: dot-bounce 1.4s ease-in-out infinite both;
      }

      .loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .loading-dot:nth-child(2) { animation-delay: -0.16s; }
      .loading-dot:nth-child(3) { animation-delay: 0s; }

      @keyframes dot-bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      /* 로딩 메시지 */
      .loading-message {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin-bottom: 16px;
        line-height: 1.4;
      }

      .loading-message.dark {
        color: #e2e8f0;
      }

      .loading-message.small {
        font-size: 14px;
        margin-bottom: 12px;
      }

      .loading-message.large {
        font-size: 18px;
        margin-bottom: 20px;
      }

      /* 진행률 바 */
      .progress-container {
        width: 100%;
        margin-bottom: 16px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .progress-bar.large {
        height: 12px;
      }

      .progress-bar.small {
        height: 6px;
      }

      .progress-fill {
        height: 100%;
        background-color: #2196f3;
        border-radius: 4px;
        transition: width 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .progress-fill.animated::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.2) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.2) 50%,
          rgba(255, 255, 255, 0.2) 75%,
          transparent 75%,
          transparent
        );
        background-size: 20px 20px;
        animation: progress-stripes 1s linear infinite;
      }

      @keyframes progress-stripes {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 20px 0;
        }
      }

      .progress-text {
        font-size: 14px;
        color: #6c757d;
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .progress-text.dark {
        color: #a0aec0;
      }

      .progress-percentage {
        font-weight: 600;
        color: #2196f3;
      }

      /* 취소 버튼 */
      .loading-cancel {
        background-color: transparent;
        border: 2px solid #6c757d;
        color: #6c757d;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-top: 16px;
      }

      .loading-cancel:hover {
        background-color: #6c757d;
        color: white;
      }

      .loading-cancel:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(108, 117, 125, 0.3);
      }

      .loading-cancel.dark {
        border-color: #a0aec0;
        color: #a0aec0;
      }

      .loading-cancel.dark:hover {
        background-color: #a0aec0;
        color: #2d3748;
      }

      /* 인라인 로딩 */
      .loading-inline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #dee2e6;
        font-size: 14px;
        color: #495057;
      }

      .loading-inline .loading-spinner {
        width: 16px;
        height: 16px;
        border-width: 2px;
        margin: 0;
      }

      /* 버튼 로딩 상태 */
      .btn-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
      }

      .btn-loading::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .btn-loading .btn-text {
        opacity: 0;
      }

      /* 스켈레톤 로딩 */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }

      @keyframes skeleton-loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .skeleton-text {
        height: 16px;
        margin-bottom: 8px;
      }

      .skeleton-text:last-child {
        margin-bottom: 0;
        width: 60%;
      }

      .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }

      .skeleton-button {
        height: 36px;
        width: 100px;
        border-radius: 6px;
      }

      /* 반응형 디자인 */
      @media (max-width: 768px) {
        .loading-container {
          margin: 20px;
          padding: 24px;
          min-width: 0;
          max-width: calc(100vw - 40px);
        }

        .loading-message {
          font-size: 15px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
        }
      }

      /* 접근성 개선 */
      .reduced-motion .loading-spinner,
      .reduced-motion .loading-pulse,
      .reduced-motion .loading-dot,
      .reduced-motion .progress-fill,
      .reduced-motion .skeleton {
        animation: none;
      }

      .reduced-motion .progress-fill.animated::before {
        animation: none;
      }

      /* 고대비 모드 */
      .high-contrast .loading-overlay {
        background-color: rgba(0, 0, 0, 0.8);
      }

      .high-contrast .loading-container {
        border: 2px solid #000;
      }

      .high-contrast .loading-spinner {
        border-color: #000;
        border-top-color: #0066cc;
      }

      .high-contrast .progress-bar {
        background-color: #000;
        border: 1px solid #000;
      }

      .high-contrast .progress-fill {
        background-color: #0066cc;
      }
    `;

    if (!document.getElementById('loading-system-styles')) {
      document.head.appendChild(style);
    }
  }

  /**
   * 전역 로딩 오버레이 설정
   */
  private setupGlobalLoadingOverlay(): void {
    if (!this.overlayElement) {
      this.overlayElement = document.createElement('div');
      this.overlayElement.className = 'loading-overlay';
      this.overlayElement.setAttribute('role', 'dialog');
      this.overlayElement.setAttribute('aria-modal', 'true');
      this.overlayElement.setAttribute('aria-labelledby', 'loading-message');
      document.body.appendChild(this.overlayElement);
    }
  }

  /**
   * 로딩 표시
   */
  public showLoading(options: LoadingOptions = {}): string {
    const id = this.generateId();
    const loadingState: LoadingState = {
      id,
      message: options.message || '처리 중입니다...',
      progress: 0,
      isIndeterminate: !options.showProgress,
      startTime: Date.now(),
      cancelable: options.allowCancel || false,
      onCancel: undefined
    };

    this.loadingStates.set(id, loadingState);

    if (options.overlay !== false) {
      this.showOverlayLoading(loadingState, options);
    }

    // 타임아웃 설정
    if (options.timeout) {
      setTimeout(() => {
        this.hideLoading(id);
      }, options.timeout);
    }

    // 접근성: 스크린 리더에 알림
    this.announceToScreenReader(`로딩 시작: ${loadingState.message}`);

    return id;
  }

  /**
   * 오버레이 로딩 표시
   */
  private showOverlayLoading(state: LoadingState, options: LoadingOptions): void {
    if (!this.overlayElement) return;

    const theme = options.theme || 'light';
    const size = options.size || 'medium';
    const position = options.position || 'center';

    this.overlayElement.className = `loading-overlay ${theme}`;
    
    // 위치에 따른 스타일 조정
    if (position === 'top') {
      this.overlayElement.style.alignItems = 'flex-start';
      this.overlayElement.style.paddingTop = '10vh';
    } else if (position === 'bottom') {
      this.overlayElement.style.alignItems = 'flex-end';
      this.overlayElement.style.paddingBottom = '10vh';
    } else {
      this.overlayElement.style.alignItems = 'center';
      this.overlayElement.style.paddingTop = '';
      this.overlayElement.style.paddingBottom = '';
    }

    this.overlayElement.innerHTML = `
      <div class="loading-container ${theme} ${size}">
        <div class="loading-spinner ${size} ${theme}"></div>
        <div id="loading-message" class="loading-message ${theme} ${size}">
          ${state.message}
        </div>
        ${options.showProgress ? this.createProgressBar(state, options) : ''}
        ${state.cancelable ? this.createCancelButton(state, theme) : ''}
      </div>
    `;

    // 취소 버튼 이벤트
    if (state.cancelable) {
      const cancelBtn = this.overlayElement.querySelector('.loading-cancel') as HTMLButtonElement;
      cancelBtn.addEventListener('click', () => {
        state.onCancel?.();
        this.hideLoading(state.id);
      });
    }

    // 오버레이 표시
    this.overlayElement.classList.add('show');

    // 포커스 트랩 설정
    this.setupFocusTrap(this.overlayElement);
  }

  /**
   * 진행률 바 생성
   */
  private createProgressBar(state: LoadingState, options: ProgressOptions = {}): string {
    const showValue = options.showValue !== false;
    const animated = options.animated !== false;
    const size = (options as any).size || 'medium';

    return `
      <div class="progress-container">
        <div class="progress-bar ${size}">
          <div class="progress-fill ${animated ? 'animated' : ''}" 
               style="width: ${state.progress}%"
               role="progressbar"
               aria-valuenow="${state.progress}"
               aria-valuemin="0"
               aria-valuemax="100"
               aria-label="진행률">
          </div>
        </div>
        ${showValue ? `
          <div class="progress-text">
            <span>진행률</span>
            <span class="progress-percentage">${Math.round(state.progress)}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 취소 버튼 생성
   */
  private createCancelButton(state: LoadingState, theme: string): string {
    return `
      <button type="button" class="loading-cancel ${theme}" aria-label="작업 취소">
        취소
      </button>
    `;
  }

  /**
   * 진행률 업데이트
   */
  public updateProgress(id: string, progress: number, message?: string): void {
    const state = this.loadingStates.get(id);
    if (!state) return;

    state.progress = Math.max(0, Math.min(100, progress));
    
    if (message) {
      state.message = message;
    }

    // 오버레이 업데이트
    if (this.overlayElement && this.overlayElement.classList.contains('show')) {
      const messageElement = this.overlayElement.querySelector('#loading-message');
      const progressFill = this.overlayElement.querySelector('.progress-fill') as HTMLElement;
      const progressPercentage = this.overlayElement.querySelector('.progress-percentage');

      if (messageElement && message) {
        messageElement.textContent = message;
      }

      if (progressFill) {
        progressFill.style.width = `${state.progress}%`;
        progressFill.setAttribute('aria-valuenow', state.progress.toString());
      }

      if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(state.progress)}%`;
      }
    }

    // 인라인 진행률 업데이트
    const inlineElement = this.progressElements.get(id);
    if (inlineElement) {
      this.updateInlineProgress(inlineElement, state);
    }

    // 접근성: 진행률 변경 알림 (25% 단위로만)
    if (progress % 25 === 0 && progress > 0) {
      this.announceToScreenReader(`진행률 ${progress}%`);
    }
  }

  /**
   * 로딩 숨기기
   */
  public hideLoading(id: string): void {
    const state = this.loadingStates.get(id);
    if (!state) return;

    this.loadingStates.delete(id);

    // 오버레이 숨기기
    if (this.overlayElement && this.overlayElement.classList.contains('show')) {
      this.overlayElement.classList.remove('show');
      
      // 포커스 복원
      this.restoreFocus();
    }

    // 인라인 요소 제거
    const inlineElement = this.progressElements.get(id);
    if (inlineElement) {
      inlineElement.remove();
      this.progressElements.delete(id);
    }

    // 접근성: 완료 알림
    const duration = Date.now() - state.startTime;
    this.announceToScreenReader(`작업 완료 (${Math.round(duration / 1000)}초 소요)`);
  }

  /**
   * 인라인 로딩 표시
   */
  public showInlineLoading(
    container: HTMLElement, 
    message: string = '로딩 중...',
    options: { showProgress?: boolean; size?: string } = {}
  ): string {
    const id = this.generateId();
    const size = options.size || 'small';

    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-inline';
    loadingElement.innerHTML = `
      <div class="loading-spinner ${size}"></div>
      <span class="loading-message">${message}</span>
      ${options.showProgress ? `
        <div class="progress-container" style="width: 100px; margin: 0 0 0 8px;">
          <div class="progress-bar small">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
        </div>
      ` : ''}
    `;

    container.appendChild(loadingElement);
    this.progressElements.set(id, loadingElement);

    const state: LoadingState = {
      id,
      message,
      progress: 0,
      isIndeterminate: !options.showProgress,
      startTime: Date.now(),
      cancelable: false
    };

    this.loadingStates.set(id, state);

    return id;
  }

  /**
   * 버튼 로딩 상태 설정
   */
  public setButtonLoading(button: HTMLButtonElement, loading: boolean, originalText?: string): void {
    if (loading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent || '';
      }
      
      const textSpan = button.querySelector('.btn-text') || button;
      if (textSpan) {
        textSpan.textContent = originalText || '처리 중...';
      }
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      
      const originalTextContent = button.dataset.originalText;
      if (originalTextContent) {
        const textSpan = button.querySelector('.btn-text') || button;
        if (textSpan) {
          textSpan.textContent = originalTextContent;
        }
        delete button.dataset.originalText;
      }
    }
  }

  /**
   * 스켈레톤 로딩 생성
   */
  public createSkeleton(container: HTMLElement, type: 'text' | 'avatar' | 'button' | 'custom', count: number = 1): void {
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-${type}`;
      
      if (type === 'text') {
        skeleton.classList.add('skeleton-text');
      }
      
      container.appendChild(skeleton);
    }
  }

  /**
   * 인라인 진행률 업데이트
   */
  private updateInlineProgress(element: HTMLElement, state: LoadingState): void {
    const messageElement = element.querySelector('.loading-message');
    const progressFill = element.querySelector('.progress-fill') as HTMLElement;

    if (messageElement) {
      messageElement.textContent = state.message;
    }

    if (progressFill) {
      progressFill.style.width = `${state.progress}%`;
    }
  }

  /**
   * 포커스 트랩 설정
   */
  private setupFocusTrap(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }

  /**
   * 포커스 복원
   */
  private restoreFocus(): void {
    // 이전에 포커스된 요소로 복원 (실제 구현에서는 포커스 스택 관리)
    const activeElement = document.querySelector('[data-was-focused]') as HTMLElement;
    if (activeElement) {
      activeElement.focus();
      activeElement.removeAttribute('data-was-focused');
    }
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
   * ID 생성
   */
  private generateId(): string {
    return `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 모든 로딩 상태 확인
   */
  public isLoading(): boolean {
    return this.loadingStates.size > 0;
  }

  /**
   * 특정 로딩 상태 확인
   */
  public isLoadingById(id: string): boolean {
    return this.loadingStates.has(id);
  }

  /**
   * 모든 로딩 숨기기
   */
  public hideAllLoading(): void {
    const ids = Array.from(this.loadingStates.keys());
    ids.forEach(id => this.hideLoading(id));
  }

  /**
   * 취소 콜백 설정
   */
  public setCancelCallback(id: string, callback: () => void): void {
    const state = this.loadingStates.get(id);
    if (state) {
      state.onCancel = callback;
    }
  }

  /**
   * 로딩 상태 정보 반환
   */
  public getLoadingState(id: string): LoadingState | undefined {
    return this.loadingStates.get(id);
  }

  /**
   * 시스템 정리
   */
  public destroy(): void {
    this.hideAllLoading();
    
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }

    this.progressElements.clear();
    this.loadingStates.clear();
  }
}

// 전역 인스턴스 생성
export const loadingManager = new LoadingManager();