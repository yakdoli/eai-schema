# EAI Schema Toolkit

**EAI Schema Toolkit**은 엔터프라이즈 애플리케이션 통합을 위한 강력한 스키마 변환 및 검증 도구입니다.

## 🌟 주요 기능

- **다중 스키마 형식 지원**: XML, JSON, YAML 스키마 처리
- **파일 업로드**: 드래그 앤 드롭 및 파일 선택 지원
- **URL 기반 가져오기**: 웹 URL에서 스키마 직접 가져오기
- **실시간 검증**: 스키마 유효성 검사 및 변환
- **RESTful API**: 완전한 REST API 인터페이스
- **웹 인터페이스**: GitHub Pages 호스팅 지원

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

```
eai-schema/
├── src/                    # 백엔드 소스 코드
│   ├── routes/            # API 라우트
│   ├── services/          # 비즈니스 로직
│   ├── middleware/        # 미들웨어
│   └── utils/             # 유틸리티
├── docs/                  # GitHub Pages 웹 인터페이스
│   ├── index.html        # 메인 웹 페이지
│   ├── style.css         # 스타일시트
│   ├── script.js         # 클라이언트 JavaScript
│   └── README.md         # 웹 인터페이스 문서
├── dist/                 # 빌드 출력
├── .github/workflows/    # GitHub Actions 워크플로
└── package.json          # Node.js 패키지 설정
```

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

# 코드 린팅
npm run lint

# 코드 린팅 및 자동 수정
npm run lint:fix

# 빌드 정리
npm run clean
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

## 🧪 테스트

```bash
# 단위 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# E2E 테스트
npm run test:e2e
```

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 개발 가이드라인

- TypeScript 사용
- ESLint 규칙 준수
- 단위 테스트 작성
- 커밋 메시지는 [Conventional Commits](https://conventionalcommits.org/) 형식 사용

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🐛 버그 리포트 & 기능 요청

GitHub Issues를 통해 버그 리포트나 기능 요청을 제출해 주세요:
- [버그 리포트](https://github.com/[username]/eai-schema/issues/new?template=bug_report.md)
- [기능 요청](https://github.com/[username]/eai-schema/issues/new?template=feature_request.md)

## 🆘 지원

- **문서**: [Wiki](https://github.com/[username]/eai-schema/wiki)
- **토론**: [GitHub Discussions](https://github.com/[username]/eai-schema/discussions)
- **이메일**: support@example.com

## 🔄 버전 관리

이 프로젝트는 [SemVer](http://semver.org/)를 따릅니다. 사용 가능한 버전은 [태그](https://github.com/[username]/eai-schema/tags)를 참조하세요.

## 📈 로드맵

- [ ] 더 많은 스키마 형식 지원 (Avro, Protobuf)
- [ ] 스키마 변환 기능 강화
- [ ] 실시간 협업 기능
- [ ] API 문서 자동 생성
- [ ] Docker 컨테이너 지원

---

**EAI Schema Toolkit**으로 더 나은 엔터프라이즈 통합을 경험하세요! 🚀