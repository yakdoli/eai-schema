/**
 * API v2 전용 미들웨어
 * 현대화된 API 구조를 위한 특화된 미들웨어들
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/logging/Logger';
import { ApiResponse } from '../types/api-v2';

const logger = new Logger('APIv2Middleware');

/**
 * 요청 ID 생성 및 설정 미들웨어
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * API 버전 헤더 설정 미들웨어
 */
export const apiVersionMiddleware = (version = '2.0') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('API-Version', version);
    res.setHeader('X-API-Version', version);
    next();
  };
};

/**
 * 요청 로깅 미들웨어 (API v2 전용)
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // 요청 시작 로깅
  logger.info('API v2 요청 시작', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // 응답 완료 시 로깅
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    logger.info('API v2 요청 완료', {
      method: req.method,
      url: req.originalUrl,
      requestId: req.requestId,
      statusCode,
      duration,
      userId: req.user?.id,
      responseSize: Buffer.byteLength(body || '', 'utf8')
    });

    // 성능 메트릭 수집
    if (global.performanceMetrics) {
      global.performanceMetrics.recordApiCall({
        method: req.method,
        endpoint: req.route?.path || req.path,
        statusCode,
        duration,
        version: '2.0'
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * 응답 변환 미들웨어 (레거시 응답을 API v2 형식으로 변환)
 */
export const responseTransformMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // 이미 ApiResponse 형식인 경우 그대로 반환
    if (body && typeof body === 'object' && 'success' in body) {
      return originalJson.call(this, body);
    }

    // 레거시 응답을 ApiResponse 형식으로 변환
    const apiResponse: ApiResponse = {
      success: res.statusCode >= 200 && res.statusCode < 300,
      data: body,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    };

    return originalJson.call(this, apiResponse);
  };

  next();
};

/**
 * CORS 헤더 설정 미들웨어 (API v2 전용)
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // API v2 전용 CORS 설정
  res.setHeader('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, API-Version');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24시간

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

/**
 * 보안 헤더 설정 미들웨어 (API v2 전용)
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // API 보안 헤더 설정
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // API 전용 보안 헤더
  res.setHeader('X-API-Version', '2.0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  
  next();
};

/**
 * 캐시 제어 미들웨어
 */
export const cacheControlMiddleware = (options: {
  maxAge?: number;
  private?: boolean;
  noCache?: boolean;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { maxAge = 0, private: isPrivate = true, noCache = false } = options;
    
    if (noCache) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      const cacheControl = [
        isPrivate ? 'private' : 'public',
        `max-age=${maxAge}`,
        'must-revalidate'
      ].join(', ');
      
      res.setHeader('Cache-Control', cacheControl);
    }
    
    next();
  };
};

/**
 * 압축 응답 미들웨어
 */
export const compressionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // gzip 지원 확인
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  }
  
  next();
};

/**
 * API 사용량 추적 미들웨어
 */
export const usageTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.user?.id || 'anonymous';
  const endpoint = req.route?.path || req.path;
  const method = req.method;
  
  // 사용량 추적 (실제 구현에서는 Redis나 데이터베이스 사용)
  if (global.usageTracker) {
    global.usageTracker.track({
      userId,
      endpoint,
      method,
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
};

/**
 * 응답 시간 측정 미들웨어
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  // 응답 전에 헤더 설정
  const originalSend = res.send;
  res.send = function(body) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 나노초를 밀리초로 변환
    
    // 헤더가 아직 전송되지 않았을 때만 설정
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    }
    
    // 성능 메트릭 기록
    logger.debug('응답 시간 측정', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: res.statusCode
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * 건강 상태 확인 미들웨어
 */
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 건강 상태 확인 엔드포인트는 특별 처리
  if (req.path === '/health' || req.path === '/api/v2/health') {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    const response: ApiResponse = {
      success: true,
      data: healthStatus,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'health-check'
      }
    };
    
    res.json(response);
    return;
  }
  
  next();
};

/**
 * API v2 미들웨어 스택 생성
 */
export const createApiV2MiddlewareStack = () => {
  return [
    requestIdMiddleware,
    apiVersionMiddleware('2.0'),
    corsMiddleware,
    securityHeadersMiddleware,
    requestLoggingMiddleware,
    responseTimeMiddleware,
    usageTrackingMiddleware,
    healthCheckMiddleware,
    cacheControlMiddleware({ noCache: true }), // API는 기본적으로 캐시 비활성화
    responseTransformMiddleware
  ];
};

// 전역 타입 확장
declare global {
  var performanceMetrics: {
    recordApiCall: (data: {
      method: string;
      endpoint: string;
      statusCode: number;
      duration: number;
      version: string;
    }) => void;
  } | undefined;
  
  var usageTracker: {
    track: (data: {
      userId: string;
      endpoint: string;
      method: string;
      timestamp: Date;
      ip: string;
      userAgent?: string;
    }) => void;
  } | undefined;
}