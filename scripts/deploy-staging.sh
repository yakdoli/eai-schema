#!/bin/bash

# 스테이징 배포 스크립트
set -e

echo "🚀 스테이징 환경 배포 시작..."

# 환경 변수 확인
if [ -z "$HEROKU_API_KEY" ]; then
    echo "❌ HEROKU_API_KEY 환경 변수가 설정되지 않았습니다."
    exit 1
fi

if [ -z "$HEROKU_STAGING_APP" ]; then
    echo "❌ HEROKU_STAGING_APP 환경 변수가 설정되지 않았습니다."
    exit 1
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "현재 브랜치: $CURRENT_BRANCH"

# 빌드 실행
echo "📦 애플리케이션 빌드 중..."
npm ci
npm run build

# 빌드 검증
if [ ! -f "dist/index.js" ]; then
    echo "❌ 빌드 실패: dist/index.js 파일이 생성되지 않았습니다."
    exit 1
fi

echo "✅ 빌드 완료"

# Heroku CLI 설정
echo "🔧 Heroku CLI 설정 중..."
echo "machine api.heroku.com login _ password $HEROKU_API_KEY" > ~/.netrc
echo "machine git.heroku.com login _ password $HEROKU_API_KEY" >> ~/.netrc
chmod 600 ~/.netrc

# Git 설정
git config --global user.email "deploy@eai-schema.com"
git config --global user.name "Deploy Script"

# Heroku remote 추가
heroku git:remote -a "$HEROKU_STAGING_APP"

# 배포 실행
echo "🚀 스테이징 환경에 배포 중..."
git add -f dist/ package.json package-lock.json Procfile app.json .env.staging
git commit -m "Deploy to staging: $(date -u)" || echo "변경사항 없음"

git push heroku HEAD:main --force

echo "⏳ 배포 완료 대기 중..."
sleep 30

# 헬스체크
echo "🏥 헬스체크 실행 중..."
STAGING_URL="https://${HEROKU_STAGING_APP}.herokuapp.com"

for i in {1..10}; do
    if curl -f -s "$STAGING_URL/health" > /dev/null; then
        echo "✅ 스테이징 환경 정상 작동 중"
        echo "🌐 스테이징 URL: $STAGING_URL"
        exit 0
    fi
    echo "헬스체크 시도 $i/10 실패, 10초 후 재시도..."
    sleep 10
done

echo "❌ 스테이징 환경 헬스체크 실패"
exit 1