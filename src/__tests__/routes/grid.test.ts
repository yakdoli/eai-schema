/**
 * 그리드 라우트 단위 테스트
 */

import request from 'supertest';
import express from 'express';
import gridRoutes from '../../routes/grid';
import { GridManager } from '../../services/GridManager';
import { GridValidationService } from '../../services/GridValidationService';

// 모킹
jest.mock('../../services/GridManager.js');
jest.mock('../../services/GridValidationService.js');

describe('Grid Routes', () => {
  let app: express.Application;
  let mockGridManager: jest.Mocked<GridManager>;
  let mockValidationService: jest.Mocked<GridValidationService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v2/grid', gridRoutes);

    // GridManager 모킹
    mockGridManager = {
      getGridStats: jest.fn(),
      convertSchemaToGridData: jest.fn(),
      convertGridDataToSchema: jest.fn(),
      createGrid: jest.fn(),
      destroyGrid: jest.fn(),
      exportGridData: jest.fn()
    } as any;

    // GridValidationService 모킹
    mockValidationService = {
      validateGrid: jest.fn(),
      getValidationStats: jest.fn()
    } as any;

    // 모킹된 인스턴스 반환 설정
    (GridManager as jest.MockedClass<typeof GridManager>).mockImplementation(() => mockGridManager);
    (GridValidationService as jest.MockedClass<typeof GridValidationService>).mockImplementation(() => mockValidationService);
  });

  describe('GET /api/v2/grid/metadata', () => {
    it('그리드 메타데이터를 반환해야 함', async () => {
      const mockStats = {
        totalGrids: 2,
        activeGrids: 2,
        totalCells: 100,
        validationErrors: 5,
        validationWarnings: 3
      };

      mockGridManager.getGridStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/v2/grid/metadata')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('columns');
      expect(response.body.data).toHaveProperty('stats', mockStats);
      expect(response.body.data).toHaveProperty('supportedFormats');
      expect(response.body.data).toHaveProperty('dataTypes');
      expect(response.body.data).toHaveProperty('validationRules');
    });
  });

  describe('POST /api/v2/grid/convert/to-grid', () => {
    it('JSON 스키마를 그리드 데이터로 변환해야 함', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'number', description: '고유 식별자' },
          name: { type: 'string', description: '이름' }
        },
        required: ['id']
      };

      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: ''
        }],
        [{
          fieldName: 'name',
          dataType: 'string',
          required: false,
          description: '이름',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockGridManager.convertSchemaToGridData.mockReturnValue(mockGridData);
      mockValidationService.validateGrid.mockReturnValue(mockValidationResult);

      const response = await request(app)
        .post('/api/v2/grid/convert/to-grid')
        .send({
          schema: mockSchema,
          format: 'json'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gridData', mockGridData);
      expect(response.body.data).toHaveProperty('validation', mockValidationResult);
      expect(response.body.data).toHaveProperty('metadata');
      expect(mockGridManager.convertSchemaToGridData).toHaveBeenCalledWith(mockSchema);
    });

    it('스키마가 없으면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/convert/to-grid')
        .send({
          format: 'json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 형식이면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/convert/to-grid')
        .send({
          schema: {},
          format: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('JSON 파싱 오류 시 422 오류를 반환해야 함', async () => {
      mockGridManager.convertSchemaToGridData.mockImplementation(() => {
        throw new Error('Parsing error');
      });

      const response = await request(app)
        .post('/api/v2/grid/convert/to-grid')
        .send({
          schema: 'invalid json',
          format: 'json'
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v2/grid/convert/to-schema', () => {
    it('그리드 데이터를 JSON 스키마로 변환해야 함', async () => {
      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: 'minimum: 1'
        }]
      ];

      const mockSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '고유 식별자',
            minimum: 1
          }
        },
        required: ['id']
      };

      mockGridManager.convertGridDataToSchema.mockReturnValue(mockSchema);

      const response = await request(app)
        .post('/api/v2/grid/convert/to-schema')
        .send({
          gridData: mockGridData,
          format: 'json'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('format', 'json');
      expect(response.body.data).toHaveProperty('contentType', 'application/json');
      expect(response.body.data).toHaveProperty('metadata');
      expect(mockGridManager.convertGridDataToSchema).toHaveBeenCalledWith(mockGridData, 'json');
    });

    it('그리드 데이터가 없으면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/convert/to-schema')
        .send({
          format: 'json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 그리드 데이터 형식이면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/convert/to-schema')
        .send({
          gridData: 'not an array',
          format: 'json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('XML 형식으로 변환할 수 있어야 함', async () => {
      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockXmlSchema = '<?xml version="1.0"?><schema>...</schema>';
      mockGridManager.convertGridDataToSchema.mockReturnValue(mockXmlSchema);

      const response = await request(app)
        .post('/api/v2/grid/convert/to-schema')
        .send({
          gridData: mockGridData,
          format: 'xml'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('xml');
      expect(response.body.data.contentType).toBe('application/xml');
    });
  });

  describe('POST /api/v2/grid/validate', () => {
    it('그리드 데이터를 검증해야 함', async () => {
      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const mockStats = {
        totalErrors: 0,
        totalWarnings: 0,
        errorsByType: {},
        warningsByType: {}
      };

      mockValidationService.validateGrid.mockReturnValue(mockValidationResult);
      mockValidationService.getValidationStats.mockReturnValue(mockStats);

      const response = await request(app)
        .post('/api/v2/grid/validate')
        .send({
          gridData: mockGridData,
          columns: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('validation', mockValidationResult);
      expect(response.body.data).toHaveProperty('stats', mockStats);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary.isValid).toBe(true);
      expect(mockValidationService.validateGrid).toHaveBeenCalledWith(mockGridData, []);
    });

    it('검증 오류가 있는 경우를 처리해야 함', async () => {
      const mockGridData = [
        [{
          fieldName: '',
          dataType: 'number',
          required: true,
          description: '',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            row: 0,
            col: 0,
            message: '필드명은 필수입니다.',
            type: 'required',
            value: ''
          }
        ],
        warnings: []
      };

      const mockStats = {
        totalErrors: 1,
        totalWarnings: 0,
        errorsByType: { required: 1 },
        warningsByType: {}
      };

      mockValidationService.validateGrid.mockReturnValue(mockValidationResult);
      mockValidationService.getValidationStats.mockReturnValue(mockStats);

      const response = await request(app)
        .post('/api/v2/grid/validate')
        .send({
          gridData: mockGridData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validation.isValid).toBe(false);
      expect(response.body.data.stats.totalErrors).toBe(1);
      expect(response.body.data.summary.criticalIssues).toBe(1);
    });

    it('그리드 데이터가 없으면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v2/grid/export', () => {
    it('CSV 형식으로 데이터를 내보내야 함', async () => {
      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockCsvData = 'fieldName,dataType,required\nid,number,true';
      
      mockGridManager.createGrid.mockReturnValue({} as any);
      mockGridManager.exportGridData.mockReturnValue(mockCsvData);
      mockGridManager.destroyGrid.mockReturnValue(true);

      const response = await request(app)
        .post('/api/v2/grid/export')
        .send({
          gridData: mockGridData,
          format: 'csv',
          filename: 'test.csv'
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment; filename="test.csv"');
      expect(response.text).toBe(mockCsvData);
      expect(mockGridManager.exportGridData).toHaveBeenCalledWith('temp-export', 'csv');
      expect(mockGridManager.destroyGrid).toHaveBeenCalledWith('temp-export');
    });

    it('JSON 형식으로 데이터를 내보내야 함', async () => {
      const mockGridData = [
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: ''
        }]
      ];

      const mockJsonData = JSON.stringify(mockGridData, null, 2);
      
      mockGridManager.createGrid.mockReturnValue({} as any);
      mockGridManager.exportGridData.mockReturnValue(mockJsonData);
      mockGridManager.destroyGrid.mockReturnValue(true);

      const response = await request(app)
        .post('/api/v2/grid/export')
        .send({
          gridData: mockGridData,
          format: 'json'
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('.json');
      expect(response.text).toBe(mockJsonData);
    });

    it('그리드 데이터가 없으면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/export')
        .send({
          format: 'csv'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('지원하지 않는 형식이면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/v2/grid/export')
        .send({
          gridData: [],
          format: 'unsupported'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v2/grid/sample', () => {
    it('기본 샘플 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/grid/sample')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gridData');
      expect(response.body.data).toHaveProperty('type', 'basic');
      expect(response.body.data).toHaveProperty('metadata');
      expect(Array.isArray(response.body.data.gridData)).toBe(true);
      expect(response.body.data.gridData.length).toBeGreaterThanOrEqual(5);
    });

    it('이커머스 샘플 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/grid/sample?type=ecommerce')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('ecommerce');
      
      const gridData = response.body.data.gridData;
      const productIdField = gridData.find((row: any) => row[0]?.fieldName === 'productId');
      expect(productIdField).toBeDefined();
      expect(productIdField[0].constraints).toContain('PRD');
    });

    it('사용자 샘플 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/grid/sample?type=user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('user');
      
      const gridData = response.body.data.gridData;
      const userIdField = gridData.find((row: any) => row[0]?.fieldName === 'userId');
      expect(userIdField).toBeDefined();
    });

    it('커스텀 개수의 샘플 데이터를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/grid/sample?count=15')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.gridData.length).toBe(15);
    });

    it('지원하지 않는 타입이면 400 오류를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/grid/sample?type=unsupported')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v2/grid/stats', () => {
    it('그리드 통계를 반환해야 함', async () => {
      const mockStats = {
        totalGrids: 3,
        activeGrids: 2,
        totalCells: 150,
        validationErrors: 8,
        validationWarnings: 4
      };

      mockGridManager.getGridStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/v2/grid/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats', mockStats);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(mockGridManager.getGridStats).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('서비스 오류 시 적절한 에러 응답을 반환해야 함', async () => {
      mockValidationService.validateGrid.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .post('/api/v2/grid/validate')
        .send({
          gridData: [{}]
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('내보내기 중 오류 발생 시 500 오류를 반환해야 함', async () => {
      mockGridManager.createGrid.mockImplementation(() => {
        throw new Error('Export error');
      });

      const response = await request(app)
        .post('/api/v2/grid/export')
        .send({
          gridData: [{}],
          format: 'csv'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});