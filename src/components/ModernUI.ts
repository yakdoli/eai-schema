/**
 * 현대화된 사용자 인터페이스 컴포넌트
 * 반응형 디자인, 접근성, 사용자 경험 개선을 위한 UI 시스템
 */

export interface UITheme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export interface AccessibilityOptions {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export class ModernUIManager {
  private theme: UITheme;
  private breakpoints: ResponsiveBreakpoints;
  private accessibility: AccessibilityOptions;
  private currentViewport = 'desktop';

  constructor() {
    this.theme = this.getDefaultTheme();
    this.breakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      wide: 1440
    };
    this.accessibility = {
      highContrast: false,
      reducedMotion: false,
      screenReaderSupport: true,
      keyboardNavigation: true,
      focusIndicators: true
    };

    this.initialize();
  }

  /**
   * UI 시스템 초기화
   */
  private initialize(): void {
    this.detectSystemPreferences();
    this.setupResponsiveListeners();
    this.setupAccessibilityFeatures();
    this.applyTheme();
    this.updateViewport();
  }

  /**
   * 시스템 환경설정 감지
   */
  private detectSystemPreferences(): void {
    // 다크 모드 감지
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme.mode = 'dark';
    }

    // 애니메이션 감소 설정 감지
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.accessibility.reducedMotion = true;
    }

    // 고대비 모드 감지
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.accessibility.highContrast = true;
    }
  }

  /**
   * 반응형 리스너 설정
   */
  private setupResponsiveListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    // 미디어 쿼리 리스너
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addListener(this.handleThemeChange.bind(this));

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addListener(this.handleMotionPreferenceChange.bind(this));
  }

  /**
   * 접근성 기능 설정
   */
  private setupAccessibilityFeatures(): void {
    // 키보드 네비게이션 설정
    if (this.accessibility.keyboardNavigation) {
      this.setupKeyboardNavigation();
    }

    // 스크린 리더 지원
    if (this.accessibility.screenReaderSupport) {
      this.setupScreenReaderSupport();
    }

    // 포커스 표시기 설정
    if (this.accessibility.focusIndicators) {
      this.setupFocusIndicators();
    }
  }

  /**
   * 키보드 네비게이션 설정
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      // Tab 키로 포커스 이동
      if (event.key === 'Tab') {
        this.handleTabNavigation(event);
      }

      // Enter/Space로 버튼 활성화
      if (event.key === 'Enter' || event.key === ' ') {
        this.handleKeyboardActivation(event);
      }

      // Escape로 모달/팝업 닫기
      if (event.key === 'Escape') {
        this.handleEscapeKey(event);
      }

      // 화살표 키로 그리드 네비게이션
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowNavigation(event);
      }
    });
  }

  /**
   * 스크린 리더 지원 설정
   */
  private setupScreenReaderSupport(): void {
    // ARIA 레이블 자동 설정
    this.setupAriaLabels();
    
    // 라이브 리전 설정
    this.setupLiveRegions();
    
    // 랜드마크 설정
    this.setupLandmarks();
  }

  /**
   * 포커스 표시기 설정
   */
  private setupFocusIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible {
        outline: 2px solid ${this.theme.primaryColor};
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      .focus-visible:not(.focus-visible-added) {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * ARIA 레이블 설정
   */
  private setupAriaLabels(): void {
    // 버튼에 레이블 추가
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
      const text = button.textContent?.trim();
      if (text) {
        button.setAttribute('aria-label', text);
      }
    });

    // 입력 필드에 레이블 연결
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        input.setAttribute('aria-labelledby', label.id || this.generateId('label'));
      }
    });
  }

  /**
   * 라이브 리전 설정
   */
  private setupLiveRegions(): void {
    // 상태 메시지용 라이브 리전
    let statusRegion = document.getElementById('status-live-region');
    if (!statusRegion) {
      statusRegion = document.createElement('div');
      statusRegion.id = 'status-live-region';
      statusRegion.setAttribute('aria-live', 'polite');
      statusRegion.setAttribute('aria-atomic', 'true');
      statusRegion.style.position = 'absolute';
      statusRegion.style.left = '-10000px';
      statusRegion.style.width = '1px';
      statusRegion.style.height = '1px';
      statusRegion.style.overflow = 'hidden';
      document.body.appendChild(statusRegion);
    }

    // 알림용 라이브 리전
    let alertRegion = document.getElementById('alert-live-region');
    if (!alertRegion) {
      alertRegion = document.createElement('div');
      alertRegion.id = 'alert-live-region';
      alertRegion.setAttribute('aria-live', 'assertive');
      alertRegion.setAttribute('aria-atomic', 'true');
      alertRegion.style.position = 'absolute';
      alertRegion.style.left = '-10000px';
      alertRegion.style.width = '1px';
      alertRegion.style.height = '1px';
      alertRegion.style.overflow = 'hidden';
      document.body.appendChild(alertRegion);
    }
  }

  /**
   * 랜드마크 설정
   */
  private setupLandmarks(): void {
    // 메인 콘텐츠 영역
    const mainContent = document.querySelector('.main-container');
    if (mainContent && !mainContent.getAttribute('role')) {
      mainContent.setAttribute('role', 'main');
    }

    // 네비게이션 영역
    const navigation = document.querySelector('.header');
    if (navigation && !navigation.getAttribute('role')) {
      navigation.setAttribute('role', 'banner');
    }

    // 그리드 영역
    const gridSection = document.querySelector('.grid-section');
    if (gridSection && !gridSection.getAttribute('role')) {
      gridSection.setAttribute('role', 'application');
      gridSection.setAttribute('aria-label', '스키마 데이터 편집 그리드');
    }
  }

  /**
   * 화면 크기 변경 처리
   */
  private handleResize(): void {
    this.updateViewport();
    this.adjustLayoutForViewport();
  }

  /**
   * 화면 방향 변경 처리
   */
  private handleOrientationChange(): void {
    setTimeout(() => {
      this.updateViewport();
      this.adjustLayoutForViewport();
    }, 100);
  }

  /**
   * 테마 변경 처리
   */
  private handleThemeChange(event: MediaQueryListEvent): void {
    if (this.theme.mode === 'auto') {
      this.theme.mode = event.matches ? 'dark' : 'light';
      this.applyTheme();
    }
  }

  /**
   * 애니메이션 설정 변경 처리
   */
  private handleMotionPreferenceChange(event: MediaQueryListEvent): void {
    this.accessibility.reducedMotion = event.matches;
    this.applyMotionPreferences();
  }

  /**
   * 현재 뷰포트 업데이트
   */
  private updateViewport(): void {
    const width = window.innerWidth;
    
    if (width <= this.breakpoints.mobile) {
      this.currentViewport = 'mobile';
    } else if (width <= this.breakpoints.tablet) {
      this.currentViewport = 'tablet';
    } else if (width <= this.breakpoints.desktop) {
      this.currentViewport = 'desktop';
    } else {
      this.currentViewport = 'wide';
    }

    document.body.setAttribute('data-viewport', this.currentViewport);
  }

  /**
   * 뷰포트에 따른 레이아웃 조정
   */
  private adjustLayoutForViewport(): void {
    const gridContainer = document.querySelector('.grid-container') as HTMLElement;
    const toolbar = document.querySelector('.grid-toolbar') as HTMLElement;
    const actionsPanel = document.querySelector('.actions-panel') as HTMLElement;

    if (!gridContainer || !toolbar || !actionsPanel) {return;}

    switch (this.currentViewport) {
      case 'mobile':
        this.applyMobileLayout(gridContainer, toolbar, actionsPanel);
        break;
      case 'tablet':
        this.applyTabletLayout(gridContainer, toolbar, actionsPanel);
        break;
      case 'desktop':
      case 'wide':
        this.applyDesktopLayout(gridContainer, toolbar, actionsPanel);
        break;
    }
  }

  /**
   * 모바일 레이아웃 적용
   */
  private applyMobileLayout(grid: HTMLElement, toolbar: HTMLElement, actions: HTMLElement): void {
    // 툴바를 세로로 배치
    toolbar.style.flexDirection = 'column';
    toolbar.style.alignItems = 'stretch';
    
    // 액션 패널을 하단으로 이동
    actions.style.order = '2';
    
    // 그리드 높이 조정
    grid.style.height = '60vh';
    
    // 버튼 크기 증가 (터치 친화적)
    const buttons = toolbar.querySelectorAll('.grid-toolbar-button');
    buttons.forEach(button => {
      (button as HTMLElement).style.minHeight = '44px';
      (button as HTMLElement).style.fontSize = '16px';
    });
  }

  /**
   * 태블릿 레이아웃 적용
   */
  private applyTabletLayout(grid: HTMLElement, toolbar: HTMLElement, _actions: HTMLElement): void {
    // 툴바를 가로로 배치하되 줄바꿈 허용
    toolbar.style.flexDirection = 'row';
    toolbar.style.flexWrap = 'wrap';
    
    // 그리드 높이 조정
    grid.style.height = '70vh';
    
    // 버튼 크기 조정
    const buttons = toolbar.querySelectorAll('.grid-toolbar-button');
    buttons.forEach(button => {
      (button as HTMLElement).style.minHeight = '40px';
      (button as HTMLElement).style.fontSize = '14px';
    });
  }

  /**
   * 데스크톱 레이아웃 적용
   */
  private applyDesktopLayout(grid: HTMLElement, toolbar: HTMLElement, _actions: HTMLElement): void {
    // 기본 레이아웃 복원
    toolbar.style.flexDirection = 'row';
    toolbar.style.flexWrap = 'nowrap';
    
    // 그리드 높이 조정
    grid.style.height = '80vh';
    
    // 버튼 크기 복원
    const buttons = toolbar.querySelectorAll('.grid-toolbar-button');
    buttons.forEach(button => {
      (button as HTMLElement).style.minHeight = '36px';
      (button as HTMLElement).style.fontSize = '14px';
    });
  }

  /**
   * 테마 적용
   */
  private applyTheme(): void {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', this.theme.primaryColor);
    root.style.setProperty('--secondary-color', this.theme.secondaryColor);
    root.style.setProperty('--background-color', this.theme.backgroundColor);
    root.style.setProperty('--text-color', this.theme.textColor);
    root.style.setProperty('--border-color', this.theme.borderColor);
    
    document.body.setAttribute('data-theme', this.theme.mode);
    
    if (this.accessibility.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  /**
   * 애니메이션 설정 적용
   */
  private applyMotionPreferences(): void {
    if (this.accessibility.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  /**
   * 기본 테마 반환
   */
  private getDefaultTheme(): UITheme {
    return {
      mode: 'auto',
      primaryColor: '#2196f3',
      secondaryColor: '#f8f9fa',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      borderColor: '#dee2e6'
    };
  }

  /**
   * Tab 네비게이션 처리
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (event.shiftKey) {
      // Shift+Tab: 이전 요소로
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
      focusableElements[prevIndex]?.focus();
    } else {
      // Tab: 다음 요소로
      const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
      focusableElements[nextIndex]?.focus();
    }
  }

  /**
   * 키보드 활성화 처리
   */
  private handleKeyboardActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
      event.preventDefault();
      target.click();
    }
  }

  /**
   * Escape 키 처리
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // 모달이나 팝업 닫기
    const modal = document.querySelector('.modal.show, .popup.show, .dropdown.show');
    if (modal) {
      modal.classList.remove('show');
      event.preventDefault();
    }
  }

  /**
   * 화살표 키 네비게이션 처리
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // 그리드 내에서의 화살표 네비게이션은 Handsontable이 처리
    if (target.closest('.handsontable')) {
      return;
    }
    
    // 메뉴나 버튼 그룹에서의 화살표 네비게이션
    if (target.closest('.grid-toolbar, .actions-grid')) {
      this.handleMenuNavigation(event);
    }
  }

  /**
   * 메뉴 네비게이션 처리
   */
  private handleMenuNavigation(event: KeyboardEvent): void {
    const container = (event.target as HTMLElement).closest('.grid-toolbar, .actions-grid');
    if (!container) {return;}

    const buttons = Array.from(container.querySelectorAll('button, [role="button"]')) as HTMLElement[];
    const currentIndex = buttons.indexOf(event.target as HTMLElement);
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      event.preventDefault();
      buttons[nextIndex]?.focus();
    }
  }

  /**
   * 포커스 가능한 요소들 반환
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * 고유 ID 생성
   */
  private generateId(prefix = 'ui'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 스크린 리더에 메시지 전달
   */
  public announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const regionId = priority === 'assertive' ? 'alert-live-region' : 'status-live-region';
    const region = document.getElementById(regionId);
    
    if (region) {
      region.textContent = message;
      
      // 메시지를 지우기 위해 잠시 후 초기화
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  }

  /**
   * 테마 변경
   */
  public setTheme(theme: Partial<UITheme>): void {
    this.theme = { ...this.theme, ...theme };
    this.applyTheme();
  }

  /**
   * 접근성 옵션 변경
   */
  public setAccessibilityOptions(options: Partial<AccessibilityOptions>): void {
    this.accessibility = { ...this.accessibility, ...options };
    this.applyMotionPreferences();
    
    if (options.highContrast !== undefined) {
      this.applyTheme();
    }
  }

  /**
   * 현재 뷰포트 반환
   */
  public getCurrentViewport(): string {
    return this.currentViewport;
  }

  /**
   * 모바일 디바이스 여부 확인
   */
  public isMobile(): boolean {
    return this.currentViewport === 'mobile';
  }

  /**
   * 태블릿 디바이스 여부 확인
   */
  public isTablet(): boolean {
    return this.currentViewport === 'tablet';
  }

  /**
   * 데스크톱 디바이스 여부 확인
   */
  public isDesktop(): boolean {
    return this.currentViewport === 'desktop' || this.currentViewport === 'wide';
  }
}

// 전역 인스턴스 생성
export const modernUI = new ModernUIManager();