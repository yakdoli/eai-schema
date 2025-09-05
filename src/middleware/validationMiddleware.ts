// 검증 미들웨어

import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';
import { AuthenticatedRequest, ValidationMiddlewareOptions } from '../types/api';
import { ValidationError } from '../types/errors';
import { validateData } from '../core/utils/validation';
import { Logger } from '../core/logging/Logger';
import { ApiResponse, ApiError } from '../types/api-v2';

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        name?: string;
        email?: string;
        roles?: string[];
      };
    }
  }
}

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

    return res.status(400).json(response);
  }

  next();
};

/**
 * Zod 스키마를 사용한 요청 검증 미들웨어
 */
export const validateRequest = (options: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // 요청 본문 검증
      if (options.body && req.body) {
        req.body = validateData(options.body, req.body, 'body');
      }

      // 쿼리 파라미터 검증
      if (options.query && req.query) {
        req.query = validateData(options.query, req.query, 'query');
      }

      // 경로 파라미터 검증
      if (options.params && req.params) {
        req.params = validateData(options.params, req.params, 'params');
      }

      logger.debug('요청 검증 성공', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl
      });

      next();
    } catch (error) {
      logger.warn('요청 검증 실패', {
        requestId: req.requestId,
        error: (error as Error).message,
        method: req.method,
        url: req.originalUrl
      });
      next(error);
    }
  };
};

/**
 * 파일 업로드 검증 미들웨어
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  required?: boolean;
}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as any;
      const file = req.file as any;
      
      // 파일이 필수인 경우 확인
      if (options.required && !files && !file) {
        throw new ValidationError('파일이 필요합니다', 'file', undefined, req.requestId);
      }

      // 파일이 있는 경우 검증
      const filesToValidate = files ? (Array.isArray(files) ? files : [files]) : (file ? [file] : []);
      
      for (const uploadedFile of filesToValidate) {
        // 파일 크기 검증
        if (options.maxSize && uploadedFile.size > options.maxSize) {
          throw new ValidationError(
            `파일 크기가 너무 큽니다. 최대 ${options.maxSize} 바이트까지 허용됩니다`,
            'file.size',
            uploadedFile.size,
            req.requestId
          );
        }

        // MIME 타입 검증
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(uploadedFile.mimetype)) {
          throw new ValidationError(
            `허용되지 않는 파일 형식입니다. 허용되는 형식: ${options.allowedMimeTypes.join(', ')}`,
            'file.mimetype',
            uploadedFile.mimetype,
            req.requestId
          );
        }

        // 파일 확장자 검증
        if (options.allowedExtensions) {
          const extension = uploadedFile.originalname.toLowerCase().split('.').pop();
          if (!extension || !options.allowedExtensions.includes(extension)) {
            throw new ValidationError(
              `허용되지 않는 파일 확장자입니다. 허용되는 확장자: ${options.allowedExtensions.join(', ')}`,
              'file.extension',
              extension,
              req.requestId
            );
          }
        }
      }

      logger.debug('파일 업로드 검증 성공', {
        requestId: req.requestId,
        fileCount: filesToValidate.length
      });

      next();
    } catch (error) {
      logger.warn('파일 업로드 검증 실패', {
        requestId: req.requestId,
        error: (error as Error).message
      });
      next(error);
    }
  };
};

/**
 * 페이지네이션 파라미터 검증 미들웨어
 */
export const validatePagination = (options: {
  maxLimit?: number;
  defaultLimit?: number;
} = {}) => {
  const maxLimit = options.maxLimit || 100;
  const defaultLimit = options.defaultLimit || 10;

  const schema = z.object({
    page: z.string().optional().transform(val => {
      const num = parseInt(val || '1');
      return isNaN(num) || num < 1 ? 1 : num;
    }),
    limit: z.string().optional().transform(val => {
      const num = parseInt(val || defaultLimit.toString());
      if (isNaN(num) || num < 1) return defaultLimit;
      return Math.min(num, maxLimit);
    }),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
  });

  return validateRequest({ query: schema });
};

/**
 * ID 파라미터 검증 미들웨어
 */
export const validateId = (paramName: string = 'id') => {
  const schema = z.object({
    [paramName]: z.string().uuid('유효하지 않은 ID 형식입니다')
  });

  return validateRequest({ params: schema });
};

/**
 * 스키마 생성 요청 검증
 */
export const validateCreateSchema = validateRequest({
  body: z.object({
    name: z.string().min(1, '스키마 이름은 필수입니다').max(100, '스키마 이름은 100자를 초과할 수 없습니다'),
    description: z.string().max(500, '설명은 500자를 초과할 수 없습니다').optional(),
    format: z.enum(['xml', 'json', 'yaml', 'xsd', 'wsdl'], {
      errorMap: () => ({ message: '지원되지 않는 스키마 형식입니다' })
    }),
    content: z.string().min(1, '스키마 내용은 필수입니다')
  })
});

/**
 * 스키마 업데이트 요청 검증
 */
export const validateUpdateSchema = validateRequest({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    content: z.string().min(1).optional(),
    gridData: z.array(z.array(z.any())).optional()
  }).refine(data => {
    // 최소 하나의 필드는 업데이트되어야 함
    return Object.keys(data).length > 0;
  }, {
    message: '업데이트할 필드가 최소 하나는 필요합니다'
  })
});

/**
 * 협업 세션 생성 요청 검증
 */
export const validateCreateSession = validateRequest({
  body: z.object({
    schemaId: z.string().uuid('유효하지 않은 스키마 ID입니다'),
    name: z.string().min(1, '세션 이름은 필수입니다').max(100, '세션 이름은 100자를 초과할 수 없습니다'),
    settings: z.object({
      maxUsers: z.number().min(1).max(50).optional(),
      allowAnonymous: z.boolean().optional(),
      autoSave: z.boolean().optional(),
      autoSaveInterval: z.number().min(10).max(300).optional(),
      conflictResolution: z.enum(['last-write-wins', 'merge', 'manual']).optional()
    }).optional()
  })
});

/**
 * 그리드 데이터 업데이트 요청 검증
 */
export const validateUpdateGrid = validateRequest({
  body: z.object({
    gridData: z.array(z.array(z.object({
      fieldName: z.string().min(1, '필드명은 필수입니다'),
      dataType: z.string().min(1, '데이터 타입은 필수입니다'),
      required: z.boolean(),
      description: z.string(),
      defaultValue: z.any().optional(),
      constraints: z.string().optional()
    }))),
    changes: z.array(z.object({
      id: z.string(),
      type: z.enum(['cell-update', 'row-insert', 'row-delete', 'column-insert', 'column-delete', 'structure-change']),
      position: z.object({
        row: z.number().min(0),
        col: z.number().min(0)
      }),
      oldValue: z.any().optional(),
      newValue: z.any().optional(),
      userId: z.string(),
      timestamp: z.number(),
      metadata: z.record(z.any()).optional()
    }))
  })
});

/**
 * 내용 타입 검증 미들웨어
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return next(new ValidationError(
        'Content-Type 헤더가 필요합니다',
        'content-type',
        undefined,
        req.requestId
      ));
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    
    if (!isAllowed) {
      return next(new ValidationError(
        `허용되지 않는 Content-Type입니다. 허용되는 타입: ${allowedTypes.join(', ')}`,
        'content-type',
        contentType,
        req.requestId
      ));
    }

    next();
  };
};