# Design Document

## Overview

현재 발생하고 있는 주요 빌드 및 런타임 오류들을 디버깅하고 수정하는 것에 집중합니다. 복잡한 아키텍처 변경 없이 기존 코드의 문제점을 찾아 최소한의 수정으로 해결합니다.

## Architecture

### 1. 문제 진단 및 수정 접근법

```
현재 문제들:
├── TypeScript 빌드 오류
│   ├── Multer 네임스페이스 오류 (src/routes/upload.ts, src/services/fileUploadService.ts)
│   └── Jest 타입 정의 누락 (src/__tests__/setup.ts)
├── Express 서버 설정 문제  
│   ├── Trust proxy 경고
│   └── Rate limit X-Forwarded-For 오류
└── MCP 라우팅 404 오류
    └── /api/mcp/provider 엔드포인트 접근 불가
```

### 2. 간단한 수정 전략

- **TypeScript 오류**: 타입 정의 수정 및 import 구문 개선
- **Express 설정**: 기존 설정 미세 조정
- **MCP 라우팅**: 라우터 등록 확인 및 수정

## Components and Interfaces

### 1. 수정이 필요한 파일들

- `src/routes/upload.ts`: Multer 타입 사용 방식 수정
- `src/services/fileUploadService.ts`: Multer 타입 사용 방식 수정  
- `src/__tests__/setup.ts`: Jest 타입 정의 추가
- `src/index.ts`: Rate limit 설정 수정
- `tsconfig.json`: Jest 타입 포함 설정

## Error Handling

### 1. TypeScript 빌드 오류 수정

- **Multer 네임스페이스 오류**: `Multer.File` → `Express.Multer.File` 타입 사용
- **Jest 전역 함수 오류**: tsconfig.json에 jest 타입 추가

### 2. Express 런타임 오류 수정

- **Trust Proxy 경고**: 이미 설정되어 있으므로 rate limit 설정만 조정
- **Rate Limiting 오류**: trustProxy 옵션 제거

### 3. MCP 라우팅 오류 수정

- **404 오류**: 라우터 등록 확인 및 기본 경로 핸들러 추가

## Testing Strategy

간단한 수정 후 기존 테스트가 통과하는지 확인만 진행합니다.