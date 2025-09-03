# EAI Schema Toolkit - Web Interface

이 디렉토리는 **EAI Schema Toolkit**의 GitHub Pages 호스팅용 웹 인터페이스입니다.

## 🌟 기능

- **파일 업로드**: 드래그 앤 드롭 또는 파일 선택을 통한 스키마 파일 업로드
- **URL 가져오기**: 웹 URL에서 스키마 파일 직접 가져오기
- **파일 관리**: 업로드된 파일의 조회, 다운로드, 삭제
- **반응형 디자인**: 모든 디바이스에서 최적화된 사용자 경험
- **실시간 알림**: 작업 상태에 대한 즉시 피드백

## 📋 지원 형식

- **XML** (.xml)
- **JSON** (.json)
- **YAML** (.yaml, .yml)

## 🚀 GitHub Pages 설정

### 1. 저장소 설정

1. GitHub 저장소로 이동
2. **Settings** 탭 클릭
3. 좌측 사이드바에서 **Pages** 선택
4. Source를 **Deploy from a branch**로 설정
5. Branch를 **main** (또는 해당 브랜치) 선택
6. Folder를 **/ (root)** 또는 **/docs** 선택
7. **Save** 클릭

### 2. 접근 URL

설정 완료 후 다음 URL로 접근 가능합니다:
```
https://[username].github.io/[repository-name]/
```

예시:
```
https://johndoe.github.io/eai-schema/
```

## ⚙️ 백엔드 API 설정

웹 인터페이스는 별도의 백엔드 API 서버가 필요합니다.

### 로컬 개발

1. 백엔드 서버 실행:
   ```bash
   cd ..  # 상위 디렉토리로 이동
   npm run dev  # 또는 npm start
   ```

2. 웹 인터페이스에서 설정 버튼(⚙️) 클릭
3. API URL을 `http://localhost:3001`로 설정

### 프로덕션 배포

백엔드 서버를 다음 중 하나의 플랫폼에 배포:

- **Heroku**: https://heroku.com
- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Render**: https://render.com
- **AWS/GCP/Azure**: 클라우드 서버

배포 후 웹 인터페이스의 설정에서 배포된 서버 URL로 설정 변경

## 🛠️ 개발 가이드

### 로컬 개발 서버

정적 파일 서버를 실행하여 로컬에서 테스트:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server 필요)
npx http-server

# PHP
php -S localhost:8000
```

### 파일 구조

```
docs/
├── index.html      # 메인 HTML 페이지
├── style.css       # 스타일시트
├── script.js       # JavaScript 로직
└── README.md       # 이 파일
```

### 주요 컴포넌트

- **Tab System**: 파일 업로드와 URL 가져오기 전환
- **Drop Zone**: 드래그 앤 드롭 파일 업로드
- **File Manager**: 업로드된 파일 목록 관리
- **Settings Modal**: API URL 설정
- **Toast Notifications**: 사용자 피드백

## 🔧 커스터마이징

### API URL 변경

JavaScript 파일에서 기본 API URL을 수정:

```javascript
// script.js의 constructor에서
this.apiUrl = localStorage.getItem('apiUrl') || 'YOUR_API_URL_HERE';
```

### 스타일 커스터마이징

`style.css` 파일의 CSS 변수를 수정하여 색상과 스타일 변경:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #28a745;
    --error-color: #dc3545;
}
```

## 🌐 CORS 설정

백엔드 서버에서 CORS 설정이 필요합니다:

```javascript
// 백엔드 서버에서
app.use(cors({
    origin: 'https://[username].github.io',  // GitHub Pages URL
    credentials: true
}));
```

## 📱 PWA 기능 (선택사항)

Service Worker를 추가하여 PWA로 확장 가능:

1. `sw.js` 파일 생성
2. 매니페스트 파일 추가
3. 오프라인 기능 구현

## 🐛 문제 해결

### 일반적인 문제들

1. **CORS 오류**
   - 백엔드의 CORS 설정 확인
   - API URL이 올바른지 확인

2. **파일 업로드 실패**
   - 파일 크기 제한 (50MB) 확인
   - 지원되는 파일 형식인지 확인

3. **API 연결 실패**
   - 백엔드 서버가 실행 중인지 확인
   - 네트워크 연결 상태 확인

### 브라우저 호환성

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📄 라이선스

이 프로젝트는 백엔드와 동일한 라이선스를 따릅니다.

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성
3. 변경사항 커밋
4. 브랜치에 Push
5. Pull Request 생성

## 📞 지원

문제가 발생하면 이슈를 생성하거나 개발팀에 문의하세요.