/**
 * SchemaConversionService 단위 테스트
 */

import { SchemaConversionService } from '../../services/SchemaConversionService';
import { ISchemaConverter } from '../../services/SchemaConverter';
import { SchemaFormat, SchemaGridData, ConversionResult, ValidationResult } from '../../types/schema';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

describe('SchemaConversionService', () => {
  let service: SchemaConversionService;
  let mockConverter: jest.Mocked<ISchemaConverter>;

  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // SchemaConverter 모킹
    mockConverter = {
      fromGrid: jest.fn(),
      toGrid: jest.fn(),
      validate: jest.fn()
    };

    service = new SchemaConversionService(mockConverter);
  });

  describe('convertFromGrid', () => {
    const sampleGridData: SchemaGridData[][] = [
      [{
        fieldName: 'id',
        dataType: 'integer',
        required: true,
        description: '고유 식별자'
      }],
      [{
        fieldName: 'name',
        dataType: 'string',
        required: true,
        description: '사용자 이름'
      }]
    ];

    it('단일 형식으로 변환해야 함', async () => {
      const mockResult: ConversionResult = {
        json: '{"type": "object"}',
        errors: [],
        warnings: []
      };

      mockConverter.fromGrid.mockResolvedValue(mockResult);

      const result = await service.convertFromGrid(sampleGridData, [SchemaFormat.JSON]);

      expect(mockConverter.fromGrid).toHaveBeenCalledWith(sampleGridData, SchemaFormat.JSON);
      expect(result.json).toBe('{"type": "object"}');
      expect(result.errors).toHaveLength(0);
    });

    it('다중 형식으로 변환해야 함', async () => {
      const jsonResult: ConversionResult = {
        json: '{"type": "object"}',
        errors: [],
        warnings: []
      };

      const xmlResult: ConversionResult = {
        xml: '<schema></schema>',
        errors: [],
        warnings: []
      };

      mockConverter.fromGrid
        .mockResolvedValueOnce(jsonResult)
        .mockResolvedValueOnce(xmlResult);

      const result = await service.convertFromGrid(sampleGridData, [SchemaFormat.JSON, SchemaFormat.XML]);

      expect(mockConverter.fromGrid).toHaveBeenCalledTimes(2);
      expect(result.json).toBe('{"type": "object"}');
      expect(result.xml).toBe('<schema></schema>');
    });

    it('변환 오류를 처리해야 함', async () => {
      mockConverter.fromGrid.mockRejectedValue(new Error('변환 실패'));

      const result = await service.convertFromGrid(sampleGridData, [SchemaFormat.JSON]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MULTI_FORMAT_CONVERSION_ERROR');
    });
  });

  describe('convertToGrid', () => {
    const sampleSchema = '{"type": "object", "properties": {"id": {"type": "integer"}}}';

    it('스키마를 그리드 데이터로 변환해야 함', async () => {
      const mockGridData: SchemaGridData[][] = [
        [{
          fieldName: 'id',
          dataType: 'integer',
          required: true,
          description: '고유 식별자'
        }]
      ];

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockConverter.validate.mockResolvedValue(mockValidationResult);
      mockConverter.toGrid.mockResolvedValue(mockGridData);

      const result = await service.convertToGrid(sampleSchema, SchemaFormat.JSON);

      expect(mockConverter.validate).toHaveBeenCalledWith(sampleSchema, SchemaFormat.JSON);
      expect(mockConverter.toGrid).toHaveBeenCalledWith(sampleSchema, SchemaFormat.JSON);
      expect(result).toEqual(mockGridData);
    });

    it('검증 실패 시에도 변환을 계속해야 함', async () => {
      const mockGridData: SchemaGridData[][] = [
        [{
          fieldName: 'id',
          dataType: 'integer',
          required: true,
          description: '고유 식별자'
        }]
      ];

      const mockValidationResult: ValidationResult = {
        isValid: false,
        errors: [{ field: 'schema', message: '검증 오류', code: 'VALIDATION_ERROR' }],
        warnings: []
      };

      mockConverter.validate.mockResolvedValue(mockValidationResult);
      mockConverter.toGrid.mockResolvedValue(mockGridData);

      const result = await service.convertToGrid(sampleSchema, SchemaFormat.JSON);

      expect(result).toEqual(mockGridData);
    });

    it('변환 오류를 처리해야 함', async () => {
      mockConverter.validate.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockConverter.toGrid.mockRejectedValue(new Error('변환 실패'));

      await expect(service.convertToGrid(sampleSchema, SchemaFormat.JSON))
        .rejects.toThrow('스키마 변환 실패 (json): 변환 실패');
    });
  });

  describe('validateSchema', () => {
    const sampleSchema = '{"type": "object"}';

    it('스키마를 검증해야 함', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockConverter.validate.mockResolvedValue(mockValidationResult);

      const result = await service.validateSchema(sampleSchema, SchemaFormat.JSON);

      expect(mockConverter.validate).toHaveBeenCalledWith(sampleSchema, SchemaFormat.JSON);
      expect(result).toEqual(mockValidationResult);
    });

    it('검증 오류를 처리해야 함', async () => {
      mockConverter.validate.mockRejectedValue(new Error('검증 실패'));

      const result = await service.validateSchema(sampleSchema, SchemaFormat.JSON);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALIDATION_SERVICE_ERROR');
    });
  });

  describe('getSupportedFormats', () => {
    it('지원되는 형식 목록을 반환해야 함', () => {
      const formats = service.getSupportedFormats();

      expect(formats).toContain(SchemaFormat.XML);
      expect(formats).toContain(SchemaFormat.JSON);
      expect(formats).toContain(SchemaFormat.YAML);
      expect(formats).toContain(SchemaFormat.XSD);
      expect(formats).toContain(SchemaFormat.WSDL);
    });
  });

  describe('convertBetweenFormats', () => {
    const sampleSchema = '{"type": "object"}';

    it('형식 간 변환을 수행해야 함', async () => {
      const mockGridData: SchemaGridData[][] = [
        [{
          fieldName: 'id',
          dataType: 'integer',
          required: true,
          description: '고유 식별자'
        }]
      ];

      const mockConversionResult: ConversionResult = {
        xml: '<schema></schema>',
        errors: [],
        warnings: []
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockConverter.validate.mockResolvedValue(mockValidationResult);
      mockConverter.toGrid.mockResolvedValue(mockGridData);
      mockConverter.fromGrid.mockResolvedValue(mockConversionResult);

      const result = await service.convertBetweenFormats(sampleSchema, SchemaFormat.JSON, SchemaFormat.XML);

      expect(mockConverter.toGrid).toHaveBeenCalledWith(sampleSchema, SchemaFormat.JSON);
      expect(mockConverter.fromGrid).toHaveBeenCalledWith(mockGridData, SchemaFormat.XML);
      expect(result).toEqual(mockConversionResult);
    });

    it('변환 오류를 처리해야 함', async () => {
      mockConverter.validate.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      mockConverter.toGrid.mockRejectedValue(new Error('변환 실패'));

      const result = await service.convertBetweenFormats(sampleSchema, SchemaFormat.JSON, SchemaFormat.XML);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FORMAT_CONVERSION_ERROR');
    });
  });

  describe('detectSchemaFormat', () => {
    const sampleSchema = '{"type": "object"}';

    it('유효한 형식을 감지해야 함', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      mockConverter.validate
        .mockResolvedValueOnce(mockValidationResult);

      const result = await service.detectSchemaFormat(sampleSchema);

      expect(result).toBe(SchemaFormat.JSON);
    });

    it('유효한 형식이 없으면 null을 반환해야 함', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: false,
        errors: [{ field: 'schema', message: '검증 오류', code: 'VALIDATION_ERROR' }],
        warnings: []
      };

      mockConverter.validate.mockResolvedValue(mockValidationResult);

      const result = await service.detectSchemaFormat(sampleSchema);

      expect(result).toBeNull();
    });

    it('검증 중 예외가 발생해도 계속 진행해야 함', async () => {
      mockConverter.validate
        .mockRejectedValueOnce(new Error('JSON 검증 실패'))
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] });

      const result = await service.detectSchemaFormat(sampleSchema);

      expect(result).toBe(SchemaFormat.XML);
    });
  });

  describe('generateSchemaStats', () => {
    it('스키마 통계를 생성해야 함', async () => {
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
          required: true,
          description: '사용자 이름'
        }],
        [{
          fieldName: 'email',
          dataType: 'string',
          required: false,
          description: '이메일 주소'
        }]
      ];

      const stats = await service.generateSchemaStats(sampleGridData);

      expect(stats.totalFields).toBe(3);
      expect(stats.requiredFields).toBe(2);
      expect(stats.optionalFields).toBe(1);
      expect(stats.dataTypes.integer).toBe(1);
      expect(stats.dataTypes.string).toBe(2);
      expect(stats.hasConstraints).toBe(1);
      expect(stats.hasDefaultValues).toBe(1);
    });

    it('빈 그리드 데이터에 대해 올바른 통계를 생성해야 함', async () => {
      const emptyGridData: SchemaGridData[][] = [];

      const stats = await service.generateSchemaStats(emptyGridData);

      expect(stats.totalFields).toBe(0);
      expect(stats.requiredFields).toBe(0);
      expect(stats.optionalFields).toBe(0);
      expect(stats.dataTypes).toEqual({});
      expect(stats.hasConstraints).toBe(0);
      expect(stats.hasDefaultValues).toBe(0);
    });
  });
});