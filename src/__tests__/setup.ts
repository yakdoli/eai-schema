// Jest 테스트 환경 설정
/// <reference types="jest" />

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 테스트 중 로그 출력 최소화

// 타임아웃 설정
jest.setTimeout(10000);

// 테스트 후 정리
afterAll(async () => {
  // 모든 타이머 정리
  jest.clearAllTimers();
  
  // 열린 핸들 정리를 위한 대기
  await new Promise(resolve => setTimeout(resolve, 100));
});