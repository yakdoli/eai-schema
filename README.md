# EAI Schema Toolkit

**EAI Schema Toolkit**은 엔터프라이즈 애플리케이션 통합을 위한 강력한 스키마 변환 및 검증 도구입니다.

## 🌟 주요 기능

- **다중 스키마 형식 지원**: XML, JSON, YAML 스키마 처리
- **파일 업로드**: 드래그 앤 드롭 및 파일 선택 지원
- **URL 기반 가져오기**: 웹 URL에서 스키마 직접 가져오기
- **실시간 검증**: 스키마 유효성 검사 및 변환
## 🚀 빠른 시작

### 웹 인터페이스 사용

GitHub Pages에서 호스팅되는 웹 인터페이스를 통해 쉽게 사용할 수 있습니다:

**🌐 [EAI Schema Toolkit 웹 인터페이스](https://[username].github.io/eai-schema/)**

### 로컬 개발

1. **저장소 클론**
   ```bash
   git clone https://github.com/[username]/eai-schema.git
   cd eai-schema
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

4. **프로덕션 빌드**
   ```bash
   npm run build
   npm start
   ```

## 📁 프로젝트 구조


## 🌐 GitHub Pages 배포

이 프로젝트는 GitHub Pages를 통해 정적 웹 인터페이스를 제공합니다.

### 자동 배포

GitHub Actions을 통한 자동 배포가 설정되어 있습니다:
- `main` 브랜치에 푸시할 때마다 자동으로 GitHub Pages에 배포
- `/docs` 폴더의 정적 파일들이 웹 인터페이스로 제공

### 수동 설정

1. GitHub 저장소 설정으로 이동
2. **Settings** → **Pages** 선택
3. Source를 **Deploy from a branch** 선택
4. Branch를 **main**, Folder를 **/ (root)** 선택
5. Save 클릭

### 백엔드 API 배포

웹 인터페이스는 별도의 백엔드 API가 필요합니다. 다음 플랫폼 중 하나에 배포하세요:

- **Heroku**: `git push heroku main`
- **Vercel**: `vercel --prod`
- **Railway**: `railway up`
- **Render**: GitHub 연동을 통한 자동 배포

## 📚 API 문서

자세한 API 문서는 [docs/api-documentation.md](docs/api-documentation.md)를 참조하세요.

### 파일 업로드

```http
POST /api/upload/file
Content-Type: multipart/form-data

file: [파일]
```

### URL에서 가져오기

```http
POST /api/upload/url
Content-Type: application/json

{
  "url": "https://example.com/schema.xml"
}
```

### 파일 정보 조회

```http
GET /api/upload/file/{fileId}
```

### 파일 다운로드

```http
GET /api/upload/file/{fileId}/content
```

### 파일 삭제

```http
DELETE /api/upload/file/{fileId}
```

### 업로드된 파일 목록

```http
GET /api/upload/files
```

### 메시지 매핑 생성

```http
POST /api/message-mapping/generate
Content-Type: application/json

{
  "configuration": {
    "messageType": "XML",
    "dataType": "json",
    "rootElement": "root"
  },
  "source": "<xml>...</xml>"
}
```


## 🛠️ 스크립트

```bash
# 개발 서버 실행 (핫 리로드)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# 통합 테스트 실행
npm run test:integration

# 코드 린팅
npm run lint

# 코드 린팅 및 자동 수정
npm run lint:fix

# 빌드 정리
npm run clean

# 모든 테스트 실행
npm run test:all
```

## 🔧 환경 설정

### 환경 변수

`.env` 파일을 생성하여 다음 환경 변수를 설정하세요:

```env
# 서버 포트
PORT=3001

# 프론트엔드 URL (CORS 설정)
FRONTEND_URL=https://[username].github.io

# 로그 레벨
LOG_LEVEL=info

# 파일 저장 경로
UPLOAD_PATH=./temp

# 파일 만료 시간 (시간 단위)
FILE_EXPIRY_HOURS=24
```

## 📋 지원 형식

### 입력 형식
- **XML** (.xml)
- **JSON** (.json) 
- **YAML** (.yaml, .yml)

### 파일 제한
- 최대 파일 크기: 50MB
- 파일 보관 기간: 24시간 (기본값)

## 🔒 보안 기능

- **CORS 보호**: 허용된 도메인에서만 API 접근 가능
- **Rate Limiting**: IP당 요청 속도 제한
- **파일 타입 검증**: 허용된 파일 형식만 업로드 가능
- **SSRF 방지**: URL 가져오기 시 보안 검증
- **Helmet.js**: 기본 보안 헤더 설정
- **XXE 방지**: XML 외부 엔티티 참조 방지

## 🧪 테스트

자세한 테스트 문서는 [docs/testing-suite.md](docs/testing-suite.md)를 참조하세요.

```bash
# 단위 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# 통합 테스트 실행
npm run test:integration

# 모든 테스트 실행
npm run test:all
```


## 🐛 버그 리포트 & 기능 요청

GitHub Issues를 통해 버그 리포트나 기능 요청을 제출해 주세요:
- [버그 리포트](https://github.com/[username]/eai-schema/issues/new?template=bug_report.md)
- [기능 요청](https://github.com/[username]/eai-schema/issues/new?template=feature_request.md)

## 🆘 지원

- **문서**: [Wiki](https://github.com/[username]/eai-schema/wiki)
- **토론**: [GitHub Discussions](https://github.com/[username]/eai-schema/discussions)
- **이메일**: support@example.com

