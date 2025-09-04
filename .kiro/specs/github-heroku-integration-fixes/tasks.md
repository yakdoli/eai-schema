# Implementation Plan

- [x] 1. TypeScript 빌드 오류 수정
  - Multer 타입 사용 방식을 Express.Multer.File로 수정
  - Jest 타입 정의를 tsconfig.json에 추가
  - _Requirements: 1.2, 1.3_

- [x] 1.1 Multer 네임스페이스 오류 수정
  - src/routes/upload.ts 파일에서 Multer.File을 Express.Multer.File로 변경
  - src/services/fileUploadService.ts 파일에서 동일한 타입 수정 적용
  - _Requirements: 1.2_

- [x] 1.2 Jest 타입 정의 문제 해결
  - tsconfig.json에 jest 타입을 types 배열에 추가
  - src/__tests__/setup.ts에서 jest 전역 함수 타입 오류 해결
  - _Requirements: 1.3_

- [x] 2. Express 서버 설정 오류 수정
  - Rate limit 설정에서 trustProxy 옵션 제거
  - MCP 라우터 등록 확인 및 기본 경로 핸들러 추가
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.1 Rate limiting 설정 수정
  - src/index.ts에서 rate limit 설정의 trustProxy 옵션 제거
  - X-Forwarded-For 헤더 관련 경고 해결
  - _Requirements: 2.3_

- [x] 2.2 MCP 라우터 404 오류 해결
  - src/mcp/mcpController.ts에 기본 경로 핸들러 추가
  - 라우터 등록이 올바르게 되어 있는지 확인
  - _Requirements: 2.2, 3.1_

- [-] 3. 빌드 및 배포 검증
  - 로컬에서 TypeScript 컴파일 테스트
  - Heroku 배포 후 MCP 엔드포인트 동작 확인
  - _Requirements: 4.3, 5.2_

- [x] 3.1 로컬 빌드 테스트
  - npm run build 명령어로 TypeScript 컴파일 오류 해결 확인
  - npm test 명령어로 Jest 설정 문제 해결 확인
  - _Requirements: 4.1, 4.3_

- [-] 3.2 Heroku 배포 검증
  - 수정된 코드를 GitHub에 푸시하여 자동 배포 트리거
  - /api/mcp/provider 엔드포인트 접근 가능 여부 확인
  - 서버 로그에서 trust proxy 경고 해결 확인
  - _Requirements: 5.2, 2.1_