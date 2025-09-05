/**
 * API 버전 관리 라우터
 * 버전 정보 및 하위 호환성 관리
 */

import { Router, Request, Response } from 'express';
import { ApiResponse, ApiVersionResponse, VersionInfo } from '../../types/api-v2';
import { Logger } from '../../core/logging/Logger';

const router = Router();
const logger = new Logger('VersionAPIv2');

// 지원되는 API 버전 정보
const API_VERSIONS: Record<string, VersionInfo> = {
  '1.0': {
    version: '1.0',
    deprecated: true,
    deprecationDate: '2024-01-01',
    supportedUntil: '2025-12-31',
    migrationGuide: '/api/v2/version/migration/1.0/2.0'
  },
  '2.0': {
    version: '2.0',
    deprecated: false
  }
};

// API 기능 매트릭스 (버전별 지원 기능)
const API_FEATURES: Record<string, Record<string, boolean>> = {
  '1.0': {
    'schema-crud': true,
    'collaboration': true,
    'grid-conversion': false,
    'batch-operations': false,
    'advanced-validation': false,
    'real-time-sync': false,
    'api-documentation': false,
    'rate-limiting': true,
    'authentication': false
  },
  '2.0': {
    'schema-crud': true,
    'collaboration': true,
    'grid-conversion': true,
    'batch-operations': true,
    'advanced-validation': true,
    'real-time-sync': true,
    'api-documentation': true,
    'rate-limiting': true,
    'authentication': true
  }
};

