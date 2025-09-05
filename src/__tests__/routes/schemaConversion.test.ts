/**
 * 스키마 변환 API 라우터 테스트
 */

import request from 'supertest';
import express from 'express';
import schemaConversionRouter from '../../routes/schemaConversion';
import { SchemaFormat, SchemaGridData } from '../../types/schema';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

// SchemaConversionService 모킹
jest.mock('../../services/SchemaConversionService', () => {
  return {
    SchemaConversionService: jest.fn().mockImplementation(() => ({
      convertFromGrid: jest.fn(),
      convertToGrid: jest.fn(),
      validateSchema: jest.fn(),
      convertBetweenFormats: jest.fn(),
      getSupportedFormats: jest.fn(),
      detectSchemaFormat: jest.fn(),
      generateSchemaStats: jest.fn()
    }))
  };
});

// 검증 미들웨어 모킹
jest.mock('../../middleware/validationMiddleware', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next()
}));

// asyncHandler 모킹
jest.mock('../../core/utils/asyncHandler', () => ({
  asyncHandler: (fn: any) => fn
}));

describe('Schema Conversion API Router', () => {
  let app: express.Application;
  let mockSchemaConversionService: any;

  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Express 앱 설정
    app = express();
    app.use(express.json());
    app.use('/api/v2/schema-conversion', schemaConversionRouter);

    // SchemaConversionService 모킹 가져오기
    const { SchemaConversionService } = require('../../services/SchemaConversionService');
    mockSchemaConversionService = new SchemaConversionService();
  });

  describe('POST /from-grid', () => {
    const sampleGridData: SchemaGridData[][] = [
      [{
        fieldName: 'id',
        dataType: 'integer',
        required: true,
        description: '고유 식별자'
      }]
    ];

    it('그리드 데이터를 성공적으로 변환해야 함', async () => {
      const mockResult = {
        json: '{"type": "object"}',
        errors: [],
        warnings: []
      };

      mockSchemaConversionService.convertFromGrid.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v2/schema-conversion/from-grid')
        .send({
          gridData: sampleGridData,
          targetFormats: [SchemaFormat.JSON]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.metadata.hasErrors).toBe(false);
    });

    it('잘못된 요청 데이터에 대해 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/schema-conversion/from-grid')
        .send({
          gridData: 'invalid', // 배열이 아님
          targetFormats: [SchemaFormat.JSON]
        });

      expect(response.status).toBe(400);
    });

    it('유효하지 않은 대상 형식에 대해 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/schema-conversion/from-grid')
        .send({
          gridData: sampleGridData,
          targetFormats: ['invalid_format']
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /to-grid', () => {
    const sampleSchema = '{"type": "object", "properties": {"id": {"type": "integer"}}}';

    it('스키마를 그리드 데이터로 성공적으로 변환해야 함', async () => {
      const mockGridData: SchemaGridData[][] = [
        [{
          fieldName: 'id',
          dataType: 'integer',
          required: true,
          description: '고유 식별자'
        }]
      ];

      mockSchemaConversionService.convertToGrid.mockResolvedValue(mockGridData);

      const response = await request(app)
        .post('/api/v2/schema-conversion/to-grid')
        .send({
          schema: sampleSchema,
          sourceFormat: SchemaFormat.JSON
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockGridData);
      expect(response.body.metadata.rowCount).toBe(1);
    });

    it('빈 스키마에 대해 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/schema-conversion/to-grid')
        .send({
          schema: '',
          sourceFormat: SchemaFormat.JSON
        });

      expect(response.status).toBe(400);
    });

    it('유효하지 않은 소스 형식에 대해 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/schema-conversion/to-grid')
        .send({
          schema: sampleSchema,
          sourceFormat: 'invalid_format'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /validate', () => {
    const sampleSchema = '{"type": "object"}';

    it('스키마를 성공적으로 검증해야 함', async () => {
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockSchemaConversionService.validateSchema.mockResolvedValue(mockValidationResult);

      const response = await request(app)
        .post('/api/v2/schema-conversion/validate')
        .send({
          schema: sampleSchema,
          format: SchemaFormat.JSON
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidationResult);
      expect(response.body.metadata.isValid).toBe(true);
    });

    it('검증 실패 시에도 200 상태로 결과를 반환해야 함', async () => {
      const mockValidationResult = {
        isValid: false,
        errors: [{ field: 'schema', message: '검증 오류', code: 'VALIDATION_ERROR' }],
        warnings: []
      };

      mockSchemaConversionService.validateSchema.mockResolvedValue(mockValidationResult);

      const response = await request(app)
        .post('/api/v2/schema-conversion/validate')
        .send({
          schema: sampleSchema,
          format: SchemaFormat.JSON
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.metadata.errorCount).toBe(1);
    });
  });

  describe('POST /convert', () => {
    const sampleSchema = '{"type": "object"}';

    it('형식 간 변환을 성공적으로 수행해야 함', async () => {
      const mockResult = {
        xml: '<schema></schema>',
        errors: [],
        warnings: []
      };

      mockSchemaConversionService.convertBetweenFormats.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v2/schema-conversion/convert')
        .send({
          schema: sampleSchema,
          sourceFormat: SchemaFormat.JSON,
          targetFormat: SchemaFormat.XML
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('동일한 소스와 대상 형식도 허용해야 함', async () => {
      const mockResult = {
        json: sampleSchema,
        errors: [],
        warnings: []
      };

      mockSchemaConversionService.convertBetweenFormats.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v2/schema-conversion/convert')
        .send({
          schema: sampleSchema,
          sourceFormat: SchemaFormat.JSON,
          targetFormat: SchemaFormat.JSON
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /formats', () => {
    it('지원되는 형식 목록을 반환해야 함', async () => {
      const mockFormats = Object.values(SchemaFormat);
      mockSchemaConversionService.getSupportedFormats.mockReturnValue(mockFormats);

      const response = await request(app)
        .get('/api/v2/schema-conversion/formats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFormats);
      expect(response.body.metadata.count).toBe(mockFormats.length);
    });
  });

  describe('POST /detect-format', () => {
    const sampleSchema = '{"type": "object"}';

    it('스키마 형식을 성공적으로 감지해야 함', async () => {
      mockSchemaConversionService.detectSchemaFormat.mockResolvedValue(SchemaFormat.JSON);

      const response = await request(app)
        .post('/api/v2/schema-conversion/detect-format')
        .send({ schema: sampleSchema });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.detectedFormat).toBe(SchemaFormat.JSON);
      expect(response.body.data.isDetected).toBe(true);
    });

    it('형식을 감지할 수 없을 때 null을 반환해야 함', async () => {
      mockSchemaConversionService.detectSchemaFormat.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v2/schema-conversion/detect-format')
        .send({ schema: 'invalid schema' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.detectedFormat).toBeNull();
      expect(response.body.data.isDetected).toBe(false);
    });
  });

  describe('POST /stats', () => {
    const sampleGridData: SchemaGridData[][] = [
      [{
        fieldName: 'id',
        dataType: 'integer',
        required: true,
        description: '고유 식별자',
        defaultValue: 1,
        constraints: '{"minimum": 1}'
      }],
      [{
        fieldName: 'name',
        dataType: 'string',
        required: false,
        description: '사용자 이름'
      }]
    ];

    it('스키마 통계를 성공적으로 생성해야 함', async () => {
      const mockStats = {
        totalFields: 2,
        requiredFields: 1,
        optionalFields: 1,
        dataTypes: { integer: 1, string: 1 },
        hasConstraints: 1,
        hasDefaultValues: 1
      };

      mockSchemaConversionService.generateSchemaStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .post('/api/v2/schema-conversion/stats')
        .send({ gridData: sampleGridData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(response.body.metadata.generatedAt).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('서비스가 정상일 때 healthy 상태를 반환해야 함', async () => {
      const mockResult = {
        json: '{"type": "object"}',
        errors: [],
        warnings: []
      };

      mockSchemaConversionService.convertFromGrid.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v2/schema-conversion/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.testPassed).toBe(true);
    });

    it('서비스에 문제가 있을 때 503 오류를 반환해야 함', async () => {
      mockSchemaConversionService.convertFromGrid.mockRejectedValue(new Error('서비스 오류'));

      const response = await request(app)
        .get('/api/v2/schema-conversion/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_UNHEALTHY');
    });
  });
});