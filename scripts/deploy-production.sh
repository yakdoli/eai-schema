#!/bin/bash

# 프로덕션 배포 스크립트
set -e

echo "🚀 프로덕션 환경 배포 시작..."

# 환경 변수 확인
if [ -z "$HEROKU_API_KEY" ]; then
    echo "❌ HEROKU_API_KEY 환경 변수가 설정되지 않았습니다."
    exit 1
fi

if [ -z "$HEROKU_PRODUCTION_APP" ]; then
    echo "❌ HEROKU_PRODUCTION_APP 환경 변수가 설정되지 않았습니다."
    exit 1
fi

# main 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ 프로덕션 배포는 main 브랜치에서만 가능합니다. 현재 브랜치: $CURRENT_BRANCH"
    exit 1
fi

echo "현재 브랜치: $CURRENT_BRANCH ✅"

# 배포 전 테스트 실행
echo "🧪 배포 전 테스트 실행 중..."
npm ci
npm run ci:validate
npm run ci:test

# 빌드 실행
echo "📦 프로덕션 빌드 중..."
npm run ci:build

# 빌드 검증
if [ ! -f "dist/index.js" ]; then
    echo "❌ 빌드 실패: dist/index.js 파일이 생성되지 않았습니다."
    exit 1
fi

echo "✅ 빌드 완료"

# 보안 스캔
echo "🔒 보안 스캔 실행 중..."
npm run security:audit || echo "⚠️ 보안 경고 발견, 계속 진행..."

# 사용자 확인
echo "⚠️  프로덕션 환경에 배포하려고 합니다."
echo "배포할 앱: $HEROKU_PRODUCTION_APP"
echo "현재 커밋: $(git rev-parse --short HEAD)"
echo "커밋 메시지: $(git log -1 --pretty=%B)"

if [ "$CI" != "true" ]; then
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "배포가 취소되었습니다."
        exit 1
    fi
fi

# Heroku CLI 설정
echo "🔧 Heroku CLI 설정 중..."
echo "machine api.heroku.com login _ password $HEROKU_API_KEY" > ~/.netrc
echo "machine git.heroku.com login _ password $HEROKU_API_KEY" >> ~/.netrc
chmod 600 ~/.netrc

# Git 설정
git config --global user.email "deploy@eai-schema.com"
git config --global user.name "Production Deploy"

# Heroku remote 추가
heroku git:remote -a "$HEROKU_PRODUCTION_APP"

# 현재 프로덕션 버전 백업
echo "💾 현재 프로덕션 버전 백업 중..."
BACKUP_BRANCH="backup/production-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo "백업 브랜치 생성: $BACKUP_BRANCH"

# 배포 실행
echo "🚀 프로덕션 환경에 배포 중..."
git add -f dist/ package.json package-lock.json Procfile app.json .env.production
git commit -m "PRODUCTION DEPLOY: $(date -u) - $(git rev-parse --short HEAD)" || echo "변경사항 없음"

git push heroku HEAD:main --force

echo "⏳ 배포 완료 대기 중..."
sleep 60

# 헬스체크
echo "🏥 프로덕션 헬스체크 실행 중..."
PRODUCTION_URL="https://${HEROKU_PRODUCTION_APP}.herokuapp.com"

for i in {1..15}; do
    if curl -f -s "$PRODUCTION_URL/health" > /dev/null; then
        echo "✅ 프로덕션 환경 정상 작동 중"
        echo "🌐 프로덕션 URL: $PRODUCTION_URL"
        
        # 배포 후 스모크 테스트
        echo "🔍 배포 후 스모크 테스트 실행 중..."
        curl -f "$PRODUCTION_URL/api/v1/health" > /dev/null
        curl -f "$PRODUCTION_URL/metrics" > /dev/null
        
        echo "🎉 프로덕션 배포 완료!"
        echo "📊 모니터링: $PRODUCTION_URL/metrics"
        echo "🏥 헬스체크: $PRODUCTION_URL/health"
        
        exit 0
    fi
    echo "헬스체크 시도 $i/15 실패, 15초 후 재시도..."
    sleep 15
done

echo "❌ 프로덕션 환경 헬스체크 실패"
echo "🔄 롤백을 고려하세요: git push heroku $BACKUP_BRANCH:main --force"
exit 1