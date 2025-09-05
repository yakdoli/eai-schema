import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('스키마 변환 E2E 테스트', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('메인 페이지 로드 및 기본 UI 확인', async () => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/EAI Schema Toolkit/);
    
    // 주요 UI 요소 확인
    await expect(page.locator('h1')).toContainText('EAI Schema Toolkit');
    await expect(page.locator('#file-upload')).toBeVisible();
    await expect(page.locator('#format-select')).toBeVisible();
    await expect(page.locator('#target-format-select')).toBeVisible();
  });

  test('파일 업로드 및 변환 워크플로우', async () => {
    // JSON 스키마 파일 생성
    const jsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        email: { type: 'string', format: 'email' }
      },
      required: ['name', 'age']
    };

    // 임시 파일 생성
    const tempFile = path.join(__dirname, 'temp-schema.json');
    await page.evaluate(async (content) => {
      const blob = new Blob([content], { type: 'application/json' });
      const file = new File([blob], 'test-schema.json', { type: 'application/json' });
      
      // 파일 입력 요소에 파일 설정
      const input = document.querySelector('#file-upload') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      // 변경 이벤트 트리거
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, JSON.stringify(jsonSchema));

    // 형식 선택
    await page.selectOption('#format-select', 'json');
    await page.selectOption('#target-format-select', 'xml');

    // 변환 버튼 클릭
    await page.click('#convert-button');

    // 로딩 상태 확인
    await expect(page.locator('#loading-indicator')).toBeVisible();

    // 결과 대기 및 확인
    await page.waitForSelector('#conversion-result', { timeout: 10000 });
    await expect(page.locator('#conversion-result')).toBeVisible();
    
    // XML 결과 확인
    const resultText = await page.locator('#conversion-result').textContent();
    expect(resultText).toContain('<?xml');
    expect(resultText).toContain('schema');
  });

  test('드래그 앤 드롭 파일 업로드', async () => {
    // 드롭 영역 확인
    const dropZone = page.locator('#drop-zone');
    await expect(dropZone).toBeVisible();

    // 파일 드래그 오버 시뮬레이션
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: {
        types: ['Files'],
        files: []
      }
    });

    // 드롭 영역 스타일 변경 확인
    await expect(dropZone).toHaveClass(/drag-over/);

    // YAML 파일 내용 시뮬레이션
    const yamlContent = `
      type: object
      properties:
        user:
          type: object
          properties:
            id: { type: string }
            name: { type: string }
            email: { type: string, format: email }
          required: [id, name]
    `;

    // 파일 드롭 시뮬레이션
    await page.evaluate(async (content) => {
      const dropZone = document.querySelector('#drop-zone');
      const file = new File([content], 'test.yaml', { type: 'application/x-yaml' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true
      });
      
      dropZone?.dispatchEvent(dropEvent);
    }, yamlContent);

    // 파일 업로드 확인
    await expect(page.locator('#uploaded-file-name')).toContainText('test.yaml');
    
    // 자동 형식 감지 확인
    const formatSelect = page.locator('#format-select');
    await expect(formatSelect).toHaveValue('yaml');
  });

  test('실시간 스키마 검증', async () => {
    // 텍스트 에디터 모드로 전환
    await page.click('#text-editor-tab');
    
    // 잘못된 JSON 입력
    const invalidJson = '{ "type": "invalid-type", "properties": }';
    await page.fill('#schema-editor', invalidJson);

    // 실시간 검증 결과 확인
    await page.waitForSelector('#validation-errors', { timeout: 5000 });
    await expect(page.locator('#validation-errors')).toBeVisible();
    
    const errorText = await page.locator('#validation-errors').textContent();
    expect(errorText).toContain('Syntax error');

    // 올바른 JSON으로 수정
    const validJson = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    }, null, 2);

    await page.fill('#schema-editor', validJson);

    // 검증 성공 확인
    await expect(page.locator('#validation-success')).toBeVisible();
    await expect(page.locator('#validation-errors')).not.toBeVisible();
  });

  test('URL에서 스키마 가져오기', async () => {
    // URL 입력 탭으로 전환
    await page.click('#url-input-tab');

    // 테스트용 URL 입력 (실제로는 모킹된 엔드포인트 사용)
    await page.fill('#schema-url', 'https://httpbin.org/json');
    await page.selectOption('#url-format-select', 'json');

    // 가져오기 버튼 클릭
    await page.click('#fetch-schema-button');

    // 로딩 상태 확인
    await expect(page.locator('#fetch-loading')).toBeVisible();

    // 결과 확인
    await page.waitForSelector('#fetched-schema', { timeout: 15000 });
    await expect(page.locator('#fetched-schema')).toBeVisible();
    
    // 가져온 스키마가 에디터에 표시되는지 확인
    const editorContent = await page.locator('#schema-editor').inputValue();
    expect(editorContent.length).toBeGreaterThan(0);
  });

  test('변환 결과 다운로드', async () => {
    // 간단한 스키마 입력
    const simpleSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' }
      }
    };

    await page.evaluate((schema) => {
      const input = document.querySelector('#file-upload') as HTMLInputElement;
      const file = new File([JSON.stringify(schema)], 'simple.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, simpleSchema);

    // 변환 실행
    await page.selectOption('#format-select', 'json');
    await page.selectOption('#target-format-select', 'yaml');
    await page.click('#convert-button');

    // 결과 대기
    await page.waitForSelector('#conversion-result');

    // 다운로드 버튼 확인 및 클릭
    await expect(page.locator('#download-button')).toBeVisible();
    
    // 다운로드 시작
    const downloadPromise = page.waitForEvent('download');
    await page.click('#download-button');
    const download = await downloadPromise;

    // 다운로드 파일 정보 확인
    expect(download.suggestedFilename()).toContain('.yaml');
  });

  test('에러 처리 및 사용자 피드백', async () => {
    // 지원되지 않는 파일 형식 업로드 시뮬레이션
    await page.evaluate(() => {
      const input = document.querySelector('#file-upload') as HTMLInputElement;
      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 에러 메시지 확인
    await expect(page.locator('#error-message')).toBeVisible();
    const errorText = await page.locator('#error-message').textContent();
    expect(errorText).toContain('지원되지 않는 파일 형식');

    // 에러 메시지 닫기
    await page.click('#error-close-button');
    await expect(page.locator('#error-message')).not.toBeVisible();
  });

  test('반응형 디자인 테스트', async () => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });

    // 모바일에서 UI 요소 확인
    await expect(page.locator('#mobile-menu-button')).toBeVisible();
    
    // 메뉴 토글
    await page.click('#mobile-menu-button');
    await expect(page.locator('#mobile-menu')).toBeVisible();

    // 태블릿 뷰포트로 변경
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 태블릿에서 레이아웃 확인
    await expect(page.locator('#main-content')).toHaveClass(/tablet-layout/);

    // 데스크톱 뷰포트로 복원
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('#main-content')).toHaveClass(/desktop-layout/);
  });

  test('키보드 네비게이션 접근성', async () => {
    // Tab 키로 네비게이션 테스트
    await page.keyboard.press('Tab');
    await expect(page.locator('#file-upload')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#format-select')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#target-format-select')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#convert-button')).toBeFocused();

    // Enter 키로 버튼 활성화 테스트
    await page.keyboard.press('Enter');
    
    // 파일이 없을 때 적절한 에러 메시지 표시 확인
    await expect(page.locator('#validation-message')).toContainText('파일을 선택해주세요');
  });

  test('다크 모드 토글', async () => {
    // 다크 모드 토글 버튼 확인
    await expect(page.locator('#theme-toggle')).toBeVisible();

    // 현재 테마 확인 (기본값은 라이트 모드)
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark-theme/);

    // 다크 모드로 전환
    await page.click('#theme-toggle');
    await expect(body).toHaveClass(/dark-theme/);

    // 다크 모드에서 UI 요소들이 올바르게 표시되는지 확인
    await expect(page.locator('#main-header')).toHaveClass(/dark/);
    await expect(page.locator('#conversion-panel')).toHaveClass(/dark/);

    // 라이트 모드로 다시 전환
    await page.click('#theme-toggle');
    await expect(body).not.toHaveClass(/dark-theme/);
  });
});