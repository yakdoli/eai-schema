/**
 * API 버전 관리 라우터
 * 버전 정보 및 하위 호환성 관리
 */

import { Router, Request, Response } from 'express';
import { ApiResponse, ApiVersionResponse, VersionInfo } from '../../types/api-v2';
import { Logger } from '../../core/logging/Logger';

// Request 인터페이스 확장
interface AuthenticatedRequest extends Request {
  requestId?: string;
  user?: { id: string };
}

const router = Router();
const logger = new Logger('VersionAPIv2');

// 지원되는 API 버전 정보
const API_VERSIONS: Record<string, VersionInfo> = {
  '1.0': {
    version: '1.0',
    deprecated: true,
    deprecationDate: '2024-01-01',
    supportedUntil: '2025-12-31',
    migrationGuide: '/api/v2/version/migration/1.0/2.0',
  },
  '2.0': {
    version: '2.0',
    deprecated: false,
  },
};

// API 기능 매트릭스 (버전별 지원 기능)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API_FEATURES: Record<string, Record<string, boolean>> = {
  '1.0': {
    'schema-crud': true,
    collaboration: true,
    'grid-conversion': false,
    'batch-operations': false,
    'advanced-validation': false,
    'real-time-sync': false,
    'api-documentation': false,
    'rate-limiting': true,
    authentication: false,
  },
  '2.0': {
    'schema-crud': true,
    collaboration: true,
    'grid-conversion': true,
    'batch-operations': true,
    'advanced-validation': true,
    'real-time-sync': true,
    'api-documentation': true,
    'rate-limiting': true,
    authentication: true,
  },
};

// 현재 API 버전 정보 조회
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const versionResponse: ApiVersionResponse = {
      current: '2.0',
      supported: ['1.0', '2.0'],
      versions: API_VERSIONS,
    };

    const response: ApiResponse<ApiVersionResponse> = {
      success: true,
      data: versionResponse,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('버전 정보 조회 실패', { error, requestId: req.requestId });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };
    res.status(500).json(response);
  }
});

// 특정 버전 정보 조회
router.get('/:version', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const version = req.params.version;
    if (!version) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_VERSION',
          message: '버전 정보가 필요합니다.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown',
        },
      };
      return res.status(400).json(response);
    }

    const versionInfo = API_VERSIONS[version];

    if (!versionInfo) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `API 버전 ${version}을 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<VersionInfo> = {
      success: true,
      data: versionInfo,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('특정 버전 정보 조회 실패', { error, requestId: req.requestId });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };
    return res.status(500).json(response);
  }
});

// API 호환성 체크
router.post('/compatibility', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromVersion, toVersion } = req.body;

    if (!fromVersion || !toVersion) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'fromVersion과 toVersion이 필요합니다.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown',
        },
      };
      return res.status(400).json(response);
    }

    const fromVersionInfo = API_VERSIONS[fromVersion];
    const toVersionInfo = API_VERSIONS[toVersion];

    if (!fromVersionInfo || !toVersionInfo) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: '지원되지 않는 API 버전입니다.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown',
        },
      };
      return res.status(404).json(response);
    }

    // 호환성 체크 로직
    const isCompatible = checkCompatibility(fromVersion, toVersion);
    const breakingChanges = getBreakingChanges(fromVersion, toVersion);
    const migrationSteps = getMigrationSteps(fromVersion, toVersion);

    const compatibilityResult = {
      compatible: isCompatible,
      fromVersion: fromVersionInfo,
      toVersion: toVersionInfo,
      breakingChanges,
      migrationSteps,
      migrationGuide: toVersionInfo.migrationGuide,
    };

    const response: ApiResponse = {
      success: true,
      data: compatibilityResult,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('호환성 체크 실패', { error, requestId: req.requestId });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    };
    return res.status(500).json(response);
  }
});

// 호환성 체크 헬퍼 함수
function checkCompatibility(fromVersion: string, toVersion: string): boolean {
  // v1 -> v2는 호환되지 않음 (breaking changes 존재)
  if (fromVersion === '1.0' && toVersion === '2.0') {
    return false;
  }

  // 같은 버전은 호환됨
  if (fromVersion === toVersion) {
    return true;
  }

  return false;
}

// Breaking changes 조회 헬퍼 함수
function getBreakingChanges(fromVersion: string, toVersion: string): string[] {
  if (fromVersion === '1.0' && toVersion === '2.0') {
    return [
      '응답 형식이 표준화된 ApiResponse 구조로 변경',
      '에러 응답 형식 변경',
      '일부 엔드포인트 경로 변경 (/api/v2/ 접두사 추가)',
      '요청/응답 타입 강화 및 검증 추가',
      '페이지네이션 형식 변경',
      'WebSocket 이벤트 형식 변경',
    ];
  }

  return [];
}

// 마이그레이션 단계 조회 헬퍼 함수
function getMigrationSteps(fromVersion: string, toVersion: string): string[] {
  if (fromVersion === '1.0' && toVersion === '2.0') {
    return [
      '1. API v2 문서 검토 및 변경사항 파악',
      '2. 클라이언트 코드에서 사용 중인 v1 엔드포인트 식별',
      '3. v2 엔드포인트로 요청 URL 변경 (/api/v2/ 접두사 추가)',
      '4. 응답 처리 로직을 ApiResponse 구조에 맞게 수정',
      '5. 에러 처리 로직을 새로운 에러 형식에 맞게 수정',
      '6. 페이지네이션 로직 업데이트',
      '7. WebSocket 연결 및 이벤트 처리 로직 업데이트',
      '8. 테스트 환경에서 전체 기능 검증',
      '9. 프로덕션 배포 및 모니터링',
    ];
  }

  return [];
}

export { router as versionRouter };
