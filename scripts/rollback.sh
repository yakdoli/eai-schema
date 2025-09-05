#!/bin/bash

# 롤백 스크립트
set -e

# 사용법 출력
usage() {
    echo "사용법: $0 <environment> <version_or_commit>"
    echo "  environment: staging 또는 production"
    echo "  version_or_commit: 롤백할 버전 태그 또는 커밋 해시"
    echo ""
    echo "예시:"
    echo "  $0 staging v1.2.3"
    echo "  $0 production abc1234"
    exit 1
}

# 인자 확인
if [ $# -ne 2 ]; then
    usage
fi

ENVIRONMENT=$1
TARGET_VERSION=$2

# 환경 검증
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "❌ 잘못된 환경: $ENVIRONMENT (staging 또는 production만 허용)"
    exit 1
fi

echo "🔄 $ENVIRONMENT 환경 롤백 시작..."
echo "롤백 대상: $TARGET_VERSION"

# 환경별 앱 이름 설정
if [ "$ENVIRONMENT" = "staging" ]; then
    HEROKU_APP=${HEROKU_STAGING_APP:-"eai-schema-staging"}
    ENV_FILE=".env.staging"
else
    HEROKU_APP=${HEROKU_PRODUCTION_APP:-"eai-schema-api"}
    ENV_FILE=".env.production"
fi

# 환경 변수 확인
if [ -z "$HEROKU_API_KEY" ]; then
    echo "❌ HEROKU_API_KEY 환경 변수가 설정되지 않았습니다."
    exit 1
fi

# 롤백 대상 검증
echo "🔍 롤백 대상 검증 중..."
if git rev-parse --verify "$TARGET_VERSION^{commit}" > /dev/null 2>&1; then
    TARGET_COMMIT=$(git rev-parse "$TARGET_VERSION^{commit}")
    echo "✅ 유효한 커밋: $TARGET_COMMIT"
else
    echo "❌ 유효하지 않은 버전 또는 커밋: $TARGET_VERSION"
    exit 1
fi

# 프로덕션 환경 추가 확인
if [ "$ENVIRONMENT" = "production" ]; then
    echo "⚠️  프로덕션 환경 롤백을 수행합니다!"
    echo "앱: $HEROKU_APP"
    echo "롤백 대상: $TARGET_VERSION ($TARGET_COMMIT)"
    
    if [ "$CI" != "true" ]; then
        read -p "정말로 계속하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "롤백이 취소되었습니다."
            exit 1
        fi
    fi
fi

# 현재 상태 백업
CURRENT_COMMIT=$(git rev-parse HEAD)
BACKUP_BRANCH="backup/rollback-from-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH" "$CURRENT_COMMIT"
echo "💾 현재 상태 백업: $BACKUP_BRANCH"

# 롤백 대상으로 체크아웃
echo "📦 롤백 버전 체크아웃 중..."
git checkout "$TARGET_COMMIT"

# 의존성 설치 및 빌드
echo "🔧 의존성 설치 및 빌드 중..."
npm ci
npm run build

# 빌드 검증
if [ ! -f "dist/index.js" ]; then
    echo "❌ 빌드 실패: dist/index.js 파일이 생성되지 않았습니다."
    git checkout -
    exit 1
fi

# Heroku CLI 설정
echo "🔧 Heroku CLI 설정 중..."
echo "machine api.heroku.com login _ password $HEROKU_API_KEY" > ~/.netrc
echo "machine git.heroku.com login _ password $HEROKU_API_KEY" >> ~/.netrc
chmod 600 ~/.netrc

# Git 설정
git config --global user.email "rollback@eai-schema.com"
git config --global user.name "Rollback Script"

# Heroku remote 추가
heroku git:remote -a "$HEROKU_APP"

# 롤백 실행
echo "🔄 $ENVIRONMENT 환경 롤백 실행 중..."
git add -f dist/ package.json package-lock.json Procfile app.json "$ENV_FILE"
git commit -m "ROLLBACK $ENVIRONMENT to $TARGET_VERSION - $(date -u)" || echo "변경사항 없음"

git push heroku HEAD:main --force

# 대기 시간 (환경별 차등)
if [ "$ENVIRONMENT" = "production" ]; then
    WAIT_TIME=60
    MAX_RETRIES=15
    RETRY_INTERVAL=15
else
    WAIT_TIME=30
    MAX_RETRIES=10
    RETRY_INTERVAL=10
fi

echo "⏳ 롤백 완료 대기 중... (${WAIT_TIME}초)"
sleep $WAIT_TIME

# 헬스체크
echo "🏥 롤백 검증 중..."
APP_URL="https://${HEROKU_APP}.herokuapp.com"

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s "$APP_URL/health" > /dev/null; then
        echo "✅ $ENVIRONMENT 환경 롤백 성공!"
        echo "🌐 URL: $APP_URL"
        
        # 추가 검증
        echo "🔍 추가 검증 실행 중..."
        curl -f "$APP_URL/api/v1/health" > /dev/null 2>&1 || echo "⚠️ API 헬스체크 실패"
        curl -f "$APP_URL/metrics" > /dev/null 2>&1 || echo "⚠️ 메트릭 엔드포인트 실패"
        
        # 원래 브랜치로 복귀
        git checkout -
        
        echo "🎉 롤백 완료!"
        echo "📊 모니터링: $APP_URL/metrics"
        echo "🏥 헬스체크: $APP_URL/health"
        echo "💾 백업 브랜치: $BACKUP_BRANCH"
        
        exit 0
    fi
    echo "검증 시도 $i/$MAX_RETRIES 실패, ${RETRY_INTERVAL}초 후 재시도..."
    sleep $RETRY_INTERVAL
done

echo "❌ $ENVIRONMENT 환경 롤백 검증 실패"
echo "🚨 긴급 상황: 수동 개입이 필요합니다!"
echo "💾 백업 브랜치: $BACKUP_BRANCH"

# 원래 브랜치로 복귀
git checkout -

exit 1