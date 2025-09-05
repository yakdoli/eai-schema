// Jest 테스트 환경 설정
/// <reference types="jest" />

// 테스트 환경 변수 설정
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // 테스트 중 로그 출력 최소화
process.env.PORT = "0"; // 랜덤 포트 사용

// 타임아웃 설정
jest.setTimeout(30000); // 통합 테스트를 위해 증가

// 전역 모킹
jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// 테스트 후 정리
afterAll(async () => {
  // 모든 타이머 정리
  jest.clearAllTimers();
  
  // 열린 핸들 정리를 위한 대기
  await new Promise(resolve => setTimeout(resolve, 500));
});

// 각 테스트 후 정리
afterEach(() => {
  // 모든 모킹 정리
  jest.clearAllMocks();
});