/**
 * 사용자 친화적인 알림 및 오류 메시지 시스템
 * 접근성을 고려한 알림, 오류 처리, 도움말 시스템
 */

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // milliseconds, 0 = persistent
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  showIcon?: boolean;
  showClose?: boolean;
  allowHtml?: boolean;
  actions?: NotificationAction[];
  onShow?: () => void;
  onHide?: () => void;
  onClick?: () => void;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ErrorOptions extends NotificationOptions {
  error?: Error;
  context?: string;
  showDetails?: boolean;
  reportable?: boolean;
  onReport?: (error: Error, context?: string) => void;
}

export interface HelpOptions {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  showArrow?: boolean;
  maxWidth?: number;
  delay?: number;
}

export interface TooltipOptions {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
  theme?: 'light' | 'dark';
}

export class NotificationManager {
  private notifications: Map<string, HTMLElement> = new Map();
  private container: HTMLElement;
  private helpSystem: HelpSystem;
  private tooltipSystem: TooltipSystem;

  constructor() {
    this.container = this.createNotificationContainer();
    this.helpSystem = new HelpSystem();
    this.tooltipSystem = new TooltipSystem();
    this.initialize();
  }

  /**
   * 시스템 초기화
   */
  private initialize(): void {
    this.createStyles();
    this.setupKeyboardHandlers();
  }

  /**
   * 알림 컨테이너 생성
   */
  private createNotificationContainer(): HTMLElement {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', '알림 영역');
      document.body.appendChild(container);
    }

