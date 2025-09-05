// 요청 로깅 미들웨어

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { Logger } from '../core/logging/Logger';
import { 
  generateRequestId, 
  getClientIp, 
  getUserAgent, 
  calculateResponseTime,
  extractRequestMetadata
} from '../core/utils/httpUtils';

const logger = new Logger();

/**
 * 요청 로깅 미들웨어
 */
export const requestLoggingMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime();
  
  // 요청 ID가 없으면 생성
  if (!req.requestId) {
    req.requestId = generateRequestId();
  }
  
  // 요청 메타데이터 추출
  const metadata = extractRequestMetadata(req);
  
  // 요청 시작 로깅
  logger.info('요청 시작', {
    ...metadata,
    headers: filterSensitiveHeaders(req.headers),
    query: req.query,
    bodySize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0
  });
  
  // 응답 완료 시 로깅
  const logResponse = () => {
    const duration = calculateResponseTime(startTime);
    const responseSize = res.get('content-length') ? parseInt(res.get('content-length')!) : 0;
    
    // 응답 로깅
    logger.info('요청 완료', {
      ...metadata,
      statusCode: res.statusCode,
      duration,
      responseSize,
      success: res.statusCode < 400
    });
    
    // 성능 메트릭 로깅
    logger.logPerformance('http_request', duration, {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      requestId: req.requestId
    });
    
    // 에러 응답 상세 로깅
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('에러 응답', {
        ...metadata,
        statusCode: res.statusCode,
        duration,
        errorType: getErrorType(res.statusCode)
      });
    }
    
    // 느린 요청 로깅
    if (duration > 1000) { // 1초 이상
      logger.warn('느린 요청', {
        ...metadata,
        duration,
        statusCode: res.statusCode,
        threshold: 1000
      });
    }
  };
  
  // 응답 이벤트 리스너 등록
  res.on('finish', logResponse);
  res.on('close', logResponse);
  
  next();
};

/**
 * 민감한 헤더 필터링
 */
function filterSensitiveHeaders(headers: any): any {
  const filtered = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (filtered[header]) {
      filtered[header] = '[FILTERED]';
    }
  });
  
  return filtered;
}

/**
 * HTTP 상태 코드에 따른 에러 타입 반환
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    const clientErrors: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests'
    };
    return clientErrors[statusCode] || 'Client Error';
  }
  
  if (statusCode >= 500) {
    const serverErrors: Record<number, string> = {
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return serverErrors[statusCode] || 'Server Error';
  }
  
  return 'Unknown Error';
}

/**
 * 상세 요청 로깅 미들웨어 (디버그용)
 */
export const detailedRequestLogging = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime();
  
  // 요청 본문 로깅 (민감한 정보 제외)
  let sanitizedBody = req.body;
  if (req.body && typeof req.body === 'object') {
    sanitizedBody = sanitizeRequestBody(req.body);
  }
  
  logger.debug('상세 요청 정보', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    headers: filterSensitiveHeaders(req.headers),
    query: req.query,
    params: req.params,
    body: sanitizedBody,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // 응답 데이터 로깅
  const originalSend = res.send;
  res.send = function(body) {
    const duration = calculateResponseTime(startTime);
    
    logger.debug('상세 응답 정보', {
      requestId: req.requestId,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      body: sanitizeResponseBody(body),
      duration,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * 요청 본문에서 민감한 정보 제거
 */
function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }
  
  const sanitized = Array.isArray(body) ? [] : {};
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const key in body) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      (sanitized as any)[key] = '[FILTERED]';
    } else if (typeof body[key] === 'object') {
      (sanitized as any)[key] = sanitizeRequestBody(body[key]);
    } else {
      (sanitized as any)[key] = body[key];
    }
  }
  
  return sanitized;
}

/**
 * 응답 본문에서 민감한 정보 제거
 */
function sanitizeResponseBody(body: any): any {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return sanitizeRequestBody(parsed);
    } catch {
      return '[Non-JSON Response]';
    }
  }
  
  return sanitizeRequestBody(body);
}

/**
 * 에러 요청만 로깅하는 미들웨어
 */
export const errorOnlyLogging = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime();
  
  const logError = () => {
    if (res.statusCode >= 400) {
      const duration = calculateResponseTime(startTime);
      const metadata = extractRequestMetadata(req);
      
      logger.error('에러 요청', {
        ...metadata,
        statusCode: res.statusCode,
        duration,
        headers: filterSensitiveHeaders(req.headers),
        query: req.query,
        body: sanitizeRequestBody(req.body)
      });
    }
  };
  
  res.on('finish', logError);
  next();
};