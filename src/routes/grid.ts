/**
 * 그리드 관련 API 라우트
 */

import { Router, Request, Response } from 'express';
import { GridManager } from '../services/GridManager';
import { GridValidationService } from '../services/GridValidationService';
import { asyncHandler } from '../core/utils/asyncHandler';
import { Logger } from '../core/logging/Logger';
import { AppError } from '../core/errors/ErrorHandler';
import {
  GridColumn,
  SchemaGridData,
  DataType
} from '../types/grid';

const router = Router();
const gridManager = new GridManager();
const validationService = new GridValidationService();
const logger = new Logger('GridRoutes');

/**
 * 그리드 메타데이터 조회
 * GET /api/v2/grid/metadata
 */
router.get('/metadata', asyncHandler(async (req: Request, res: Response) => {
  logger.info('그리드 메타데이터 요청');

  const defaultColumns: GridColumn[] = [
    {
      id: 'fieldName',
      title: '필드명',
      type: DataType.TEXT,
      width: 150,
      validation: [
        {
          type: 'required',
          message: '필드명은 필수입니다.'
        },
        {
          type: 'pattern',
          value: '^[a-zA-Z][a-zA-Z0-9_]*$',
          message: '필드명은 영문자로 시작하고 영문자, 숫자, 언더스코어만 사용 가능합니다.'
        }
      ]
    },
    {
      id: 'dataType',
      title: '데이터 타입',
      type: DataType.DROPDOWN,
      width: 120,
      source: ['string', 'number', 'boolean', 'date', 'array', 'object'],
      validation: [
        {
          type: 'required',
          message: '데이터 타입은 필수입니다.'
        }
      ]
    },
    {
      id: 'required',
      title: '필수',
      type: DataType.BOOLEAN,
      width: 80,
      defaultValue: false
    },
    {
      id: 'description',
      title: '설명',
      type: DataType.TEXT,
      width: 200,
      validation: [
        {
          type: 'maxLength',
          value: 500,
          message: '설명은 500자를 초과할 수 없습니다.'
        }
      ]
    },
    {
      id: 'defaultValue',
      title: '기본값',
      type: DataType.TEXT,
      width: 120
    },
    {
      id: 'constraints',
      title: '제약조건',
      type: DataType.TEXT,
      width: 150,
      validation: [
        {
          type: 'maxLength',
          value: 200,
          message: '제약조건은 200자를 초과할 수 없습니다.'
        }
      ]
    }
  ];

  const stats = gridManager.getGridStats();

  res.json({
    success: true,
    data: {
      columns: defaultColumns,
      stats,
      supportedFormats: ['json', 'xml', 'yaml'],
      dataTypes: Object.values(DataType),
      validationRules: [
        'required',
        'minLength',
        'maxLength',
        'pattern',
        'range',
        'custom'
      ]
    }
  });
}));

/**
 * 스키마를 그리드 데이터로 변환
 * POST /api/v2/grid/convert/to-grid
 */
