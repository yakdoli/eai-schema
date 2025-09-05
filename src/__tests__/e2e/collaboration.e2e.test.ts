import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('협업 기능 E2E 테스트', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser }) => {
    // 두 개의 독립적인 브라우저 컨텍스트 생성 (다른 사용자 시뮬레이션)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // 두 페이지 모두 그리드 페이지로 이동
    await Promise.all([
      page1.goto('/grid.html'),
      page2.goto('/grid.html')
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('다중 사용자 협업 세션 생성 및 참여', async () => {
    // 첫 번째 사용자: 새 협업 세션 생성
    await page1.click('#new-session-button');
    await page1.fill('#session-name', '테스트 협업 세션');
    await page1.fill('#user-name', '사용자 1');
    await page1.click('#create-session-button');

    // 세션 ID 획득
    await page1.waitForSelector('#session-id');
    const sessionId = await page1.locator('#session-id').textContent();
    expect(sessionId).toBeTruthy();

    // 두 번째 사용자: 기존 세션에 참여
    await page2.click('#join-session-button');
    await page2.fill('#session-id-input', sessionId!);
    await page2.fill('#user-name', '사용자 2');
    await page2.click('#join-session-confirm');

    // 두 사용자 모두 세션에 참여했는지 확인
    await Promise.all([
      expect(page1.locator('#active-users')).toContainText('사용자 1'),
      expect(page1.locator('#active-users')).toContainText('사용자 2'),
      expect(page2.locator('#active-users')).toContainText('사용자 1'),
      expect(page2.locator('#active-users')).toContainText('사용자 2')
    ]);

    // 사용자 수 확인
    const userCount1 = await page1.locator('#user-count').textContent();
    const userCount2 = await page2.locator('#user-count').textContent();
    expect(userCount1).toBe('2');
    expect(userCount2).toBe('2');
  });

  test('실시간 그리드 편집 동기화', async () => {
    // 협업 세션 설정
    await setupCollaborationSession(page1, page2, '실시간 편집 테스트');

    // 첫 번째 사용자가 셀 편집
    await page1.click('[data-row="0"][data-col="0"]');
    await page1.fill('[data-row="0"][data-col="0"] input', 'User1 Data');
    await page1.keyboard.press('Enter');

    // 두 번째 사용자 화면에서 변경사항 확인
    await page2.waitForFunction(
      () => {
        const cell = document.querySelector('[data-row="0"][data-col="0"]');
        return cell?.textContent === 'User1 Data';
      },
      {},
      { timeout: 5000 }
    );

    const cellValue = await page2.locator('[data-row="0"][data-col="0"]').textContent();
    expect(cellValue).toBe('User1 Data');

    // 두 번째 사용자가 다른 셀 편집
    await page2.click('[data-row="1"][data-col="1"]');
    await page2.fill('[data-row="1"][data-col="1"] input', 'User2 Data');
    await page2.keyboard.press('Enter');

    // 첫 번째 사용자 화면에서 변경사항 확인
    await page1.waitForFunction(
      () => {
        const cell = document.querySelector('[data-row="1"][data-col="1"]');
        return cell?.textContent === 'User2 Data';
      },
      {},
      { timeout: 5000 }
    );

    const cellValue2 = await page1.locator('[data-row="1"][data-col="1"]').textContent();
    expect(cellValue2).toBe('User2 Data');
  });

  test('커서 위치 및 선택 영역 동기화', async () => {
    await setupCollaborationSession(page1, page2, '커서 동기화 테스트');

    // 첫 번째 사용자가 셀 선택
    await page1.click('[data-row="2"][data-col="3"]');

    // 두 번째 사용자 화면에서 첫 번째 사용자의 커서 표시 확인
    await page2.waitForSelector('[data-user="user1"][data-row="2"][data-col="3"].cursor-indicator', {
      timeout: 5000
    });

    const cursorIndicator = page2.locator('[data-user="user1"][data-row="2"][data-col="3"].cursor-indicator');
    await expect(cursorIndicator).toBeVisible();

    // 범위 선택 테스트
    await page1.click('[data-row="0"][data-col="0"]');
    await page1.keyboard.down('Shift');
    await page1.click('[data-row="2"][data-col="2"]');
    await page1.keyboard.up('Shift');

    // 두 번째 사용자 화면에서 선택 영역 표시 확인
    await page2.waitForSelector('.selection-overlay[data-user="user1"]', {
      timeout: 5000
    });

    const selectionOverlay = page2.locator('.selection-overlay[data-user="user1"]');
    await expect(selectionOverlay).toBeVisible();
  });

  test('동시 편집 충돌 해결', async () => {
    await setupCollaborationSession(page1, page2, '충돌 해결 테스트');

    // 같은 셀을 동시에 편집 시도
    const cellSelector = '[data-row="1"][data-col="1"]';
    
    // 거의 동시에 셀 클릭
    await Promise.all([
      page1.click(cellSelector),
      page2.click(cellSelector)
    ]);

    // 첫 번째 사용자가 먼저 입력
    await page1.fill(`${cellSelector} input`, 'First Edit');
    
    // 두 번째 사용자가 조금 늦게 입력
    await page2.waitForTimeout(100);
    await page2.fill(`${cellSelector} input`, 'Second Edit');

    // 두 사용자 모두 Enter 키 입력
    await Promise.all([
      page1.keyboard.press('Enter'),
      page2.keyboard.press('Enter')
    ]);

    // 충돌 해결 다이얼로그 확인 (두 번째 사용자에게 표시)
    await page2.waitForSelector('#conflict-resolution-dialog', { timeout: 5000 });
    await expect(page2.locator('#conflict-resolution-dialog')).toBeVisible();

    // 충돌 해결 옵션 확인
    await expect(page2.locator('#conflict-options')).toContainText('First Edit');
    await expect(page2.locator('#conflict-options')).toContainText('Second Edit');

    // 첫 번째 사용자의 변경사항 수락
    await page2.click('#accept-other-change');

    // 최종 값 확인
    const finalValue1 = await page1.locator(cellSelector).textContent();
    const finalValue2 = await page2.locator(cellSelector).textContent();
    
    expect(finalValue1).toBe('First Edit');
    expect(finalValue2).toBe('First Edit');
  });

  test('행/열 추가 및 삭제 동기화', async () => {
    await setupCollaborationSession(page1, page2, '구조 변경 테스트');

    // 첫 번째 사용자가 행 추가
    await page1.rightClick('[data-row="2"]');
    await page1.click('#context-menu-insert-row');

    // 두 번째 사용자 화면에서 새 행 확인
    await page2.waitForSelector('[data-row="3"]', { timeout: 5000 });
    await expect(page2.locator('[data-row="3"]')).toBeVisible();

    // 두 번째 사용자가 열 추가
    await page2.rightClick('[data-col="1"]');
    await page2.click('#context-menu-insert-column');

    // 첫 번째 사용자 화면에서 새 열 확인
    await page1.waitForSelector('[data-col="2"]', { timeout: 5000 });
    
    // 그리드 구조가 동일한지 확인
    const rows1 = await page1.locator('[data-row]').count();
    const rows2 = await page2.locator('[data-row]').count();
    const cols1 = await page1.locator('[data-col="0"]').count();
    const cols2 = await page2.locator('[data-col="0"]').count();

    expect(rows1).toBe(rows2);
    expect(cols1).toBe(cols2);
  });

  test('사용자 연결 해제 및 재연결', async () => {
    await setupCollaborationSession(page1, page2, '연결 관리 테스트');

    // 초기 사용자 수 확인
    let userCount = await page1.locator('#user-count').textContent();
    expect(userCount).toBe('2');

    // 두 번째 사용자 연결 해제 (페이지 새로고침으로 시뮬레이션)
    await page2.reload();

    // 첫 번째 사용자 화면에서 사용자 수 감소 확인
    await page1.waitForFunction(
      () => document.querySelector('#user-count')?.textContent === '1',
      {},
      { timeout: 5000 }
    );

    userCount = await page1.locator('#user-count').textContent();
    expect(userCount).toBe('1');

    // 사용자 목록에서 두 번째 사용자 제거 확인
    await expect(page1.locator('#active-users')).not.toContainText('사용자 2');

    // 두 번째 사용자 재연결
    await page2.goto('/grid.html');
    await page2.waitForLoadState('networkidle');
    
    const sessionId = await page1.locator('#session-id').textContent();
    await page2.click('#join-session-button');
    await page2.fill('#session-id-input', sessionId!);
    await page2.fill('#user-name', '사용자 2');
    await page2.click('#join-session-confirm');

    // 사용자 수 복구 확인
    await page1.waitForFunction(
      () => document.querySelector('#user-count')?.textContent === '2',
      {},
      { timeout: 5000 }
    );

    userCount = await page1.locator('#user-count').textContent();
    expect(userCount).toBe('2');
  });

  test('세션 권한 관리', async () => {
    // 첫 번째 사용자가 세션 생성 (소유자)
    await page1.click('#new-session-button');
    await page1.fill('#session-name', '권한 테스트 세션');
    await page1.fill('#user-name', '소유자');
    await page1.click('#create-session-button');

    const sessionId = await page1.locator('#session-id').textContent();

    // 두 번째 사용자가 읽기 전용으로 참여
    await page2.click('#join-session-button');
    await page2.fill('#session-id-input', sessionId!);
    await page2.fill('#user-name', '읽기전용사용자');
    await page2.selectOption('#permission-level', 'read-only');
    await page2.click('#join-session-confirm');

    // 읽기 전용 사용자 UI 확인
    await expect(page2.locator('#grid-container')).toHaveClass(/read-only/);
    await expect(page2.locator('#edit-toolbar')).not.toBeVisible();

    // 읽기 전용 사용자가 편집 시도
    await page2.click('[data-row="0"][data-col="0"]');
    
    // 편집 불가 메시지 확인
    await expect(page2.locator('#permission-denied-message')).toBeVisible();
    await expect(page2.locator('#permission-denied-message')).toContainText('읽기 전용');

    // 소유자는 정상적으로 편집 가능
    await page1.click('[data-row="0"][data-col="0"]');
    await page1.fill('[data-row="0"][data-col="0"] input', '소유자 편집');
    await page1.keyboard.press('Enter');

    // 읽기 전용 사용자도 변경사항은 볼 수 있음
    await page2.waitForFunction(
      () => {
        const cell = document.querySelector('[data-row="0"][data-col="0"]');
        return cell?.textContent === '소유자 편집';
      },
      {},
      { timeout: 5000 }
    );
  });

  test('협업 세션 히스토리 및 되돌리기', async () => {
    await setupCollaborationSession(page1, page2, '히스토리 테스트');

    // 여러 변경사항 적용
    const changes = [
      { row: 0, col: 0, value: '변경1' },
      { row: 0, col: 1, value: '변경2' },
      { row: 1, col: 0, value: '변경3' }
    ];

    for (const change of changes) {
      await page1.click(`[data-row="${change.row}"][data-col="${change.col}"]`);
      await page1.fill(`[data-row="${change.row}"][data-col="${change.col}"] input`, change.value);
      await page1.keyboard.press('Enter');
      await page1.waitForTimeout(500); // 변경사항 동기화 대기
    }

    // 히스토리 패널 열기
    await page1.click('#history-panel-toggle');
    await expect(page1.locator('#history-panel')).toBeVisible();

    // 히스토리 항목 확인
    const historyItems = page1.locator('.history-item');
    await expect(historyItems).toHaveCount(3);

    // 두 번째 변경사항으로 되돌리기
    await page1.click('.history-item:nth-child(2) .restore-button');

    // 되돌리기 확인 다이얼로그
    await page1.click('#confirm-restore');

    // 두 사용자 모두에서 상태 확인
    await Promise.all([
      page1.waitForFunction(
        () => {
          const cell = document.querySelector('[data-row="1"][data-col="0"]');
          return cell?.textContent === '';
        },
        {},
        { timeout: 5000 }
      ),
      page2.waitForFunction(
        () => {
          const cell = document.querySelector('[data-row="1"][data-col="0"]');
          return cell?.textContent === '';
        },
        {},
        { timeout: 5000 }
      )
    ]);

    // 첫 두 변경사항은 유지되어야 함
    const cell1Value1 = await page1.locator('[data-row="0"][data-col="0"]').textContent();
    const cell1Value2 = await page1.locator('[data-row="0"][data-col="1"]').textContent();
    
    expect(cell1Value1).toBe('변경1');
    expect(cell1Value2).toBe('변경2');
  });

  // 헬퍼 함수: 협업 세션 설정
  async function setupCollaborationSession(page1: Page, page2: Page, sessionName: string) {
    // 첫 번째 사용자가 세션 생성
    await page1.click('#new-session-button');
    await page1.fill('#session-name', sessionName);
    await page1.fill('#user-name', '사용자 1');
    await page1.click('#create-session-button');

    const sessionId = await page1.locator('#session-id').textContent();

    // 두 번째 사용자가 세션 참여
    await page2.click('#join-session-button');
    await page2.fill('#session-id-input', sessionId!);
    await page2.fill('#user-name', '사용자 2');
    await page2.click('#join-session-confirm');

    // 두 사용자 모두 세션에 참여할 때까지 대기
    await Promise.all([
      page1.waitForFunction(() => document.querySelector('#user-count')?.textContent === '2'),
      page2.waitForFunction(() => document.querySelector('#user-count')?.textContent === '2')
    ]);
  }
});