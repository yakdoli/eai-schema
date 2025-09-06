/**
 * NotificationSystem 컴포넌트 테스트
 */

import { NotificationManager } from '../../components/NotificationSystem';

// 타이머 모킹
jest.useFakeTimers();

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    // DOM 초기화
    document.body.innerHTML = '';
    
    // NotificationManager 인스턴스 생성
    notificationManager = new NotificationManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllTimers();
  });

  describe('초기화', () => {
    test('알림 컨테이너가 생성되어야 함', () => {
      const container = document.getElementById('notification-container');
      expect(container).toBeTruthy();
      expect(container?.getAttribute('aria-live')).toBe('polite');
      expect(container?.getAttribute('aria-label')).toBe('알림 영역');
    });

    test('스타일이 올바르게 추가되어야 함', () => {
      const styleElement = document.getElementById('notification-system-styles');
      expect(styleElement).toBeTruthy();
    });
  });

  describe('기본 알림 기능', () => {
    test('성공 알림을 표시할 수 있어야 함', () => {
      const message = '작업이 성공적으로 완료되었습니다.';
      const id = notificationManager.success(message);

      expect(id).toBeDefined();
      
      const notification = document.querySelector('.notification.success');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toContain(message);
    });

    test('오류 알림을 표시할 수 있어야 함', () => {
      const message = '오류가 발생했습니다.';
      const id = notificationManager.error(message);

      expect(id).toBeDefined();
      
      const notification = document.querySelector('.notification.error');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toContain(message);
    });

    test('경고 알림을 표시할 수 있어야 함', () => {
      const message = '주의가 필요합니다.';
      const id = notificationManager.warning(message);

      expect(id).toBeDefined();
      
      const notification = document.querySelector('.notification.warning');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toContain(message);
    });

    test('정보 알림을 표시할 수 있어야 함', () => {
      const message = '정보를 확인하세요.';
      const id = notificationManager.info(message);

      expect(id).toBeDefined();
      
      const notification = document.querySelector('.notification.info');
      expect(notification).toBeTruthy();
      expect(notification?.textContent).toContain(message);
    });
  });

  describe('알림 옵션', () => {
    test('제목과 메시지를 함께 표시할 수 있어야 함', () => {
      const title = '알림 제목';
      const message = '알림 메시지';
      
      notificationManager.show({
        type: 'info',
        title,
        message,
      });

      const notification = document.querySelector('.notification');
      expect(notification?.querySelector('.notification-title')?.textContent).toBe(title);
      expect(notification?.querySelector('.notification-message')?.textContent).toBe(message);
    });

    test('아이콘을 표시할 수 있어야 함', () => {
      notificationManager.show({
        type: 'success',
        message: '테스트 메시지',
        showIcon: true,
      });

      const icon = document.querySelector('.notification-icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('success')).toBe(true);
    });

    test('닫기 버튼을 표시할 수 있어야 함', () => {
      notificationManager.show({
        type: 'info',
        message: '테스트 메시지',
        showClose: true,
      });

      const closeButton = document.querySelector('.notification-close');
      expect(closeButton).toBeTruthy();
      expect(closeButton?.getAttribute('aria-label')).toBe('알림 닫기');
    });

    test('액션 버튼을 추가할 수 있어야 함', () => {
      const mockAction = jest.fn();
      
      notificationManager.show({
        type: 'info',
        message: '테스트 메시지',
        actions: [
          {
            label: '확인',
            action: mockAction,
            style: 'primary',
          },
          {
            label: '취소',
            action: jest.fn(),
            style: 'secondary',
          },
        ],
      });

      const actions = document.querySelectorAll('.notification-action');
      expect(actions).toHaveLength(2);
      expect(actions[0].textContent).toBe('확인');
      expect(actions[0].classList.contains('primary')).toBe(true);
      expect(actions[1].textContent).toBe('취소');
    });
  });

  describe('알림 제어', () => {
    test('알림을 수동으로 숨길 수 있어야 함', () => {
      const id = notificationManager.info('테스트 메시지');
      
      // 알림이 표시되었는지 확인
      let notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      // 알림 숨기기
      notificationManager.hide(id);

      // 애니메이션 완료 후 확인
      jest.advanceTimersByTime(300);
      
      notification = document.querySelector('.notification');
      expect(notification).toBeFalsy();
    });

    test('모든 알림을 숨길 수 있어야 함', () => {
      notificationManager.info('메시지 1');
      notificationManager.success('메시지 2');
      notificationManager.warning('메시지 3');

      let notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(3);

      notificationManager.hideAll();

      jest.advanceTimersByTime(300);
      
      notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(0);
    });

    test('자동 숨김 기능이 작동해야 함', () => {
      notificationManager.show({
        type: 'info',
        message: '자동 숨김 테스트',
        duration: 2000,
      });

      let notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      // 2초 후 자동으로 숨겨져야 함
      jest.advanceTimersByTime(2000);
      
      notification = document.querySelector('.notification');
      expect(notification).toBeFalsy();
    });

    test('지속적 알림은 자동으로 숨겨지지 않아야 함', () => {
      notificationManager.show({
        type: 'error',
        message: '지속적 알림',
        duration: 0, // 지속적 표시
      });

      let notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      // 충분한 시간이 지나도 여전히 표시되어야 함
      jest.advanceTimersByTime(10000);
      
      notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();
    });
  });

  describe('오류 알림 특수 기능', () => {
    test('오류 세부사항을 표시할 수 있어야 함', () => {
      const error = new Error('테스트 오류');
      error.stack = 'Error: 테스트 오류\n    at test.js:1:1';

      notificationManager.error('오류 발생', {
        error,
        showDetails: true,
      });

      const detailsButton = document.querySelector('.notification-action');
      expect(detailsButton?.textContent).toBe('세부사항 보기');
    });

    test('오류 보고 기능을 제공할 수 있어야 함', () => {
      const mockReportCallback = jest.fn();
      const error = new Error('보고할 오류');

      notificationManager.error('오류 발생', {
        error,
        reportable: true,
        onReport: mockReportCallback,
      });

      const reportButton = document.querySelector('.notification-action[class*="primary"]');
      expect(reportButton?.textContent).toBe('오류 보고');
      
      // 보고 버튼 클릭 시뮬레이션
      (reportButton as HTMLElement)?.click();
      expect(mockReportCallback).toHaveBeenCalledWith(error, undefined);
    });
  });

  describe('접근성', () => {
    test('알림에 적절한 ARIA 속성이 설정되어야 함', () => {
      notificationManager.info('접근성 테스트');

      const notification = document.querySelector('.notification');
      expect(notification?.getAttribute('role')).toBe('alert');
    });

    test('스크린 리더에 메시지를 전달해야 함', () => {
      // 라이브 리전 생성
      const statusRegion = document.createElement('div');
      statusRegion.id = 'status-live-region';
      document.body.appendChild(statusRegion);

      const message = '스크린 리더 테스트';
      notificationManager.info(message);

      // 메시지가 라이브 리전에 전달되었는지 확인
      expect(statusRegion.textContent).toBe(message);
    });

    test('Escape 키로 알림을 닫을 수 있어야 함', () => {
      const id = notificationManager.info('키보드 테스트');

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });

      document.dispatchEvent(escapeEvent);

      // 알림이 닫혔는지 확인
      jest.advanceTimersByTime(300);
      const notification = document.querySelector('.notification');
      expect(notification).toBeFalsy();
    });
  });

  describe('알림 위치', () => {
    test('알림 위치를 변경할 수 있어야 함', () => {
      notificationManager.show({
        type: 'info',
        message: '위치 테스트',
        position: 'top-left',
      });

      const container = document.getElementById('notification-container');
      expect(container?.classList.contains('top-left')).toBe(true);
    });

    test('중앙 위치로 설정할 수 있어야 함', () => {
      notificationManager.show({
        type: 'info',
        message: '중앙 위치 테스트',
        position: 'top-center',
      });

      const container = document.getElementById('notification-container');
      expect(container?.classList.contains('top-center')).toBe(true);
    });
  });

  describe('콜백 함수', () => {
    test('표시 콜백이 호출되어야 함', () => {
      const onShow = jest.fn();
      
      notificationManager.show({
        type: 'info',
        message: '콜백 테스트',
        onShow,
      });

      expect(onShow).toHaveBeenCalled();
    });

    test('클릭 콜백이 호출되어야 함', () => {
      const onClick = jest.fn();
      
      notificationManager.show({
        type: 'info',
        message: '클릭 테스트',
        onClick,
      });

      const notification = document.querySelector('.notification') as HTMLElement;
      notification.click();

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('도움말 시스템', () => {
    test('도움말 버튼을 추가할 수 있어야 함', () => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);

      const helpId = notificationManager.help.addHelpButton(testElement, {
        title: '도움말 제목',
        content: '도움말 내용',
      });

      expect(helpId).toBeDefined();
      
      const helpButton = testElement.querySelector('.help-button');
      expect(helpButton).toBeTruthy();
      expect(helpButton?.getAttribute('aria-label')).toContain('도움말 제목');
    });
  });

  describe('툴팁 시스템', () => {
    test('툴팁을 추가할 수 있어야 함', () => {
      const testElement = document.createElement('button');
      testElement.textContent = '툴팁 테스트';
      document.body.appendChild(testElement);

      notificationManager.tooltip.add(testElement, {
        content: '툴팁 내용',
        position: 'top',
      });

      // 툴팁이 생성되었는지 확인
      const tooltip = document.querySelector('.help-tooltip');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toBe('툴팁 내용');
    });
  });

  describe('HTML 보안', () => {
    test('기본적으로 HTML을 이스케이프해야 함', () => {
      const maliciousMessage = '<script>alert("xss")</script>';
      
      notificationManager.info(maliciousMessage);

      const notification = document.querySelector('.notification-message');
      expect(notification?.innerHTML).not.toContain('<script>');
      expect(notification?.textContent).toBe(maliciousMessage);
    });

    test('allowHtml 옵션으로 HTML을 허용할 수 있어야 함', () => {
      const htmlMessage = '<strong>굵은 텍스트</strong>';
      
      notificationManager.show({
        type: 'info',
        message: htmlMessage,
        allowHtml: true,
      });

      const notification = document.querySelector('.notification-message');
      expect(notification?.innerHTML).toContain('<strong>');
    });
  });
});