    return container;
  }

  /**
   * 스타일 생성
   */
  private createStyles(): void {
    const style = document.createElement('style');
    style.id = 'notification-system-styles';
    style.textContent = `
      /* 알림 컨테이너 */
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      }

      .notification-container.top-left {
        top: 20px;
        left: 20px;
        right: auto;
      }

      .notification-container.bottom-right {
        top: auto;
        bottom: 20px;
        right: 20px;
      }

      .notification-container.bottom-left {
        top: auto;
        bottom: 20px;
        left: 20px;
        right: auto;
      }

      .notification-container.top-center {
        top: 20px;
        left: 50%;
        right: auto;
        transform: translateX(-50%);
      }

      .notification-container.bottom-center {
        top: auto;
        bottom: 20px;
        left: 50%;
        right: auto;
        transform: translateX(-50%);
      }

      /* 알림 아이템 */
      .notification {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        padding: 16px;
        pointer-events: auto;
        position: relative;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        border-left: 4px solid #2196f3;
        max-width: 100%;
        word-wrap: break-word;
      }

      .notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .notification.success {
        border-left-color: #4caf50;
      }

      .notification.error {
        border-left-color: #f44336;
      }

      .notification.warning {
        border-left-color: #ff9800;
      }

      .notification.info {
        border-left-color: #2196f3;
      }

      /* 알림 헤더 */
      .notification-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
      }

      .notification-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 14px;
        font-weight: bold;
        color: white;
      }

      .notification-icon.success {
        background-color: #4caf50;
      }

      .notification-icon.error {
        background-color: #f44336;
      }

      .notification-icon.warning {
        background-color: #ff9800;
      }

      .notification-icon.info {
        background-color: #2196f3;
      }

      .notification-content {
        flex: 1;
        min-width: 0;
      }

      .notification-title {
        font-weight: 600;
        font-size: 16px;
        color: #333;
        margin: 0 0 4px 0;
        line-height: 1.3;
      }

      .notification-message {
        font-size: 14px;
        color: #666;
        line-height: 1.4;
        margin: 0;
      }

      /* 닫기 버튼 */
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notification-close:hover {
        background-color: #f5f5f5;
        color: #666;
      }

      .notification-close:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
      }

      /* 액션 버튼 */
      .notification-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .notification-action {
        padding: 6px 12px;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        background-color: white;
        color: #495057;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .notification-action.primary {
        background-color: #2196f3;
        color: white;
        border-color: #2196f3;
      }

      .notification-action.danger {
        background-color: #f44336;
        color: white;
        border-color: #f44336;
      }

      .notification-action:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .notification-action:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
      }

      /* 오류 세부사항 */
      .error-details {
        margin-top: 8px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #dee2e6;
      }

      .error-details-toggle {
        background: none;
        border: none;
        color: #2196f3;
        cursor: pointer;
        font-size: 13px;
        text-decoration: underline;
        padding: 0;
        margin-top: 4px;
      }

      .error-details-content {
        font-family: monospace;
        font-size: 12px;
        color: #666;
        white-space: pre-wrap;
        max-height: 100px;
        overflow-y: auto;
        margin-top: 8px;
      }

      /* 진행률 표시 */
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }

      .notification-progress-bar {
        height: 100%;
        background-color: currentColor;
        transition: width 0.1s linear;
        opacity: 0.7;
      }

      /* 도움말 시스템 */
      .help-tooltip {
        position: absolute;
        background-color: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.4;
        max-width: 250px;
        z-index: 10001;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        pointer-events: none;
        word-wrap: break-word;
      }

      .help-tooltip.show {
        opacity: 1;
        visibility: visible;
      }

      .help-tooltip::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 6px solid transparent;
      }

      .help-tooltip.top::before {
        bottom: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: #333;
      }

      .help-tooltip.bottom::before {
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: #333;
      }

      .help-tooltip.left::before {
        right: -12px;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: #333;
      }

      .help-tooltip.right::before {
        left: -12px;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: #333;
      }

      /* 도움말 버튼 */
      .help-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #2196f3;
        color: white;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
        vertical-align: middle;
        margin-left: 4px;
      }

      .help-button:hover {
        background-color: #1976d2;
        transform: scale(1.1);
      }

      .help-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
      }

      /* 반응형 디자인 */
      @media (max-width: 768px) {
        .notification-container {
          left: 10px;
          right: 10px;
          max-width: none;
        }

        .notification {
          margin-bottom: 8px;
          padding: 12px;
        }

        .notification-title {
          font-size: 15px;
        }

        .notification-message {
          font-size: 13px;
        }

        .help-tooltip {
          max-width: 200px;
          font-size: 12px;
        }
      }

      /* 접근성 개선 */
      .reduced-motion .notification {
        transition: none;
      }

      .reduced-motion .help-tooltip {
        transition: none;
      }

      /* 고대비 모드 */
      .high-contrast .notification {
        border: 2px solid #000;
        box-shadow: none;
      }

      .high-contrast .help-tooltip {
        background-color: #000;
        border: 1px solid #fff;
      }

      .high-contrast .notification-close:hover {
        background-color: #000;
        color: #fff;
      }

      /* 다크 테마 */
      @media (prefers-color-scheme: dark) {
        .notification {
          background-color: #2d3748;
          color: #e2e8f0;
        }

        .notification-title {
          color: #f7fafc;
        }

        .notification-message {
          color: #cbd5e0;
        }

        .notification-close {
          color: #a0aec0;
        }

        .notification-close:hover {
          background-color: #4a5568;
          color: #e2e8f0;
        }

        .error-details {
          background-color: #4a5568;
          border-color: #718096;
        }

        .error-details-content {
          color: #cbd5e0;
        }
      }
    `;

    if (!document.getElementById('notification-system-styles')) {
      document.head.appendChild(style);
    }
  }

  /**
   * 키보드 핸들러 설정
   */
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (event) => {
      // Escape 키로 알림 닫기
      if (event.key === 'Escape') {
        const notifications = Array.from(this.notifications.values());
        const lastNotification = notifications[notifications.length - 1];
        if (lastNotification) {
          const closeBtn = lastNotification.querySelector('.notification-close') as HTMLButtonElement;
          if (closeBtn) {
            closeBtn.click();
          }
        }
      }
    });
  }

  /**
   * 알림 표시
   */
  public show(options: NotificationOptions): string {
    const id = this.generateId();
    const notification = this.createNotification(id, options);
    
    this.notifications.set(id, notification);
    this.container.appendChild(notification);

    // 위치 설정
    if (options.position) {
      this.setContainerPosition(options.position);
    }

    // 애니메이션 시작
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // 자동 숨김 설정
    if (options.duration !== 0) {
      const duration = options.duration || this.getDefaultDuration(options.type);
      this.scheduleHide(id, duration);
    }

    // 콜백 실행
    options.onShow?.();

    // 접근성: 스크린 리더에 알림
    this.announceToScreenReader(
      `${options.title ? options.title + ': ' : ''}${options.message}`,
      options.type === 'error' ? 'assertive' : 'polite'
    );

    return id;
  }

  /**
   * 성공 알림
   */
  public success(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({
      type: 'success',
      message,
      showIcon: true,
      ...options
    });
  }

  /**
   * 오류 알림
   */
  public error(message: string, options: Partial<ErrorOptions> = {}): string {
    const errorOptions: ErrorOptions = {
      type: 'error',
      message,
      showIcon: true,
      duration: 0, // 오류는 수동으로 닫기
      showClose: true,
      ...options
    };

    // 오류 세부사항 추가
    if (options.error || options.showDetails) {
      errorOptions.actions = [
        ...(errorOptions.actions || []),
        {
          label: '세부사항 보기',
          action: () => this.showErrorDetails(options.error, options.context),
          style: 'secondary'
        }
      ];
    }

    // 오류 보고 기능
    if (options.reportable && options.onReport) {
      errorOptions.actions = [
        ...(errorOptions.actions || []),
        {
          label: '오류 보고',
          action: () => options.onReport!(options.error!, options.context),
          style: 'primary'
        }
      ];
    }

    return this.show(errorOptions);
  }

  /**
   * 경고 알림
   */
  public warning(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({
      type: 'warning',
      message,
      showIcon: true,
      ...options
    });
  }

  /**
   * 정보 알림
   */
  public info(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({
      type: 'info',
      message,
      showIcon: true,
      ...options
    });
  }

  /**
   * 알림 생성
   */
  private createNotification(id: string, options: NotificationOptions): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `notification ${options.type || 'info'}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('data-notification-id', id);

    const iconHtml = options.showIcon ? this.getIconHtml(options.type || 'info') : '';
    const titleHtml = options.title ? `<h4 class="notification-title">${options.title}</h4>` : '';
    const closeHtml = options.showClose !== false ? this.getCloseButtonHtml() : '';
    const actionsHtml = options.actions ? this.getActionsHtml(options.actions) : '';

    notification.innerHTML = `
      <div class="notification-header">
        ${iconHtml}
        <div class="notification-content">
          ${titleHtml}
          <p class="notification-message">${options.allowHtml ? options.message : this.escapeHtml(options.message)}</p>
        </div>
      </div>
      ${actionsHtml}
      ${closeHtml}
    `;

    // 이벤트 리스너 설정
    this.setupNotificationEvents(notification, id, options);

    return notification;
  }

  /**
   * 알림 이벤트 설정
   */
  private setupNotificationEvents(notification: HTMLElement, id: string, options: NotificationOptions): void {
    // 닫기 버튼
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide(id));
    }

    // 클릭 이벤트
    if (options.onClick) {
      notification.addEventListener('click', (event) => {
        if (!(event.target as HTMLElement).closest('.notification-close, .notification-action')) {
          options.onClick!();
        }
      });
      notification.style.cursor = 'pointer';
    }

    // 액션 버튼
    const actionButtons = notification.querySelectorAll('.notification-action');
    actionButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        if (options.actions && options.actions[index]) {
          options.actions[index].action();
        }
        this.hide(id);
      });
    });

    // 키보드 접근성
    notification.setAttribute('tabindex', '0');
    notification.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (options.onClick) {
          event.preventDefault();
          options.onClick();
        }
      }
    });
  }

  /**
   * 알림 숨기기
   */
  public hide(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) {return;}

    notification.classList.remove('show');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * 모든 알림 숨기기
   */
  public hideAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.hide(id));
  }

  /**
   * 컨테이너 위치 설정
   */
  private setContainerPosition(position: string): void {
    this.container.className = `notification-container ${position}`;
  }

  /**
   * 자동 숨김 예약
   */
  private scheduleHide(id: string, duration: number): void {
    const notification = this.notifications.get(id);
    if (!notification) {return;}

    // 진행률 바 표시
    const progressBar = document.createElement('div');
    progressBar.className = 'notification-progress';
    progressBar.innerHTML = '<div class="notification-progress-bar"></div>';
    notification.appendChild(progressBar);

    const progressFill = progressBar.querySelector('.notification-progress-bar') as HTMLElement;
    let startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      if (progressFill) {
        progressFill.style.width = `${100 - progress}%`;
      }

      if (progress >= 100) {
        this.hide(id);
      } else {
        requestAnimationFrame(updateProgress);
      }
    };

    // 마우스 오버 시 타이머 일시정지
    notification.addEventListener('mouseenter', () => {
      startTime = Date.now() - (Date.now() - startTime);
    });

    notification.addEventListener('mouseleave', () => {
      startTime = Date.now();
      requestAnimationFrame(updateProgress);
    });

    requestAnimationFrame(updateProgress);
  }

  /**
   * 오류 세부사항 표시
   */
  private showErrorDetails(error?: Error, context?: string): void {
    const details = error ? error.stack || error.message : '세부사항을 사용할 수 없습니다.';
    const contextInfo = context ? `\n\n컨텍스트: ${context}` : '';
    
    const modal = document.createElement('div');
    modal.className = 'error-details-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 20px;
      ">
        <h3 style="margin: 0 0 16px 0;">오류 세부사항</h3>
        <pre style="
          background: #f8f9fa;
          padding: 16px;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        ">${details}${contextInfo}</pre>
        <div style="margin-top: 16px; text-align: right;">
          <button class="close-modal" style="
            padding: 8px 16px;
            background: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">닫기</button>
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('.close-modal');
    const closeModal = () => modal.remove();
    
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {closeModal();}
    });

    document.body.appendChild(modal);
  }

  /**
   * 아이콘 HTML 반환
   */
  private getIconHtml(type: string): string {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    return `<div class="notification-icon ${type}">${icons[type as keyof typeof icons] || icons.info}</div>`;
  }

  /**
   * 닫기 버튼 HTML 반환
   */
  private getCloseButtonHtml(): string {
    return `
      <button class="notification-close" aria-label="알림 닫기" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
  }

  /**
   * 액션 버튼 HTML 반환
   */
  private getActionsHtml(actions: NotificationAction[]): string {
    const buttonsHtml = actions.map(action => 
      `<button class="notification-action ${action.style || 'secondary'}" type="button">
        ${action.label}
      </button>`
    ).join('');

    return `<div class="notification-actions">${buttonsHtml}</div>`;
  }

  /**
   * 기본 지속시간 반환
   */
  private getDefaultDuration(type?: string): number {
    const durations = {
      success: 4000,
      info: 5000,
      warning: 6000,
      error: 0 // 수동으로 닫기
    };

    return durations[type as keyof typeof durations] || 5000;
  }

  /**
   * HTML 이스케이프
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 도움말 시스템 접근
   */
  public get help(): HelpSystem {
    return this.helpSystem;
  }

  /**
   * 툴팁 시스템 접근
   */
  public get tooltip(): TooltipSystem {
    return this.tooltipSystem;
  }
}