// 현재 API 버전 정보 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const versionResponse: ApiVersionResponse = {
      current: '2.0',
      supported: ['1.0', '2.0'],
      versions: API_VERSIONS
    };

    const response: ApiResponse<ApiVersionResponse> = {
      success: true,
      data: versionResponse,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('버전 정보 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// 특정 버전 정보 조회
router.get('/:version', async (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const versionInfo = API_VERSIONS[version];

    if (!versionInfo) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `API 버전 ${version}을 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<VersionInfo> = {
      success: true,
      data: versionInfo,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('특정 버전 정보 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// API 호환성 체크
router.post('/compatibility', async (req: Request, res: Response) => {
  try {
    const { fromVersion, toVersion } = req.body;

    if (!fromVersion || !toVersion) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'fromVersion과 toVersion이 필요합니다.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
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
          requestId: req.requestId!
        }
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
      migrationGuide: toVersionInfo.migrationGuide
    };

    const response: ApiResponse = {
      success: true,
      data: compatibilityResult,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('호환성 체크 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// 마이그레이션 가이드 조회
router.get('/migration/:fromVersion/:toVersion', async (req: Request, res: Response) => {
  try {
    const { fromVersion, toVersion } = req.params;

    const migrationGuide = {
      fromVersion,
      toVersion,
      steps: getMigrationSteps(fromVersion, toVersion),
      breakingChanges: getBreakingChanges(fromVersion, toVersion),
      estimatedTime: '30-60분',
      difficulty: 'medium',
      prerequisites: [
        'API v1 사용 중인 모든 엔드포인트 식별',
        '테스트 환경에서 마이그레이션 테스트',
        '백업 및 롤백 계획 수립'
      ],
      resources: [
        {
          title: 'API v2 문서',
          url: '/docs/api/v2'
        },
        {
          title: '마이그레이션 체크리스트',
          url: '/docs/migration/checklist'
        },
        {
          title: '예제 코드',
          url: '/docs/examples/migration'
        }
      ]
    };

    const response: ApiResponse = {
      success: true,
      data: migrationGuide,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('마이그레이션 가이드 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// 헬스체크 (기본 - v2.0)
router.get('/health', async (req: Request, res: Response) => {
  try {
    const version = '2.0';
    const versionInfo = API_VERSIONS[version];

    const healthStatus = {
      version,
      status: 'healthy',
      deprecated: false,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    const response: ApiResponse = {
      success: true,
      data: healthStatus,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('헬스체크 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// 헬스체크 (특정 버전)
router.get('/health/:version', async (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const versionInfo = API_VERSIONS[version];

    if (!versionInfo) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `API 버전 ${version}을 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };
      return res.status(404).json(response);
    }

    const healthStatus = {
      version,
      status: versionInfo.deprecated ? 'deprecated' : 'healthy',
      deprecated: versionInfo.deprecated,
      deprecationDate: versionInfo.deprecationDate,
      supportedUntil: versionInfo.supportedUntil,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    const response: ApiResponse = {
      success: true,
      data: healthStatus,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    // deprecated 버전의 경우 경고 헤더 추가
    if (versionInfo.deprecated) {
      res.setHeader('Warning', `299 - "API version ${version} is deprecated. Please migrate to version 2.0"`);
    }

    res.json(response);
  } catch (error) {
    logger.error('헬스체크 실패', { error, requestId: req.requestId });
    throw error;
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
      'WebSocket 이벤트 형식 변경'
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
      '9. 프로덕션 배포 및 모니터링'
    ];
  }
  
  return [];
}

// API 기능 비교 (모든 버전)
router.get('/features', async (req: Request, res: Response) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        version: 'all',
        features: API_FEATURES
      },
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('API 기능 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// API 기능 비교 (특정 버전)
router.get('/features/:version', async (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    
    if (!API_FEATURES[version]) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `API 버전 ${version}을 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        version,
        features: API_FEATURES[version]
      },
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('API 기능 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// API 상태 및 통계
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = {
      totalVersions: Object.keys(API_VERSIONS).length,
      currentVersion: '2.0',
      deprecatedVersions: Object.values(API_VERSIONS).filter(v => v.deprecated).length,
      supportedVersions: Object.keys(API_VERSIONS),
      uptime: process.uptime(),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      lastDeployment: process.env.DEPLOYMENT_TIME || new Date().toISOString(),
      features: {
        totalFeatures: Object.keys(API_FEATURES['2.0']).length,
        newInV2: Object.entries(API_FEATURES['2.0'])
          .filter(([feature, supported]) => supported && !API_FEATURES['1.0'][feature])
          .map(([feature]) => feature)
      }
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('API 통계 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// 변경 로그 데이터
const CHANGELOG = {
  '2.0': {
    version: '2.0',
    releaseDate: '2025-01-01',
    changes: [
      {
        type: 'feature',
        title: '엑셀라이크 그리드 인터페이스 추가',
        description: 'Handsontable 기반의 직관적인 스키마 편집 인터페이스 구현'
      },
      {
        type: 'feature',
        title: '배치 작업 지원',
        description: '여러 스키마를 한 번에 생성, 수정, 삭제할 수 있는 배치 API 추가'
      },
      {
        type: 'feature',
        title: '고급 검증 시스템',
        description: '실시간 스키마 검증 및 상세한 오류 보고 기능'
      },
      {
        type: 'feature',
        title: 'API 문서 자동 생성',
        description: 'OpenAPI/Swagger 기반 자동 문서 생성 시스템'
      },
      {
        type: 'improvement',
        title: '응답 형식 표준화',
        description: '모든 API 응답을 일관된 ApiResponse 형식으로 표준화'
      },
      {
        type: 'improvement',
        title: '에러 처리 개선',
        description: '상세한 에러 코드 및 메시지 제공'
      },
      {
        type: 'breaking',
        title: 'URL 구조 변경',
        description: '모든 v2 엔드포인트에 /api/v2/ 접두사 추가'
      }
    ]
  },
  '1.0': {
    version: '1.0',
    releaseDate: '2024-01-01',
    changes: [
      {
        type: 'feature',
        title: '기본 스키마 CRUD 작업',
        description: '스키마 생성, 조회, 수정, 삭제 기능'
      },
      {
        type: 'feature',
        title: '실시간 협업',
        description: 'WebSocket 기반 실시간 협업 기능'
      },
      {
        type: 'feature',
        title: '스키마 변환',
        description: 'XML, JSON, YAML 간 스키마 변환 기능'
      }
    ]
  }
};

// API 변경 로그 (모든 버전)
router.get('/changelog', async (req: Request, res: Response) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: CHANGELOG,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('변경 로그 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

// API 변경 로그 (특정 버전)
router.get('/changelog/:version', async (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    
    if (!CHANGELOG[version]) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `버전 ${version}의 변경 로그를 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: CHANGELOG[version],
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId!
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('변경 로그 조회 실패', { error, requestId: req.requestId });
    throw error;
  }
});

export { router as versionRouter };