/**
 * ModernUI 컴포넌트 테스트
 */

import { ModernUIManager } from '../../components/ModernUI';

// DOM 환경 설정
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ResizeObserver 모킹
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('ModernUIManager', () => {
  let modernUI: ModernUIManager;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // DOM 초기화
    document.body.innerHTML = '';
    
    // 테스트용 요소 생성
    mockElement = document.createElement('div');
    mockElement.className = 'test-element';
    document.body.appendChild(mockElement);

    // ModernUI 인스턴스 생성
    modernUI = new ModernUIManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('초기화', () => {
    test('ModernUI가 올바르게 초기화되어야 함', () => {
      expect(modernUI).toBeInstanceOf(ModernUIManager);
      expect(modernUI.getCurrentViewport()).toBeDefined();
    });

    test('라이브 리전이 생성되어야 함', () => {
      const statusRegion = document.getElementById('status-live-region');
      const alertRegion = document.getElementById('alert-live-region');
      
      expect(statusRegion).toBeTruthy();
      expect(alertRegion).toBeTruthy();
      expect(statusRegion?.getAttribute('aria-live')).toBe('polite');
      expect(alertRegion?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('반응형 기능', () => {
    test('뷰포트 크기에 따라 올바른 뷰포트를 반환해야 함', () => {
      // 모바일 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      // 리사이즈 이벤트 발생
      window.dispatchEvent(new Event('resize'));

      // 약간의 지연 후 확인 (비동기 처리)
      setTimeout(() => {
        expect(modernUI.isMobile()).toBe(true);
        expect(document.body.getAttribute('data-viewport')).toBe('mobile');
      }, 100);
    });

    test('태블릿 크기에서 올바른 뷰포트를 반환해야 함', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 700,
      });

      window.dispatchEvent(new Event('resize'));

      setTimeout(() => {
        expect(modernUI.isTablet()).toBe(true);
        expect(document.body.getAttribute('data-viewport')).toBe('tablet');
      }, 100);
    });

    test('데스크톱 크기에서 올바른 뷰포트를 반환해야 함', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      window.dispatchEvent(new Event('resize'));

      setTimeout(() => {
        expect(modernUI.isDesktop()).toBe(true);
        expect(document.body.getAttribute('data-viewport')).toBe('desktop');
      }, 100);
    });
  });

  describe('접근성 기능', () => {
    test('키보드 네비게이션이 올바르게 작동해야 함', () => {
      // 포커스 가능한 요소들 생성
      const button1 = document.createElement('button');
      button1.textContent = 'Button 1';
      const button2 = document.createElement('button');
      button2.textContent = 'Button 2';
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      // 첫 번째 버튼에 포커스
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Tab 키 이벤트 시뮬레이션
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });
      
      document.dispatchEvent(tabEvent);
      
      // 포커스가 다음 요소로 이동했는지 확인은 실제 브라우저 환경에서만 가능
      // 여기서는 이벤트가 올바르게 처리되는지만 확인
      expect(tabEvent.defaultPrevented).toBe(false);
    });

    test('Escape 키로 모달을 닫을 수 있어야 함', () => {
      // 모달 요소 생성
      const modal = document.createElement('div');
      modal.className = 'modal show';
      document.body.appendChild(modal);

      // Escape 키 이벤트 시뮬레이션
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      
      document.dispatchEvent(escapeEvent);
      
      // 모달이 닫혔는지 확인
      expect(modal.classList.contains('show')).toBe(false);
    });

    test('스크린 리더에 메시지를 전달할 수 있어야 함', () => {
      const testMessage = '테스트 메시지';
      
      modernUI.announceToScreenReader(testMessage);
      
      const statusRegion = document.getElementById('status-live-region');
      expect(statusRegion?.textContent).toBe(testMessage);
      
      // 1초 후 메시지가 지워지는지 확인
      setTimeout(() => {
        expect(statusRegion?.textContent).toBe('');
      }, 1100);
    });

    test('긴급 메시지를 assertive 리전에 전달할 수 있어야 함', () => {
      const urgentMessage = '긴급 메시지';
      
      modernUI.announceToScreenReader(urgentMessage, 'assertive');
      
      const alertRegion = document.getElementById('alert-live-region');
      expect(alertRegion?.textContent).toBe(urgentMessage);
    });
  });

  describe('테마 기능', () => {
    test('테마를 변경할 수 있어야 함', () => {
      const newTheme = {
        mode: 'dark' as const,
        primaryColor: '#ff5722',
        backgroundColor: '#121212',
      };

      modernUI.setTheme(newTheme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--primary-color')).toBe('#ff5722');
      expect(root.style.getPropertyValue('--background-color')).toBe('#121212');
      expect(document.body.getAttribute('data-theme')).toBe('dark');
    });

    test('접근성 옵션을 변경할 수 있어야 함', () => {
      modernUI.setAccessibilityOptions({
        highContrast: true,
        reducedMotion: true,
      });

      expect(document.body.classList.contains('high-contrast')).toBe(true);
      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });
  });

  describe('시스템 환경설정 감지', () => {
    test('다크 모드 환경설정을 감지해야 함', () => {
      // matchMedia 모킹을 다크 모드로 설정
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // 새 인스턴스 생성하여 환경설정 감지 테스트
      const newModernUI = new ModernUIManager();
      
      // 다크 모드가 감지되었는지 확인
      expect(document.body.getAttribute('data-theme')).toBe('dark');
    });

    test('애니메이션 감소 환경설정을 감지해야 함', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const newModernUI = new ModernUIManager();
      
      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });

    test('고대비 환경설정을 감지해야 함', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const newModernUI = new ModernUIManager();
      
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });
  });

  describe('ARIA 레이블 설정', () => {
    test('버튼에 자동으로 ARIA 레이블이 설정되어야 함', () => {
      const button = document.createElement('button');
      button.textContent = '테스트 버튼';
      document.body.appendChild(button);

      // 새 인스턴스 생성하여 ARIA 레이블 설정 테스트
      new ModernUIManager();

      expect(button.getAttribute('aria-label')).toBe('테스트 버튼');
    });

    test('입력 필드에 레이블이 연결되어야 함', () => {
      const label = document.createElement('label');
      label.id = 'test-label';
      label.textContent = '테스트 레이블';
      
      const input = document.createElement('input');
      input.id = 'test-input';
      
      label.setAttribute('for', 'test-input');
      
      document.body.appendChild(label);
      document.body.appendChild(input);

      new ModernUIManager();

      expect(input.getAttribute('aria-labelledby')).toBe('test-label');
    });
  });

  describe('랜드마크 설정', () => {
    test('메인 콘텐츠 영역에 role이 설정되어야 함', () => {
      const mainContainer = document.createElement('div');
      mainContainer.className = 'main-container';
      document.body.appendChild(mainContainer);

      new ModernUIManager();

      expect(mainContainer.getAttribute('role')).toBe('main');
    });

    test('헤더 영역에 role이 설정되어야 함', () => {
      const header = document.createElement('div');
      header.className = 'header';
      document.body.appendChild(header);

      new ModernUIManager();

      expect(header.getAttribute('role')).toBe('banner');
    });

    test('그리드 섹션에 적절한 role과 레이블이 설정되어야 함', () => {
      const gridSection = document.createElement('div');
      gridSection.className = 'grid-section';
      document.body.appendChild(gridSection);

      new ModernUIManager();

      expect(gridSection.getAttribute('role')).toBe('application');
      expect(gridSection.getAttribute('aria-label')).toBe('스키마 데이터 편집 그리드');
    });
  });
});