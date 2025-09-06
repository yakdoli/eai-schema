// Rate Limiting 미들웨어

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { RateLimitError } from '../types/errors';
import { Logger } from '../core/logging/Logger';
import { ConfigManager } from '../core/config/ConfigManager';

const logger = new Logger();
const config = ConfigManager.getInstance();

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * 메모리 기반 Rate Limit 저장소
 */
class MemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval!: NodeJS.Timeout;

  constructor() {
    // 테스트 환경이 아닐 때만 정리 작업 시작
    if (process.env.NODE_ENV !== 'test') {
      // 5분마다 만료된 항목 정리
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  get(key: string): { count: number; resetTime: number } | null {
    const item = this.store[key];
    if (!item) {return null;}
    
    // 만료된 항목 확인
    if (Date.now() > item.resetTime) {
      delete this.store[key];
      return null;
    }
    
    return item;
  }

  set(key: string, count: number, resetTime: number): void {
    this.store[key] = { count, resetTime };
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.get(key);
    
    if (!existing) {
      const resetTime = now + windowMs;
      this.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }
    
    const updatedCount = existing.count + 1;
    this.set(key, updatedCount, existing.resetTime);
    return { count: updatedCount, resetTime: existing.resetTime };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

// 전역 저장소 인스턴스
const rateLimitStore = new MemoryRateLimitStore();

/**
 * Rate Limiting 옵션
 */
export interface RateLimitOptions {
  windowMs: number; // 시간 윈도우 (밀리초)
  max: number; // 최대 요청 수
  message?: string; // 제한 시 메시지
  skipSuccessfulRequests?: boolean; // 성공한 요청만 카운트
  skipFailedRequests?: boolean; // 실패한 요청 제외
  keyGenerator?: (req: AuthenticatedRequest) => string; // 키 생성 함수
  skip?: (req: AuthenticatedRequest) => boolean; // 스킵 조건
  onLimitReached?: (req: AuthenticatedRequest, options: RateLimitOptions) => void; // 제한 도달 시 콜백
}

/**
 * Rate Limiting 미들웨어 생성
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip || 'unknown',
    skip = () => false,
    onLimitReached
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // 스킵 조건 확인
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const current = rateLimitStore.increment(key, windowMs);
      
      // 응답 헤더 설정
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
      res.setHeader('X-RateLimit-Reset', new Date(current.resetTime).toISOString());

      // 제한 확인
      if (current.count > max) {
        const retryAfter = Math.ceil((current.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);

        // 제한 도달 콜백 실행
        if (onLimitReached) {
          onLimitReached(req, options);
        }

        // 보안 이벤트 로깅
        logger.logSecurityEvent('rate_limit_exceeded', 'medium', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          requestId: req.requestId,
          currentCount: current.count,
          limit: max,
          windowMs
        });

        throw new RateLimitError(message, retryAfter, req.requestId);
      }

      // 응답 완료 후 카운트 조정
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        
        // 성공한 요청을 스킵하는 경우
        if (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) {
          // 카운트 감소 (실제로는 Redis 등에서 구현 시 더 복잡)
        }
        
        // 실패한 요청을 스킵하는 경우
        if (skipFailedRequests && statusCode >= 400) {
          // 카운트 감소
        }
        
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 기본 Rate Limit (일반 API)
 */
export const defaultRateLimit = createRateLimit({
  windowMs: config.get('RATE_LIMIT_WINDOW') || 15 * 60 * 1000,
  max: config.get('RATE_LIMIT_MAX') || 100,
  message: '너무 많은 요청을 보냈습니다. 15분 후에 다시 시도해주세요.'
});

/**
 * 엄격한 Rate Limit (인증 API)
 */
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분에 5번
  message: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.',
  skipSuccessfulRequests: true
});

/**
 * 파일 업로드 Rate Limit
 */
export const fileUploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 1분에 10번
  message: '파일 업로드 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.'
});

/**
 * API 키 기반 Rate Limit
 */
export const apiKeyRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 1000, // 1시간에 1000번
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip || 'unknown';
  },
  message: 'API 키 사용 한도를 초과했습니다. 1시간 후에 다시 시도해주세요.'
});

/**
 * 사용자별 Rate Limit
 */
export const userRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1분
  max: 60, // 1분에 60번
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'unknown';
  },
  skip: (req) => {
    // 관리자는 Rate Limit 제외
    const user = req.user;
    return user && user.role === 'admin';
  }
});

/**
 * 동적 Rate Limit (사용자 등급에 따라)
 */
export const dynamicRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userTier = req.user?.tier || 'free';
  
  const limits: Record<string, { windowMs: number; max: number }> = {
    free: { windowMs: 60 * 1000, max: 10 },
    premium: { windowMs: 60 * 1000, max: 100 },
    enterprise: { windowMs: 60 * 1000, max: 1000 }
  };
  
  const limit = limits[userTier] || limits.free;
  
  const rateLimitMiddleware = createRateLimit({
    ...limit,
    message: `${userTier} 등급의 사용 한도를 초과했습니다.`
  });
  
  rateLimitMiddleware(req, res, next);
};

/**
 * 통합 Rate Limit 미들웨어 (API v2용)
 */
export const rateLimitMiddleware = (options: { windowMs?: number; max?: number; message?: any } = {}) => {
  return createRateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
        requestId: 'unknown'
      }
    }
  });
};

/**
 * Rate Limit 상태 조회 엔드포인트용 미들웨어
 */
export const getRateLimitStatus = (req: AuthenticatedRequest, res: Response, _next: NextFunction): void => {
  const key = req.user?.id || req.ip || 'unknown';
  const current = rateLimitStore.get(key);
  
  const rateLimitMax = config.get('RATE_LIMIT_MAX') || 100;
  const status = {
    limit: rateLimitMax,
    remaining: current ? Math.max(0, rateLimitMax - current.count) : rateLimitMax,
    reset: current ? new Date(current.resetTime).toISOString() : null,
    retryAfter: current && current.count > rateLimitMax 
      ? Math.ceil((current.resetTime - Date.now()) / 1000) 
      : null
  };
  
  res.json({ success: true, data: status });
};