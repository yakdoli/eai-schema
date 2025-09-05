/**
 * API v2 메인 라우터
 * 모든 v2 엔드포인트를 통합 관리
 */

import { Router } from 'express';
import { schemasRouter } from './schemas';
import { collaborationRouter } from './collaboration';
import { versionRouter } from './version';
import { docsRouter } from './docs';
// import { validationMiddleware } from '../../middleware/validationMiddleware'; // TODO: 필요시 사용
import { authMiddleware } from '../../middleware/authMiddleware';
import { rateLimitMiddleware } from '../../middleware/rateLimitMiddleware';
import { createApiV2MiddlewareStack } from '../../middleware/apiV2Middleware';
import { Logger } from '../../core/logging/Logger';
import { ApiResponse, ApiError } from '../../types/api-v2';

const router = Router();
const logger = new Logger('APIv2Router');

// API v2 전용 미들웨어 스택 적용
router.use(createApiV2MiddlewareStack());

// Rate limiting (API v2 전용)
router.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15분
  max: 200, // v2는 더 높은 제한
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'API v2 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      timestamp: new Date().toISOString(),
      requestId: ''
    }
  }
}));

// 인증 미들웨어 (선택적)
router.use(authMiddleware({ required: false }));

// API 문서 및 버전 정보
router.use('/docs', docsRouter);
router.use('/version', versionRouter);

// 메인 리소스 라우터
router.use('/schemas', schemasRouter);
router.use('/collaboration', collaborationRouter);

// 404 핸들러 (모든 경로에 대해)
router.use((req, res) => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `엔드포인트를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    }
  };
  
  res.status(404).json(response);
});

// 에러 핸들러
router.use((error: any, req: any, res: any, _next: any) => {
  logger.error('API v2 에러', {
    error: error.message,
    stack: error.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  // 에러 타입별 상태 코드 매핑
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  
  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'AuthenticationError' || error.code === 'AUTHENTICATION_ERROR') {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
  } else if (error.name === 'AuthorizationError' || error.code === 'AUTHORIZATION_ERROR') {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
  } else if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (error.name === 'ConflictError' || error.code === 'CONFLICT') {
    statusCode = 409;
    errorCode = 'CONFLICT';
  } else if (error.name === 'RateLimitError' || error.code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
  } else if (error.statusCode || error.status) {
    statusCode = error.statusCode || error.status;
    errorCode = error.code || 'HTTP_ERROR';
  }
  
  const apiError: ApiError = {
    code: errorCode,
    message: error.message || '내부 서버 오류가 발생했습니다.',
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  };
  
  // 개발 환경에서만 상세 정보 포함
  if (process.env.NODE_ENV === 'development') {
    apiError.details = {
      stack: error.stack,
      originalError: {
        name: error.name,
        code: error.code,
        statusCode: error.statusCode
      }
    };
  }
  
  // Rate Limit 에러의 경우 Retry-After 헤더 추가
  if (errorCode === 'RATE_LIMIT_EXCEEDED' && error.retryAfter) {
    res.setHeader('Retry-After', error.retryAfter);
  }
  
  const response: ApiResponse = {
    success: false,
    error: apiError
  };
  
  res.status(statusCode).json(response);
});

export { router as apiV2Router };