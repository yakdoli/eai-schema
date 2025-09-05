/**
 * API 문서 자동 생성 라우터
 * OpenAPI/Swagger 문서 제공
 */

import { Router, Request, Response } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Logger } from '../../core/logging/Logger';

const router = Router();
const logger = new Logger('DocsAPIv2');

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EAI Schema Toolkit API v2',
      version: '2.0.0',
      description: 'Enterprise Application Integration Schema Conversion and Validation Tool API',
      contact: {
        name: 'EAI Schema Toolkit',
        url: 'https://yakdoli.github.io/eai-schema/',
        email: 'support@eai-schema-toolkit.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api/v2',
        description: 'API v2 서버'
      },
      {
        url: 'https://eai-schema-toolkit.herokuapp.com/api/v2',
        description: '프로덕션 서버'
      }
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '요청 성공 여부'
            },
            data: {
              description: '응답 데이터'
            },
            error: {
              $ref: '#/components/schemas/ApiError'
            },
            meta: {
              $ref: '#/components/schemas/ResponseMeta'
            }
          },
          required: ['success']
        },
        ApiError: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '에러 코드'
            },
            message: {
              type: 'string',
              description: '에러 메시지'
            },
            details: {
              description: '에러 상세 정보'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '에러 발생 시간'
            },
            requestId: {
              type: 'string',
              description: '요청 ID'
            }
          },
          required: ['code', 'message', 'timestamp', 'requestId']
        },
        ResponseMeta: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'API 버전'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '응답 생성 시간'
            },
            requestId: {
              type: 'string',
              description: '요청 ID'
            },
            pagination: {
              $ref: '#/components/schemas/PaginationMeta'
            }
          },
          required: ['version', 'timestamp', 'requestId']
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: '현재 페이지'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: '페이지당 항목 수'
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: '전체 항목 수'
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: '전체 페이지 수'
            },
            hasNext: {
              type: 'boolean',
              description: '다음 페이지 존재 여부'
            },
            hasPrev: {
              type: 'boolean',
              description: '이전 페이지 존재 여부'
            }
          },
          required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
        },
        SchemaResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '스키마 ID'
            },
            name: {
              type: 'string',
              description: '스키마 이름'
            },
            description: {
              type: 'string',
              description: '스키마 설명'
            },
            format: {
              type: 'string',
              enum: ['xml', 'json', 'yaml', 'xsd', 'wsdl'],
              description: '스키마 형식'
            },
            version: {
              type: 'string',
              description: '스키마 버전'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정 시간'
            },
            createdBy: {
              type: 'string',
              description: '생성자'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '태그 목록'
            },
            size: {
              type: 'integer',
              minimum: 0,
              description: '스키마 크기 (바이트)'
            },
            isValid: {
              type: 'boolean',
              description: '스키마 유효성'
            }
          },
          required: ['id', 'name', 'format', 'version', 'createdAt', 'updatedAt', 'createdBy', 'tags', 'size', 'isValid']
        },
        CreateSchemaRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '스키마 이름'
            },
            description: {
              type: 'string',
              description: '스키마 설명'
            },
            format: {
              type: 'string',
              enum: ['xml', 'json', 'yaml', 'xsd', 'wsdl'],
              description: '스키마 형식'
            },
            content: {
              type: 'string',
              description: '스키마 내용'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '태그 목록'
            }
          },
          required: ['name', 'format', 'content']
        },
        SessionResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '세션 ID'
            },
            schemaId: {
              type: 'string',
              description: '스키마 ID'
            },
            name: {
              type: 'string',
              description: '세션 이름'
            },
            description: {
              type: 'string',
              description: '세션 설명'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: '만료 시간'
            },
            activeUsers: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ActiveUser'
              },
              description: '활성 사용자 목록'
            },
            permissions: {
              $ref: '#/components/schemas/SessionPermissions'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'expired'],
              description: '세션 상태'
            }
          },
          required: ['id', 'schemaId', 'createdAt', 'activeUsers', 'permissions', 'status']
        },
        ActiveUser: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '사용자 ID'
            },
            name: {
              type: 'string',
              description: '사용자 이름'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '사용자 이메일'
            },
            cursor: {
              $ref: '#/components/schemas/CursorPosition'
            },
            selection: {
              $ref: '#/components/schemas/SelectionRange'
            },
            color: {
              type: 'string',
              description: '사용자 색상'
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              description: '마지막 활동 시간'
            },
            permissions: {
              $ref: '#/components/schemas/SessionPermissions'
            }
          },
          required: ['id', 'name', 'color', 'lastActivity', 'permissions']
        },
        SessionPermissions: {
          type: 'object',
          properties: {
            read: {
              type: 'boolean',
              description: '읽기 권한'
            },
            write: {
              type: 'boolean',
              description: '쓰기 권한'
            },
            delete: {
              type: 'boolean',
              description: '삭제 권한'
            },
            share: {
              type: 'boolean',
              description: '공유 권한'
            },
            admin: {
              type: 'boolean',
              description: '관리자 권한'
            }
          },
          required: ['read', 'write', 'delete', 'share', 'admin']
        },
        CursorPosition: {
          type: 'object',
          properties: {
            row: {
              type: 'integer',
              minimum: 0,
              description: '행 위치'
            },
            col: {
              type: 'integer',
              minimum: 0,
              description: '열 위치'
            }
          },
          required: ['row', 'col']
        },
        SelectionRange: {
          type: 'object',
          properties: {
            startRow: {
              type: 'integer',
              minimum: 0,
              description: '시작 행'
            },
            startCol: {
              type: 'integer',
              minimum: 0,
              description: '시작 열'
            },
            endRow: {
              type: 'integer',
              minimum: 0,
              description: '끝 행'
            },
            endCol: {
              type: 'integer',
              minimum: 0,
              description: '끝 열'
            }
          },
          required: ['startRow', 'startCol', 'endRow', 'endCol']
        },
        ValidationResult: {
          type: 'object',
          properties: {
            isValid: {
              type: 'boolean',
              description: '검증 결과'
            },
            errors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ValidationError'
              },
              description: '검증 오류 목록'
            },
            warnings: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ValidationWarning'
              },
              description: '검증 경고 목록'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '검증 수행 시간'
            }
          },
          required: ['isValid', 'errors', 'warnings', 'timestamp']
        },
        ValidationError: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '오류 코드'
            },
            message: {
              type: 'string',
              description: '오류 메시지'
            },
            line: {
              type: 'integer',
              description: '오류 발생 라인'
            },
            column: {
              type: 'integer',
              description: '오류 발생 컬럼'
            },
            path: {
              type: 'string',
              description: '오류 발생 경로'
            }
          },
          required: ['code', 'message']
        },
        ValidationWarning: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '경고 코드'
            },
            message: {
              type: 'string',
              description: '경고 메시지'
            },
            line: {
              type: 'integer',
              description: '경고 발생 라인'
            },
            column: {
              type: 'integer',
              description: '경고 발생 컬럼'
            },
            path: {
              type: 'string',
              description: '경고 발생 경로'
            }
          },
          required: ['code', 'message']
        },
        GridCellData: {
          type: 'object',
          properties: {
            value: {
              description: '셀 값'
            },
            type: {
              type: 'string',
              enum: ['string', 'number', 'boolean', 'date', 'object', 'array'],
              description: '데이터 타입'
            },
            validation: {
              $ref: '#/components/schemas/CellValidation'
            },
            formatting: {
              $ref: '#/components/schemas/CellFormatting'
            }
          },
          required: ['value', 'type']
        },
        CellValidation: {
          type: 'object',
          properties: {
            required: {
              type: 'boolean',
              description: '필수 여부'
            },
            pattern: {
              type: 'string',
              description: '정규식 패턴'
            },
            min: {
              type: 'number',
              description: '최솟값'
            },
            max: {
              type: 'number',
              description: '최댓값'
            },
            enum: {
              type: 'array',
              items: {},
              description: '허용되는 값 목록'
            }
          }
        },
        CellFormatting: {
          type: 'object',
          properties: {
            color: {
              type: 'string',
              description: '글자 색상'
            },
            backgroundColor: {
              type: 'string',
              description: '배경 색상'
            },
            bold: {
              type: 'boolean',
              description: '굵게 표시'
            },
            italic: {
              type: 'boolean',
              description: '기울임 표시'
            },
            alignment: {
              type: 'string',
              enum: ['left', 'center', 'right'],
              description: '정렬 방식'
            }
          }
        },
        BatchRequest: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BatchOperation'
              },
              description: '배치 작업 목록'
            },
            options: {
              $ref: '#/components/schemas/BatchOptions'
            }
          },
          required: ['operations']
        },
        BatchOperation: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'delete'],
              description: '작업 유형'
            },
            id: {
              type: 'string',
              description: '리소스 ID (update, delete 시 필요)'
            },
            data: {
              description: '작업 데이터'
            }
          },
          required: ['operation', 'data']
        },
        BatchOptions: {
          type: 'object',
          properties: {
            continueOnError: {
              type: 'boolean',
              description: '오류 발생 시 계속 진행 여부'
            },
            maxConcurrency: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: '최대 동시 실행 수'
            },
            timeout: {
              type: 'integer',
              minimum: 1000,
              description: '타임아웃 (밀리초)'
            }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      responses: {
        BadRequest: {
          description: '잘못된 요청',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        Unauthorized: {
          description: '인증 실패',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        Forbidden: {
          description: '권한 없음',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        NotFound: {
          description: '리소스를 찾을 수 없음',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        InternalServerError: {
          description: '내부 서버 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Schemas',
        description: '스키마 관리 API'
      },
      {
        name: 'Collaboration',
        description: '협업 관리 API'
      },
      {
        name: 'Version',
        description: '버전 관리 API'
      },
      {
        name: 'Documentation',
        description: 'API 문서'
      },
      {
        name: 'System',
        description: '시스템 관리 API'
      }
    ]
  },
  apis: [
    './src/routes/v2/*.ts', // API 라우터 파일들
    './src/types/api-v2.ts'  // 타입 정의 파일
  ]
};

// Swagger 문서 생성
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI 설정
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #007bff; }
  `,
  customSiteTitle: 'EAI Schema Toolkit API v2 문서',
  customfavIcon: '/favicon.ico'
};

// Swagger UI 제공
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// OpenAPI JSON 스펙 제공
router.get('/openapi.json', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  } catch (error) {
    logger.error('OpenAPI 스펙 제공 실패', { error, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'SPEC_GENERATION_FAILED',
        message: 'OpenAPI 스펙 생성에 실패했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
});

// OpenAPI YAML 스펙 제공
router.get('/openapi.yaml', (req: Request, res: Response) => {
  try {
    const yaml = require('js-yaml');
    const yamlSpec = yaml.dump(swaggerSpec);
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.send(yamlSpec);
  } catch (error) {
    logger.error('OpenAPI YAML 스펙 제공 실패', { error, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'YAML_GENERATION_FAILED',
        message: 'OpenAPI YAML 스펙 생성에 실패했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
});

// API 문서 메타데이터
router.get('/meta', (req: Request, res: Response) => {
  try {
    const spec = swaggerSpec as any;
    const meta = {
      title: spec.info?.title || 'EAI Schema Toolkit API v2',
      version: spec.info?.version || '2.0.0',
      description: spec.info?.description || 'API Documentation',
      contact: spec.info?.contact,
      license: spec.info?.license,
      servers: spec.servers || [],
      tags: spec.tags || [],
      generatedAt: new Date().toISOString(),
      endpoints: {
        ui: '/api/v2/docs',
        json: '/api/v2/docs/openapi.json',
        yaml: '/api/v2/docs/openapi.yaml'
      }
    };

    res.json({
      success: true,
      data: meta,
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  } catch (error) {
    logger.error('문서 메타데이터 제공 실패', { error, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'META_GENERATION_FAILED',
        message: '문서 메타데이터 생성에 실패했습니다.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
});

export { router as docsRouter };