// HTTP 관련 유틸리티

import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../types/api';

/**
 * 성공 응답 생성
 */
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  requestId?: string
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || 'unknown'
  };
};

/**
 * 에러 응답 생성
 */
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any,
  requestId?: string
): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || 'unknown'
  };
};

/**
 * 페이지네이션 응답 생성
 */
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string
): ApiResponse<{
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> => {
  const totalPages = Math.ceil(total / limit);
  
  return createSuccessResponse({
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, undefined, requestId);
};

/**
 * 요청에서 페이지네이션 파라미터 추출
 */
export const extractPaginationParams = (req: Request): {
  page: number;
  limit: number;
  offset: number;
} => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

/**
 * 요청에서 정렬 파라미터 추출
 */
export const extractSortParams = (req: Request): {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} => {
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  
  return { sortBy, sortOrder };
};

/**
 * 요청에서 필터 파라미터 추출
 */
export const extractFilterParams = (req: Request, allowedFilters: string[]): Record<string, any> => {
  const filters: Record<string, any> = {};
  
  allowedFilters.forEach(filter => {
    const value = req.query[filter];
    if (value !== undefined && value !== '') {
      filters[filter] = value;
    }
  });
  
  return filters;
};

/**
 * IP 주소 추출
 */
export const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * User Agent 추출
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * 요청 ID 생성
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 응답 헤더 설정
 */
export const setSecurityHeaders = (res: Response): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

/**
 * CORS 헤더 설정
 */
export const setCorsHeaders = (res: Response, origin?: string): void => {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24시간
};

/**
 * 캐시 헤더 설정
 */
export const setCacheHeaders = (res: Response, maxAge = 3600): void => {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('ETag', `"${Date.now()}"`);
};

/**
 * 캐시 무효화 헤더 설정
 */
export const setNoCacheHeaders = (res: Response): void => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

/**
 * 콘텐츠 타입 설정
 */
export const setContentType = (res: Response, type: string): void => {
  const contentTypes: Record<string, string> = {
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    text: 'text/plain',
    csv: 'text/csv',
    pdf: 'application/pdf',
    zip: 'application/zip'
  };
  
  res.setHeader('Content-Type', contentTypes[type] || type);
};

/**
 * 파일 다운로드 헤더 설정
 */
export const setDownloadHeaders = (res: Response, filename: string, contentType?: string): void => {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (contentType) {
    setContentType(res, contentType);
  }
};

/**
 * 요청 크기 확인
 */
export const checkRequestSize = (req: Request, maxSize: number): boolean => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  return contentLength <= maxSize;
};

/**
 * 요청 타임아웃 설정
 */
export const setRequestTimeout = (req: Request, res: Response, timeoutMs: number): void => {
  req.setTimeout(timeoutMs, () => {
    res.status(408).json(createErrorResponse(
      'REQUEST_TIMEOUT',
      '요청 시간이 초과되었습니다',
      { timeout: timeoutMs }
    ));
  });
};

/**
 * HTTP 상태 코드 확인
 */
export const isSuccessStatus = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 300;
};

export const isClientError = (statusCode: number): boolean => {
  return statusCode >= 400 && statusCode < 500;
};

export const isServerError = (statusCode: number): boolean => {
  return statusCode >= 500 && statusCode < 600;
};

/**
 * 요청 메타데이터 추출
 */
export const extractRequestMetadata = (req: AuthenticatedRequest): {
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  timestamp: string;
  requestId: string;
  userId?: string;
} => {
  return {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    method: req.method,
    url: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.user?.id
  };
};

/**
 * 응답 시간 계산
 */
export const calculateResponseTime = (startTime: [number, number]): number => {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  return seconds * 1000 + nanoseconds / 1000000; // 밀리초로 변환
};

/**
 * 요청 본문 크기 계산
 */
export const getRequestBodySize = (req: Request): number => {
  if (req.body) {
    return Buffer.byteLength(JSON.stringify(req.body));
  }
  return 0;
};

/**
 * 응답 본문 크기 계산
 */
export const getResponseBodySize = (data: any): number => {
  if (data) {
    return Buffer.byteLength(JSON.stringify(data));
  }
  return 0;
};