router.post('/convert/to-grid', asyncHandler(async (req: Request, res: Response) => {
  const { schema, format } = req.body;

  if (!schema) {
    throw new AppError('스키마 데이터가 필요합니다.', 400);
  }

  if (!format || !['json', 'xml', 'yaml'].includes(format)) {
    throw new AppError('유효한 형식을 지정해야 합니다. (json, xml, yaml)', 400);
  }

  logger.info(`스키마를 그리드 데이터로 변환 시작: ${format}`);

  try {
    let parsedSchema;

    // 형식에 따른 스키마 파싱
    switch (format) {
      case 'json':
        parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
        break;
      case 'xml':
        // XML 파싱 로직 (실제 구현에서는 XML 파서 사용)
        parsedSchema = schema;
        break;
      case 'yaml':
        // YAML 파싱 로직 (실제 구현에서는 YAML 파서 사용)
        parsedSchema = schema;
        break;
    }

    const gridData = gridManager.convertSchemaToGridData(parsedSchema);
    const validationResult = validationService.validateGrid(gridData, []);

    logger.info('스키마 변환 완료', {
      rowCount: gridData.length,
      hasErrors: !validationResult.isValid
    });

    res.json({
      success: true,
      data: {
        gridData,
        validation: validationResult,
        metadata: {
          rowCount: gridData.length,
          columnCount: gridData[0]?.length || 0,
          format,
          convertedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('스키마 변환 중 오류:', error);
    throw new AppError('스키마 변환 중 오류가 발생했습니다.', 422);
  }
}));

/**
 * 그리드 데이터를 스키마로 변환
 * POST /api/v2/grid/convert/to-schema
 */
router.post('/convert/to-schema', asyncHandler(async (req: Request, res: Response) => {
  const { gridData, format } = req.body;

  if (!gridData || !Array.isArray(gridData)) {
    throw new AppError('유효한 그리드 데이터가 필요합니다.', 400);
  }

  if (!format || !['json', 'xml', 'yaml'].includes(format)) {
    throw new AppError('유효한 형식을 지정해야 합니다. (json, xml, yaml)', 400);
  }

  logger.info(`그리드 데이터를 스키마로 변환 시작: ${format}`);

  try {
    const schema = gridManager.convertGridDataToSchema(gridData, format as 'json' | 'xml' | 'yaml');
    
    let serializedSchema: string;
    let contentType: string;

    switch (format) {
      case 'json':
        serializedSchema = JSON.stringify(schema, null, 2);
        contentType = 'application/json';
        break;
      case 'xml':
        serializedSchema = typeof schema === 'string' ? schema : JSON.stringify(schema);
        contentType = 'application/xml';
        break;
      case 'yaml':
        // YAML 직렬화 (실제 구현에서는 YAML 라이브러리 사용)
        serializedSchema = JSON.stringify(schema, null, 2);
        contentType = 'application/x-yaml';
        break;
      default:
        throw new AppError('지원하지 않는 형식입니다.', 400);
    }

    logger.info('스키마 변환 완료', {
      format,
      schemaSize: serializedSchema.length
    });

    res.json({
      success: true,
      data: {
        schema: serializedSchema,
        format,
        contentType,
        metadata: {
          fieldCount: gridData.filter(row => row[0]?.fieldName).length,
          generatedAt: new Date().toISOString(),
          size: serializedSchema.length
        }
      }
    });

  } catch (error) {
    logger.error('스키마 변환 중 오류:', error);
    throw new AppError('스키마 변환 중 오류가 발생했습니다.', 422);
  }
}));

/**
 * 그리드 데이터 검증
 * POST /api/v2/grid/validate
 */
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
  const { gridData, columns } = req.body;

  if (!gridData || !Array.isArray(gridData)) {
    throw new AppError('유효한 그리드 데이터가 필요합니다.', 400);
  }

  logger.info('그리드 데이터 검증 시작', {
    rowCount: gridData.length
  });

  try {
    const validationResult = validationService.validateGrid(gridData, columns || []);
    const stats = validationService.getValidationStats(validationResult);

    logger.info('그리드 검증 완료', {
      isValid: validationResult.isValid,
      errorCount: stats.totalErrors,
      warningCount: stats.totalWarnings
    });

    res.json({
      success: true,
      data: {
        validation: validationResult,
        stats,
        summary: {
          isValid: validationResult.isValid,
          totalIssues: stats.totalErrors + stats.totalWarnings,
          criticalIssues: stats.totalErrors,
          validatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('그리드 검증 중 오류:', error);
    throw new AppError('그리드 검증 중 오류가 발생했습니다.', 500);
  }
}));

/**
 * 그리드 데이터 내보내기
 * POST /api/v2/grid/export
 */
router.post('/export', asyncHandler(async (req: Request, res: Response) => {
  const { gridData, format, filename } = req.body;

  if (!gridData || !Array.isArray(gridData)) {
    throw new AppError('유효한 그리드 데이터가 필요합니다.', 400);
  }

  if (!format || !['csv', 'json', 'xml'].includes(format)) {
    throw new AppError('유효한 형식을 지정해야 합니다. (csv, json, xml)', 400);
  }

  logger.info(`그리드 데이터 내보내기: ${format}`);

  try {
    // 임시 그리드 생성하여 내보내기 기능 사용
    const tempContainer = { innerHTML: '' } as HTMLElement;
    const _tempGrid = gridManager.createGrid('temp-export', tempContainer, {
      data: gridData,
      columns: [],
      onCellChange: () => {},
      onStructureChange: () => {}
    });

    const exportedData = gridManager.exportGridData('temp-export', format as 'csv' | 'json' | 'xml');
    
    // 임시 그리드 정리
    gridManager.destroyGrid('temp-export');

    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'json':
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      case 'xml':
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;
    }

    const finalFilename = filename || `schema_export_${Date.now()}.${fileExtension}`;

    logger.info('데이터 내보내기 완료', {
      format,
      filename: finalFilename,
      size: exportedData.length
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.send(exportedData);

  } catch (error) {
    logger.error('데이터 내보내기 중 오류:', error);
    throw new AppError('데이터 내보내기 중 오류가 발생했습니다.', 500);
  }
}));

/**
 * 샘플 데이터 생성
 * GET /api/v2/grid/sample
 */
router.get('/sample', asyncHandler(async (req: Request, res: Response) => {
  const { type = 'basic', count = 5 } = req.query;

  logger.info(`샘플 데이터 생성: ${type}, 개수: ${count}`);

  const sampleData: SchemaGridData[][] = [];

  switch (type) {
    case 'basic':
      sampleData.push(
        [{
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: 'minimum: 1'
        }],
        [{
          fieldName: 'name',
          dataType: 'string',
          required: true,
          description: '이름',
          defaultValue: '',
          constraints: 'minLength: 2, maxLength: 50'
        }],
        [{
          fieldName: 'email',
          dataType: 'string',
          required: false,
          description: '이메일 주소',
          defaultValue: '',
          constraints: 'pattern: ^[^@]+@[^@]+\\.[^@]+$'
        }],
        [{
          fieldName: 'isActive',
          dataType: 'boolean',
          required: false,
          description: '활성 상태',
          defaultValue: 'true',
          constraints: ''
        }],
        [{
          fieldName: 'createdAt',
          dataType: 'date',
          required: false,
          description: '생성일시',
          defaultValue: '',
          constraints: ''
        }]
      );
      break;

    case 'ecommerce':
      sampleData.push(
        [{
          fieldName: 'productId',
          dataType: 'string',
          required: true,
          description: '상품 ID',
          defaultValue: '',
          constraints: 'pattern: ^PRD[0-9]{6}$'
        }],
        [{
          fieldName: 'productName',
          dataType: 'string',
          required: true,
          description: '상품명',
          defaultValue: '',
          constraints: 'minLength: 1, maxLength: 100'
        }],
        [{
          fieldName: 'price',
          dataType: 'number',
          required: true,
          description: '가격',
          defaultValue: '0',
          constraints: 'minimum: 0'
        }],
        [{
          fieldName: 'category',
          dataType: 'string',
          required: true,
          description: '카테고리',
          defaultValue: '',
          constraints: 'enum: [electronics, clothing, books, home]'
        }],
        [{
          fieldName: 'inStock',
          dataType: 'boolean',
          required: false,
          description: '재고 여부',
          defaultValue: 'true',
          constraints: ''
        }]
      );
      break;

    case 'user':
      sampleData.push(
        [{
          fieldName: 'userId',
          dataType: 'string',
          required: true,
          description: '사용자 ID',
          defaultValue: '',
          constraints: 'pattern: ^[a-zA-Z0-9_]{3,20}$'
        }],
        [{
          fieldName: 'firstName',
          dataType: 'string',
          required: true,
          description: '이름',
          defaultValue: '',
          constraints: 'minLength: 1, maxLength: 30'
        }],
        [{
          fieldName: 'lastName',
          dataType: 'string',
          required: true,
          description: '성',
          defaultValue: '',
          constraints: 'minLength: 1, maxLength: 30'
        }],
        [{
          fieldName: 'age',
          dataType: 'number',
          required: false,
          description: '나이',
          defaultValue: '',
          constraints: 'minimum: 0, maximum: 150'
        }],
        [{
          fieldName: 'phoneNumber',
          dataType: 'string',
          required: false,
          description: '전화번호',
          defaultValue: '',
          constraints: 'pattern: ^[0-9-+()\\s]+$'
        }]
      );
      break;

    default:
      throw new AppError('지원하지 않는 샘플 타입입니다.', 400);
  }

  // 빈 행 추가 (최소 10행 보장)
  while (sampleData.length < Math.max(10, Number(count))) {
    sampleData.push([{
      fieldName: '',
      dataType: '',
      required: false,
      description: '',
      defaultValue: '',
      constraints: ''
    }]);
  }

  res.json({
    success: true,
    data: {
      gridData: sampleData,
      type,
      metadata: {
        rowCount: sampleData.length,
        fieldCount: sampleData.filter(row => row[0]?.fieldName).length,
        generatedAt: new Date().toISOString()
      }
    }
  });
}));

/**
 * 그리드 통계 조회
 * GET /api/v2/grid/stats
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  logger.info('그리드 통계 요청');

  const stats = gridManager.getGridStats();

  res.json({
    success: true,
    data: {
      stats,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;