# EAI Schema Toolkit - Agent Hooks 설정

## 📁 Hook 파일 목록

### 🔧 코드 품질 관련
- **`typescript-quality-check.json`** - TypeScript 코드 품질 및 보안 검사
- **`test-completeness-check.json`** - 테스트 완성도 및 커버리지 검사

### 🛡️ 보안 관련
- **`api-security-check.json`** - API 라우터 보안 검사 (Critical)
- **`schema-processing-security.json`** - 스키마 처리 보안 검사 (Critical)
- **`environment-config-security.json`** - 환경 설정 보안 검사

### 🏗️ 아키텍처 관련
- **`mcp-integration-check.json`** - MCP 통합 아키텍처 검사
- **`realtime-collaboration-check.json`** - WebSocket 실시간 협업 검사

### 📚 문서화 관련
- **`documentation-quality-check.json`** - 문서 품질 및 한국어 검사

### 🚀 배포 관련
- **`deployment-readiness-check.json`** - CI/CD 및 배포 준비 검사 (Critical)

## 🚀 빠른 시작

### 1. VS Code에서 설정하기
```bash
# Kiro 확장 프로그램 설치 후
1. Kiro 패널 열기
2. Agent Hooks 섹션 → "+" 클릭
3. 아래 hook 파일 중 하나를 선택하여 import
4. 필요에 따라 파일 패턴 조정
```

### 2. 권장 설정 순서
1. **`api-security-check.json`** (Critical) - 보안 최우선
2. **`typescript-quality-check.json`** - 코드 품질 기본
3. **`schema-processing-security.json`** (Critical) - 핵심 기능 보안
4. **`deployment-readiness-check.json`** (Critical) - 배포 안정성
5. 나머지 hook들을 팀 상황에 맞게 추가

### 3. 팀별 커스터마이징
```json
// 각 hook 파일에서 수정 가능한 부분:
{
  "enabled": true,           // hook 활성화/비활성화
  "priority": "high",        // 우선순위 조정
  "trigger": {
    "patterns": [...],       // 파일 패턴 조정
    "exclude": [...]         // 제외할 파일 패턴
  }
}
```

## 📋 Hook별 상세 설명

### 🔧 typescript-quality-check.json
**대상**: `src/**/*.ts`, `src/**/*.tsx` (테스트 파일 제외)
**목적**: TypeScript 코드의 품질, 보안, 성능 검사
**주요 체크 항목**:
- any 타입 사용 금지
- console.log 대신 Winston 로거 사용
- 적절한 에러 처리
- 보안 취약점 검사

### 🛡️ api-security-check.json (Critical)
**대상**: `src/routes/*.ts`
**목적**: API 엔드포인트의 보안 검사
**주요 체크 항목**:
- 입력 검증 미들웨어
- 레이트 리미팅
- CORS 설정
- 인증/권한 검사
- SSRF/XXE 방지

### 🧪 test-completeness-check.json
**대상**: `**/*.test.ts`, `**/*.spec.ts`
**목적**: 테스트 완성도 및 품질 검사
**주요 체크 항목**:
- 테스트 커버리지 (성공/실패/경계값)
- 테스트 구조 (describe/it)
- 모킹 전략
- 보안 테스트

### 🔒 schema-processing-security.json (Critical)
**대상**: 스키마 처리 관련 서비스 파일
**목적**: EAI 핵심 기능의 보안 검사
**주요 체크 항목**:
- XXE 공격 방지
- JSON/YAML 안전한 파싱
- 파일 업로드 보안
- 성능 최적화

### ⚙️ environment-config-security.json
**대상**: `.env*`, `*.config.*`, `package.json`
**목적**: 환경 설정 보안 및 배포 준비
**주요 체크 항목**:
- 민감 정보 하드코딩 방지
- 환경 변수 적절한 사용
- 보안 설정 확인
- 배포 환경 준비

### 🔌 mcp-integration-check.json
**대상**: `src/mcp/*.ts`, `mcp-server/**/*.ts`
**목적**: MCP 통합 아키텍처 검사
**주요 체크 항목**:
- MCP 패턴 준수
- 프로바이더 인터페이스
- 확장성 및 성능
- 외부 도구 통합

### 🔄 realtime-collaboration-check.json
**대상**: 실시간 협업 관련 파일
**목적**: WebSocket 기반 협업 기능 검사
**주요 체크 항목**:
- WebSocket 연결 관리
- 메시지 처리 및 동기화
- 동시 사용자 처리
- 성능 최적화

### 📚 documentation-quality-check.json
**대상**: `**/*.md` (문서 파일)
**목적**: 문서 품질 및 한국어 검사
**주요 체크 항목**:
- 내용 완성도 및 정확성
- 한국어 맞춤법/문법
- 기술 문서 품질
- 사용자 경험

### 🚀 deployment-readiness-check.json (Critical)
**대상**: CI/CD 및 배포 관련 파일
**목적**: 배포 안정성 및 준비 상태 검사
**주요 체크 항목**:
- CI/CD 파이프라인
- 환경별 배포 전략
- 보안 설정
- 모니터링 및 알림

## 🎯 사용 팁

### 1. 단계별 도입
```
Week 1: Critical hooks만 활성화 (보안 중심)
Week 2: 코드 품질 hooks 추가
Week 3: 문서화 및 테스트 hooks 추가
Week 4: 전체 hooks 활성화 및 최적화
```

### 2. 성능 고려사항
- **응답 시간**: 복잡한 프롬프트는 응답 시간이 길어질 수 있음
- **빈도 조절**: 자주 저장하는 파일은 간단한 체크만
- **선택적 활성화**: 개발 단계에 따라 필요한 hook만 활성화

### 3. 팀 협업
- **표준화**: 팀 전체가 동일한 hook 설정 사용
- **피드백**: 정기적으로 hook 효과성 검토
- **커스터마이징**: 프로젝트 특성에 맞게 조정

### 4. 문제 해결
```
Hook이 실행되지 않는 경우:
1. Kiro 확장 프로그램 활성화 확인
2. 파일 패턴 매칭 확인
3. Hook 설정에서 enabled: true 확인

응답이 느린 경우:
1. 프롬프트 길이 단축
2. 체크 항목 수 줄이기
3. 네트워크 연결 상태 확인
```

## 🔄 업데이트 및 유지보수

### 정기 검토 (월 1회)
- [ ] Hook 실행 빈도 및 효과성 검토
- [ ] 새로운 보안 요구사항 반영
- [ ] 프롬프트 최적화
- [ ] 팀 피드백 수집 및 반영

### 프로젝트 진행에 따른 조정
- **개발 초기**: 보안 및 아키텍처 중심
- **개발 중기**: 코드 품질 및 테스트 중심
- **배포 준비**: 배포 및 문서화 중심
- **운영 단계**: 성능 및 모니터링 중심

이러한 Agent Hooks를 통해 EAI Schema Toolkit의 개발 품질과 보안을 자동으로 유지할 수 있습니다.