/** 
 * 툴팁 시스템
 */
class TooltipSystem {
  /**
   * 툴팁 추가
   */
  public add(element: HTMLElement, options: TooltipOptions): void {
    const tooltip = this.createTooltip(options);
    document.body.appendChild(tooltip);
    
    this.setupTooltipEvents(element, tooltip, options);
  }

  /**
   * 툴팁 생성
   */
  private createTooltip(options: TooltipOptions): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = `help-tooltip ${options.position || 'top'} ${options.theme || 'dark'}`;
    tooltip.textContent = options.content;
    
    if (options.maxWidth) {
      tooltip.style.maxWidth = `${options.maxWidth}px`;
    }
    
    return tooltip;
  }

  /**
   * 툴팁 이벤트 설정
   */
  private setupTooltipEvents(element: HTMLElement, tooltip: HTMLElement, options: TooltipOptions): void {
    const delay = options.delay || 300;
    let showTimeout: number;
    let hideTimeout: number;

    const showTooltip = () => {
      clearTimeout(hideTimeout);
      showTimeout = window.setTimeout(() => {
        this.positionTooltip(element, tooltip, options.position || 'top');
        tooltip.classList.add('show');
      }, delay);
    };

    const hideTooltip = () => {
      clearTimeout(showTimeout);
      hideTimeout = window.setTimeout(() => {
        tooltip.classList.remove('show');
      }, 100);
    };

    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('focus', showTooltip);
    element.addEventListener('blur', hideTooltip);
  }

  /**
   * 툴팁 위치 설정 (HelpSystem과 동일한 로직)
   */
  private positionTooltip(element: HTMLElement, tooltip: HTMLElement, position: string): void {
    // HelpSystem의 positionTooltip과 동일한 구현
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = elementRect.top - tooltipRect.height - 12;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = elementRect.bottom + 12;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.left - tooltipRect.width - 12;
        break;
      case 'right':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.right + 12;
        break;
    }
    
    const margin = 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
    
    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;
  }
}

