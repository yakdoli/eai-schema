/**
 * 스키마 관리 API v2 라우터
 * RESTful 스키마 CRUD 및 변환 기능
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { authMiddleware } from '../../middleware/authMiddleware';
import { SchemaConversionService } from '../../services/SchemaConversionService';
import { GridManager } from '../../services/GridManager';
import { Logger } from '../../core/logging/Logger';
import { 
  ApiResponse, 
  CreateSchemaRequest, 
  UpdateSchemaRequest,
  SchemaResponse,
  ConvertToGridRequest,
  UpdateGridRequest,
  ExportSchemaRequest,
  SearchRequest,
  BatchRequest,
  BatchResponse
} from '../../types/api-v2';

const router = Router();
const logger = new Logger('SchemasAPIv2');
const schemaService = new SchemaConversionService();
const gridManager = new GridManager();

/**
 * @swagger
 * tags:
 *   - name: Schemas
 *     description: 스키마 관리 API
 * 
 * /api/v2/schemas:
 *   get:
 *     summary: 스키마 목록 조회
 *     description: 페이지네이션과 필터링을 지원하는 스키마 목록을 조회합니다.
 *     tags: [Schemas]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [xml, json, yaml, xsd, wsdl]
 *         description: 스키마 형식 필터
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 태그 필터 (쉼표로 구분)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어
 *     responses:
 *       200:
 *         description: 스키마 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SchemaResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// 스키마 목록 조회
router.get('/', 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('페이지는 1 이상의 정수여야 합니다'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('제한은 1-100 사이의 정수여야 합니다'),
    query('format').optional().isIn(['xml', 'json', 'yaml', 'xsd', 'wsdl']).withMessage('유효하지 않은 형식입니다'),
    query('tags').optional().isString().withMessage('태그는 문자열이어야 합니다'),
    query('search').optional().isString().withMessage('검색어는 문자열이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const format = req.query.format as string;
      const tags = req.query.tags as string;
      const search = req.query.search as string;

      // 임시 구현 - 실제로는 데이터베이스에서 조회
      const schemas: SchemaResponse[] = [];
      const total = 0;

      const response: ApiResponse<SchemaResponse[]> = {
        success: true,
        data: schemas,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('스키마 목록 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

/**
 * @swagger
 * /api/v2/schemas:
 *   post:
 *     summary: 새 스키마 생성
 *     description: 새로운 스키마를 생성하고 검증합니다.
 *     tags: [Schemas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSchemaRequest'
 *     responses:
 *       201:
 *         description: 스키마 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SchemaResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       422:
 *         description: 스키마 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// 스키마 생성
router.post('/',
  [
    body('name').notEmpty().withMessage('스키마 이름은 필수입니다'),
    body('format').isIn(['xml', 'json', 'yaml', 'xsd', 'wsdl']).withMessage('유효하지 않은 형식입니다'),
    body('content').notEmpty().withMessage('스키마 내용은 필수입니다'),
    body('description').optional().isString().withMessage('설명은 문자열이어야 합니다'),
    body('tags').optional().isArray().withMessage('태그는 배열이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const createRequest: CreateSchemaRequest = req.body;
      
      // 스키마 검증 (임시 구현)
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };

      if (!validationResult.isValid) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'SCHEMA_VALIDATION_FAILED',
            message: '스키마 검증에 실패했습니다',
            details: validationResult.errors,
            timestamp: new Date().toISOString(),
            requestId: req.requestId!
          }
        };
        return res.status(400).json(response);
      }

      // 스키마 생성 (임시 구현)
      const schema: SchemaResponse = {
        id: `schema_${Date.now()}`,
        name: createRequest.name,
        description: createRequest.description,
        format: createRequest.format,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id || 'anonymous',
        tags: createRequest.tags || [],
        size: createRequest.content.length,
        isValid: true,
        lastValidation: validationResult
      };

      const response: ApiResponse<SchemaResponse> = {
        success: true,
        data: schema,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('스키마 생성 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

/**
 * @swagger
 * /api/v2/schemas/{id}:
 *   get:
 *     summary: 특정 스키마 조회
 *     description: ID로 특정 스키마의 상세 정보를 조회합니다.
 *     tags: [Schemas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 스키마 ID
 *     responses:
 *       200:
 *         description: 스키마 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SchemaResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// 스키마 조회
router.get('/:id',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      
      // 임시 구현 - 실제로는 데이터베이스에서 조회
      const schema: SchemaResponse = {
        id: schemaId,
        name: '샘플 스키마',
        description: '테스트용 스키마입니다',
        format: 'xml',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user123',
        tags: ['test', 'sample'],
        size: 1024,
        isValid: true
      };

      const response: ApiResponse<SchemaResponse> = {
        success: true,
        data: schema,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('스키마 조회 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 스키마 업데이트
router.put('/:id',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    body('name').optional().isString().withMessage('이름은 문자열이어야 합니다'),
    body('description').optional().isString().withMessage('설명은 문자열이어야 합니다'),
    body('content').optional().isString().withMessage('내용은 문자열이어야 합니다'),
    body('tags').optional().isArray().withMessage('태그는 배열이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      const updateRequest: UpdateSchemaRequest = req.body;

      // 스키마 업데이트 로직 (임시 구현)
      const updatedSchema: SchemaResponse = {
        id: schemaId,
        name: updateRequest.name || '업데이트된 스키마',
        description: updateRequest.description,
        format: 'xml',
        version: '1.1.0',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user123',
        tags: updateRequest.tags || [],
        size: updateRequest.content?.length || 1024,
        isValid: true
      };

      const response: ApiResponse<SchemaResponse> = {
        success: true,
        data: updatedSchema,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('스키마 업데이트 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 스키마 삭제
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      
      // 스키마 삭제 로직 (임시 구현)
      
      const response: ApiResponse = {
        success: true,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('스키마 삭제 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 스키마를 그리드로 변환
router.post('/:id/grid',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    body('format').isIn(['xml', 'json', 'yaml']).withMessage('유효하지 않은 형식입니다'),
    body('content').notEmpty().withMessage('변환할 내용은 필수입니다'),
    body('options').optional().isObject().withMessage('옵션은 객체여야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      const convertRequest: ConvertToGridRequest = req.body;

      // 그리드 변환 (임시 구현)
      const gridData = {
        data: [],
        metadata: {
          columns: [],
          rowCount: 0,
          columnCount: 0
        }
      };

      const response: ApiResponse = {
        success: true,
        data: gridData,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('그리드 변환 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 그리드 데이터 업데이트
router.put('/:id/grid',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    body('gridData').isArray().withMessage('그리드 데이터는 배열이어야 합니다'),
    body('metadata').optional().isObject().withMessage('메타데이터는 객체여야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      const updateRequest: UpdateGridRequest = req.body;

      // 그리드 데이터 업데이트 로직 (임시 구현)
      const result = {
        success: true,
        updatedAt: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        data: result,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('그리드 데이터 업데이트 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 스키마 내보내기
router.get('/:id/export',
  [
    param('id').notEmpty().withMessage('스키마 ID는 필수입니다'),
    query('format').isIn(['xml', 'json', 'yaml']).withMessage('유효하지 않은 형식입니다'),
    query('pretty').optional().isBoolean().withMessage('pretty는 불린값이어야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const schemaId = req.params.id;
      const format = req.query.format as string;
      const pretty = req.query.pretty === 'true';

      // 스키마 내보내기 로직 (임시 구현)
      const exportedContent = `<!-- 임시 ${format} 내용 -->`;
      
      if (!exportedContent) {
        throw new Error('스키마를 찾을 수 없습니다');
      }

      // 파일 다운로드 응답
      const filename = `schema_${schemaId}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', `application/${format}`);
      res.send(exportedContent);
    } catch (error) {
      logger.error('스키마 내보내기 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 스키마 검색
router.post('/search',
  [
    body('query').notEmpty().withMessage('검색어는 필수입니다'),
    body('filters').optional().isObject().withMessage('필터는 객체여야 합니다'),
    body('sort').optional().isObject().withMessage('정렬은 객체여야 합니다'),
    body('pagination').optional().isObject().withMessage('페이지네이션은 객체여야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const searchRequest: SearchRequest = req.body;
      
      // 검색 로직 (임시 구현)
      const results: SchemaResponse[] = [];
      const total = 0;

      const response: ApiResponse<SchemaResponse[]> = {
        success: true,
        data: results,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!,
          pagination: {
            page: searchRequest.pagination?.page || 1,
            limit: searchRequest.pagination?.limit || 20,
            total,
            totalPages: Math.ceil(total / (searchRequest.pagination?.limit || 20)),
            hasNext: false,
            hasPrev: false
          }
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('스키마 검색 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

// 배치 작업
router.post('/batch',
  [
    body('operations').isArray().withMessage('작업은 배열이어야 합니다'),
    body('options').optional().isObject().withMessage('옵션은 객체여야 합니다'),
    validationMiddleware
  ],
  async (req: Request, res: Response) => {
    try {
      const batchRequest: BatchRequest<CreateSchemaRequest | UpdateSchemaRequest> = req.body;
      
      // 배치 작업 로직 (임시 구현)
      const results = batchRequest.operations.map((op, index) => ({
        success: true,
        data: { id: `batch_${index}` },
        operation: op.operation,
        id: op.id
      }));

      const batchResponse: BatchResponse<any> = {
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          duration: 100
        }
      };

      const response: ApiResponse<BatchResponse<any>> = {
        success: true,
        data: batchResponse,
        meta: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: req.requestId!
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('배치 작업 실패', { error, requestId: req.requestId });
      throw error;
    }
  }
);

export { router as schemasRouter };