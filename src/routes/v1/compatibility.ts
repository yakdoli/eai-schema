/**
 * API v1 하위 호환성 래퍼
 * 기존 v1 엔드포인트를 v2로 리다이렉트하거나 변환
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../../core/logging/Logger';

const router = Router();
const logger = new Logger('APIv1Compatibility');

// v1 API 사용 시 경고 헤더 추가 미들웨어
const addDeprecationWarning = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Warning', '299 - "API v1 is deprecated. Please migrate to v2. See /api/v2/docs for migration guide"');
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('X-Migration-Guide', '/api/v2/version/migration/1.0/2.0');
  
  logger.warn('Deprecated API v1 사용', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
};

// 모든 v1 요청에 경고 헤더 추가
router.use(addDeprecationWarning);

// v1 응답을 v2 형식으로 변환하는 헬퍼 함수
const convertToV1Response = (v2Response: any) => {
  // v1은 단순한 응답 형식을 사용했다고 가정
  if (v2Response.success) {
    return v2Response.data || { success: true };
  } else {
    return {
      error: v2Response.error?.message || 'Unknown error',
      code: v2Response.error?.code || 'UNKNOWN_ERROR'
    };
  }
};

// v1 스키마 목록 조회 (v2로 프록시)
router.get('/schemas', async (req: Request, res: Response) => {
  try {
    // v2 API 호출 시뮬레이션 (실제로는 내부 호출)
    const v2Response = {
      success: true,
      data: [],
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: 'compat_' + Date.now()
      }
    };

    const v1Response = convertToV1Response(v2Response);
    res.json(v1Response);
  } catch (error) {
    logger.error('v1 스키마 목록 조회 실패', { error });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// v1 스키마 생성 (v2로 프록시)
router.post('/schemas', async (req: Request, res: Response) => {
  try {
    // v1 요청을 v2 형식으로 변환
    const v2Request = {
      name: req.body.name,
      description: req.body.description,
      format: req.body.format,
      content: req.body.content,
      tags: req.body.tags || []
    };

    // v2 API 호출 시뮬레이션
    const v2Response = {
      success: true,
      data: {
        id: 'schema_' + Date.now(),
        ...v2Request,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'v1_user',
        size: v2Request.content?.length || 0,
        isValid: true
      }
    };

    const v1Response = convertToV1Response(v2Response);
    res.status(201).json(v1Response);
  } catch (error) {
    logger.error('v1 스키마 생성 실패', { error });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// v1 스키마 조회 (v2로 프록시)
router.get('/schemas/:id', async (req: Request, res: Response) => {
  try {
    const schemaId = req.params.id;
    
    // v2 API 호출 시뮬레이션
    const v2Response = {
      success: true,
      data: {
        id: schemaId,
        name: 'Legacy Schema',
        description: 'v1 API로 조회된 스키마',
        format: 'xml',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'v1_user',
        tags: [],
        size: 1024,
        isValid: true
      }
    };

    const v1Response = convertToV1Response(v2Response);
    res.json(v1Response);
  } catch (error) {
    logger.error('v1 스키마 조회 실패', { error });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// v1 협업 세션 생성 (v2로 프록시)
router.post('/collaboration/sessions', async (req: Request, res: Response) => {
  try {
    // v1 요청을 v2 형식으로 변환
    const v2Request = {
      schemaId: req.body.schemaId,
      name: req.body.name || 'Legacy Session',
      description: req.body.description,
      permissions: {
        read: true,
        write: true,
        delete: false,
        share: false,
        admin: false
      }
    };

    // v2 API 호출 시뮬레이션
    const v2Response = {
      success: true,
      data: {
        id: 'session_' + Date.now(),
        ...v2Request,
        createdAt: new Date().toISOString(),
        activeUsers: [],
        status: 'active'
      }
    };

    const v1Response = convertToV1Response(v2Response);
    res.status(201).json(v1Response);
  } catch (error) {
    logger.error('v1 협업 세션 생성 실패', { error });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 지원되지 않는 v1 엔드포인트에 대한 안내
router.use((req: Request, res: Response) => {
  res.status(410).json({
    error: 'This API v1 endpoint is no longer supported',
    code: 'ENDPOINT_DEPRECATED',
    message: 'Please migrate to API v2. See /api/v2/docs for documentation.',
    migrationGuide: '/api/v2/version/migration/1.0/2.0'
  });
});

export { router as compatibilityRouter };