/**
 * 도움말 시스템
 */
class HelpSystem {
  private helpElements: Map<string, HTMLElement> = new Map();

  /**
   * 도움말 버튼 추가
   */
  public addHelpButton(element: HTMLElement, options: HelpOptions): string {
    const id = this.generateId();
    
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.type = 'button';
    helpButton.innerHTML = '?';
    helpButton.setAttribute('aria-label', `도움말: ${options.title}`);
    
    element.appendChild(helpButton);
    
    const tooltip = this.createHelpTooltip(options);
    document.body.appendChild(tooltip);
    
    this.setupHelpEvents(helpButton, tooltip, options);
    this.helpElements.set(id, tooltip);
    
    return id;
  }

  /**
   * 도움말 툴팁 생성
   */
  private createHelpTooltip(options: HelpOptions): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = `help-tooltip ${options.position || 'top'}`;
    tooltip.innerHTML = `
      <strong>${options.title}</strong><br>
      ${options.content}
    `;
    
    if (options.maxWidth) {
      tooltip.style.maxWidth = `${options.maxWidth}px`;
    }
    
    return tooltip;
  }

  /**
   * 도움말 이벤트 설정
   */
  private setupHelpEvents(button: HTMLElement, tooltip: HTMLElement, options: HelpOptions): void {
    const trigger = options.trigger || 'hover';
    const delay = options.delay || 300;
    let showTimeout: number;
    let hideTimeout: number;

    const showTooltip = () => {
      clearTimeout(hideTimeout);
      showTimeout = window.setTimeout(() => {
        this.positionTooltip(button, tooltip, options.position || 'top');
        tooltip.classList.add('show');
      }, delay);
    };

    const hideTooltip = () => {
      clearTimeout(showTimeout);
      hideTimeout = window.setTimeout(() => {
        tooltip.classList.remove('show');
      }, 100);
    };

    if (trigger === 'hover') {
      button.addEventListener('mouseenter', showTooltip);
      button.addEventListener('mouseleave', hideTooltip);
      tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
      tooltip.addEventListener('mouseleave', hideTooltip);
    } else if (trigger === 'click') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (tooltip.classList.contains('show')) {
          hideTooltip();
        } else {
          showTooltip();
        }
      });
    } else if (trigger === 'focus') {
      button.addEventListener('focus', showTooltip);
      button.addEventListener('blur', hideTooltip);
    }
  }

  /**
   * 툴팁 위치 설정
   */
  private positionTooltip(button: HTMLElement, tooltip: HTMLElement, position: string): void {
    const buttonRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = buttonRect.top - tooltipRect.height - 12;
        left = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = buttonRect.bottom + 12;
        left = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = buttonRect.top + (buttonRect.height - tooltipRect.height) / 2;
        left = buttonRect.left - tooltipRect.width - 12;
        break;
      case 'right':
        top = buttonRect.top + (buttonRect.height - tooltipRect.height) / 2;
        left = buttonRect.right + 12;
        break;
    }
    
    // 화면 경계 확인 및 조정
    const margin = 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
    
    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;
  }

  /**
   * ID 생성
   */
  private generateId(): string {
    return `help-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 전역 인스턴스 생성
export const notificationManager = new NotificationManager();