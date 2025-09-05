// 검증 미들웨어

import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';
import { AuthenticatedRequest, ValidationMiddlewareOptions } from '../types/api';
// import { ValidationError } from '../types/errors'; // 현재 사용되지 않음
import { validateData } from '../core/utils/validation';
import { Logger } from '../core/logging/Logger';
import { ApiResponse, ApiError } from '../types/api-v2';

const logger = new Logger('ValidationMiddleware');

/**
 * Express-validator 결과를 처리하는 미들웨어 (API v2용)
 */
export const validationMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    logger.warn('API v2 요청 검증 실패', {
      requestId: req.requestId,
      errors: validationErrors,
      method: req.method,
      url: req.originalUrl
    });

    const apiError: ApiError = {
      code: 'VALIDATION_ERROR',
      message: '요청 데이터 검증에 실패했습니다.',
      details: validationErrors,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    };

    const response: ApiResponse = {
      success: false,
      error: apiError
    };

    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * Zod 스키마 기반 검증 미들웨어
 */
export const zodValidationMiddleware = (options: ValidationMiddlewareOptions) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // 요청 데이터 검증
      if (options.body) {
        req.body = validateData(options.body, req.body, 'body');
      }

      if (options.query) {
        req.query = validateData(options.query, req.query, 'query') as any;
      }

      if (options.params) {
        req.params = validateData(options.params, req.params, 'params') as any;
      }

      next();
    } catch (error) {
      logger.error('Zod 검증 실패', { error, requestId: req.requestId });

      const apiError: ApiError = {
        code: 'VALIDATION_ERROR',
        message: '요청 데이터 검증에 실패했습니다.',
        details: error instanceof Error ? error.message : 'Unknown validation error',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      };

      const response: ApiResponse = {
        success: false,
        error: apiError
      };

      res.status(400).json(response);
    }
  };
};

// 공통 검증 스키마들
export const commonSchemas = {
  // 페이지네이션
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),

  // ID 검증
  id: z.string().min(1, '유효한 ID가 필요합니다'),

  // 날짜 범위
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }),

  // 정렬 옵션
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']).default('asc')
  }),

  // 스키마 형식
  schemaFormat: z.enum(['xml', 'json', 'yaml', 'xsd', 'wsdl']),

  // 태그 배열
  tags: z.array(z.string()).optional(),

  // 검색 쿼리
  searchQuery: z.string().min(1).max(500),

  // 파일 업로드
  file: z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number().max(10 * 1024 * 1024) // 10MB 제한
  })
};

// 스키마 관련 검증 스키마
export const schemaValidationSchemas = {
  // 스키마 생성
  createSchema: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    format: commonSchemas.schemaFormat,
    content: z.string().min(1),
    tags: commonSchemas.tags
  }),

  // 스키마 업데이트
  updateSchema: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    content: z.string().min(1).optional(),
    tags: commonSchemas.tags
  }),

  // 스키마 검색
  searchSchemas: z.object({
    query: commonSchemas.searchQuery,
    filters: z.object({
      format: z.array(commonSchemas.schemaFormat).optional(),
      tags: z.array(z.string()).optional(),
      createdBy: z.array(z.string()).optional(),
      dateRange: commonSchemas.dateRange.optional()
    }).optional(),
    sort: commonSchemas.sort.optional(),
    pagination: commonSchemas.pagination.optional()
  }),

  // 그리드 변환
  convertToGrid: z.object({
    format: commonSchemas.schemaFormat,
    content: z.string().min(1),
    options: z.object({
      preserveComments: z.boolean().default(false),
      includeMetadata: z.boolean().default(true),
      maxDepth: z.number().int().min(1).max(10).default(5)
    }).optional()
  }),

  // 그리드 업데이트
  updateGrid: z.object({
    gridData: z.array(z.array(z.any())),
    metadata: z.record(z.any()).optional()
  }),

  // 배치 작업
  batchOperation: z.object({
    operations: z.array(z.object({
      operation: z.enum(['create', 'update', 'delete']),
      id: z.string().optional(),
      data: z.any()
    })),
    options: z.object({
      continueOnError: z.boolean().default(false),
      maxConcurrency: z.number().int().min(1).max(10).default(5),
      timeout: z.number().int().min(1000).max(300000).default(30000)
    }).optional()
  })
};

// 협업 관련 검증 스키마
export const collaborationValidationSchemas = {
  // 세션 생성
  createSession: z.object({
    schemaId: commonSchemas.id,
    name: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    permissions: z.object({
      read: z.boolean().default(true),
      write: z.boolean().default(false),
      delete: z.boolean().default(false),
      share: z.boolean().default(false),
      admin: z.boolean().default(false)
    }).optional(),
    expiresAt: z.string().datetime().optional()
  }),

  // 세션 업데이트
  updateSession: z.object({
    name: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    permissions: z.object({
      read: z.boolean(),
      write: z.boolean(),
      delete: z.boolean(),
      share: z.boolean(),
      admin: z.boolean()
    }).optional(),
    expiresAt: z.string().datetime().optional()
  }),

  // 사용자 초대
  inviteUser: z.object({
    email: z.string().email(),
    permissions: z.object({
      read: z.boolean().default(true),
      write: z.boolean().default(false),
      delete: z.boolean().default(false),
      share: z.boolean().default(false),
      admin: z.boolean().default(false)
    }).optional()
  })
};

// 버전 관리 검증 스키마
export const versionValidationSchemas = {
  // 호환성 체크
  compatibilityCheck: z.object({
    fromVersion: z.string().regex(/^\d+\.\d+$/, '유효한 버전 형식이 아닙니다 (예: 1.0)'),
    toVersion: z.string().regex(/^\d+\.\d+$/, '유효한 버전 형식이 아닙니다 (예: 2.0)')
  })
};

export default validationMiddleware;