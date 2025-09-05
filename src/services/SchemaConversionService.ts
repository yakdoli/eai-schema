/**
 * 스키마 변환 서비스
 * SchemaConverter를 래핑하여 비즈니스 로직을 제공
 */

import { SchemaConverter, ISchemaConverter } from './SchemaConverter';
import { SchemaGridData, SchemaFormat, ConversionResult, ValidationResult } from '../types/schema';
import { Logger } from '../core/logging/Logger';

/**
 * 스키마 변환 서비스 인터페이스
 */
export interface ISchemaConversionService {
  /**
   * 그리드 데이터를 다양한 형식으로 변환
   */
  convertFromGrid(gridData: SchemaGridData[][], targetFormats: SchemaFormat[]): Promise<ConversionResult>;
  
  /**
   * 스키마를 그리드 데이터로 변환
   */
  convertToGrid(schema: string, sourceFormat: SchemaFormat): Promise<SchemaGridData[][]>;
  
  /**
   * 스키마 검증
   */
  validateSchema(schema: string, format: SchemaFormat): Promise<ValidationResult>;
  
  /**
   * 지원되는 형식 목록 반환
   */
  getSupportedFormats(): SchemaFormat[];
  
  /**
   * 형식 간 직접 변환
   */
  convertBetweenFormats(schema: string, sourceFormat: SchemaFormat, targetFormat: SchemaFormat): Promise<ConversionResult>;
}

/**
 * 스키마 변환 서비스 구현체
 */
export class SchemaConversionService implements ISchemaConversionService {
  private converter: ISchemaConverter;
  private logger: Logger;

  constructor(converter?: ISchemaConverter) {
    this.converter = converter || new SchemaConverter();
    this.logger = Logger.getInstance();
  }

  /**
   * 그리드 데이터를 다양한 형식으로 변환
   */
  async convertFromGrid(gridData: SchemaGridData[][], targetFormats: SchemaFormat[]): Promise<ConversionResult> {
    this.logger.info('그리드 데이터를 다중 형식으로 변환 시작', {
      rowCount: gridData.length,
      targetFormats,
      operation: 'convertFromGrid'
    });

    const combinedResult: ConversionResult = {
      errors: [],
      warnings: []
    };

    try {
      // 각 대상 형식에 대해 변환 수행
      for (const format of targetFormats) {
        const result = await this.converter.fromGrid(gridData, format);
        
        // 결과 병합
        combinedResult.errors.push(...result.errors);
        combinedResult.warnings.push(...result.warnings);
        
        // 형식별 결과 저장
        switch (format) {
          case SchemaFormat.XML:
          case SchemaFormat.XSD:
          case SchemaFormat.WSDL:
            combinedResult.xml = result.xml;
            break;
          case SchemaFormat.JSON:
            combinedResult.json = result.json;
            break;
          case SchemaFormat.YAML:
            combinedResult.yaml = result.yaml;
            break;
        }
      }

      this.logger.info('그리드 데이터 다중 형식 변환 완료', {
        targetFormats,
        hasErrors: combinedResult.errors.length > 0,
        hasWarnings: combinedResult.warnings.length > 0,
        operation: 'convertFromGrid'
      });

    } catch (error) {
      this.logger.error('그리드 데이터 다중 형식 변환 중 오류 발생', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        targetFormats,
        operation: 'convertFromGrid'
      });
      
      combinedResult.errors.push({
        message: error instanceof Error ? error.message : '알 수 없는 변환 오류',
        code: 'MULTI_FORMAT_CONVERSION_ERROR',
        sourceFormat: SchemaFormat.JSON,
        targetFormat: targetFormats[0] // 첫 번째 형식을 대표로 사용
      });
    }

    return combinedResult;
  }

  /**
   * 스키마를 그리드 데이터로 변환
   */
  async convertToGrid(schema: string, sourceFormat: SchemaFormat): Promise<SchemaGridData[][]> {
    this.logger.info('스키마를 그리드 데이터로 변환 시작', {
      sourceFormat,
      schemaLength: schema.length,
      operation: 'convertToGrid'
    });

    try {
      // 먼저 스키마 검증
      const validationResult = await this.converter.validate(schema, sourceFormat);
      if (!validationResult.isValid) {
        this.logger.warn('스키마 검증 실패, 변환 계속 진행', {
          sourceFormat,
          errorCount: validationResult.errors.length,
          operation: 'convertToGrid'
        });
      }

      // 그리드 데이터로 변환
      const gridData = await this.converter.toGrid(schema, sourceFormat);

      this.logger.info('스키마를 그리드 데이터로 변환 완료', {
        sourceFormat,
        rowCount: gridData.length,
        operation: 'convertToGrid'
      });

      return gridData;

    } catch (error) {
      this.logger.error('스키마를 그리드 데이터로 변환 중 오류 발생', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        sourceFormat,
        operation: 'convertToGrid'
      });
      
      throw new Error(`스키마 변환 실패 (${sourceFormat}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 스키마 검증
   */
  async validateSchema(schema: string, format: SchemaFormat): Promise<ValidationResult> {
    this.logger.info('스키마 검증 시작', {
      format,
      schemaLength: schema.length,
      operation: 'validateSchema'
    });

    try {
      const result = await this.converter.validate(schema, format);

      this.logger.info('스키마 검증 완료', {
        format,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        operation: 'validateSchema'
      });

      return result;

    } catch (error) {
      this.logger.error('스키마 검증 중 오류 발생', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        format,
        operation: 'validateSchema'
      });
      
      return {
        isValid: false,
        errors: [{
          field: 'schema',
          message: error instanceof Error ? error.message : '알 수 없는 검증 오류',
          code: 'VALIDATION_SERVICE_ERROR'
        }],
        warnings: []
      };
    }
  }

  /**
   * 지원되는 형식 목록 반환
   */
  getSupportedFormats(): SchemaFormat[] {
    return Object.values(SchemaFormat);
  }

  /**
   * 형식 간 직접 변환
   */
  async convertBetweenFormats(
    schema: string, 
    sourceFormat: SchemaFormat, 
    targetFormat: SchemaFormat
  ): Promise<ConversionResult> {
    this.logger.info('형식 간 직접 변환 시작', {
      sourceFormat,
      targetFormat,
      schemaLength: schema.length,
      operation: 'convertBetweenFormats'
    });

    try {
      // 1단계: 소스 스키마를 그리드 데이터로 변환
      const gridData = await this.convertToGrid(schema, sourceFormat);

      // 2단계: 그리드 데이터를 대상 형식으로 변환
      const result = await this.converter.fromGrid(gridData, targetFormat);

      this.logger.info('형식 간 직접 변환 완료', {
        sourceFormat,
        targetFormat,
        hasErrors: result.errors.length > 0,
        hasWarnings: result.warnings.length > 0,
        operation: 'convertBetweenFormats'
      });

      return result;

    } catch (error) {
      this.logger.error('형식 간 직접 변환 중 오류 발생', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        sourceFormat,
        targetFormat,
        operation: 'convertBetweenFormats'
      });
      
      return {
        errors: [{
          message: error instanceof Error ? error.message : '알 수 없는 변환 오류',
          code: 'FORMAT_CONVERSION_ERROR',
          sourceFormat,
          targetFormat
        }],
        warnings: []
      };
    }
  }

  /**
   * 스키마 형식 자동 감지
   */
  async detectSchemaFormat(schema: string): Promise<SchemaFormat | null> {
    this.logger.info('스키마 형식 자동 감지 시작', {
      schemaLength: schema.length,
      operation: 'detectSchemaFormat'
    });

    const formats = [SchemaFormat.JSON, SchemaFormat.XML, SchemaFormat.YAML, SchemaFormat.XSD, SchemaFormat.WSDL];
    
    for (const format of formats) {
      try {
        const validationResult = await this.converter.validate(schema, format);
        if (validationResult.isValid) {
          this.logger.info('스키마 형식 감지 완료', {
            detectedFormat: format,
            operation: 'detectSchemaFormat'
          });
          return format;
        }
      } catch (error) {
        // 검증 실패는 정상적인 과정이므로 로그하지 않음
        continue;
      }
    }

    this.logger.warn('스키마 형식을 감지할 수 없음', {
      operation: 'detectSchemaFormat'
    });
    
    return null;
  }

  /**
   * 스키마 변환 (통합 테스트용)
   */
  async convertSchema(content: string, sourceFormat: string, targetFormat: string): Promise<ConversionResult> {
    const source = sourceFormat.toLowerCase() as SchemaFormat;
    const target = targetFormat.toLowerCase() as SchemaFormat;
    
    return this.convertBetweenFormats(content, source, target);
  }

  /**
   * URL에서 스키마 가져오기
   */
  async fetchSchemaFromUrl(url: string, format: string): Promise<string> {
    this.logger.info('URL에서 스키마 가져오기 시작', {
      url,
      format,
      operation: 'fetchSchemaFromUrl'
    });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const schema = await response.text();
      
      this.logger.info('URL에서 스키마 가져오기 완료', {
        url,
        format,
        schemaLength: schema.length,
        operation: 'fetchSchemaFromUrl'
      });

      return schema;
    } catch (error) {
      this.logger.error('URL에서 스키마 가져오기 실패', {
        url,
        format,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        operation: 'fetchSchemaFromUrl'
      });
      
      throw new Error(`URL에서 스키마를 가져올 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 스키마 통계 정보 생성
   */
  async generateSchemaStats(gridData: SchemaGridData[][]): Promise<{
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
    dataTypes: Record<string, number>;
    hasConstraints: number;
    hasDefaultValues: number;
  }> {
    const flatData = gridData.flat();
    
    const stats = {
      totalFields: flatData.length,
      requiredFields: flatData.filter(field => field.required).length,
      optionalFields: flatData.filter(field => !field.required).length,
      dataTypes: {} as Record<string, number>,
      hasConstraints: flatData.filter(field => field.constraints).length,
      hasDefaultValues: flatData.filter(field => field.defaultValue !== undefined && field.defaultValue !== null).length
    };

    // 데이터 타입별 통계
    flatData.forEach(field => {
      stats.dataTypes[field.dataType] = (stats.dataTypes[field.dataType] || 0) + 1;
    });

    this.logger.info('스키마 통계 정보 생성 완료', {
      stats,
      operation: 'generateSchemaStats'
    });

    return stats;
  }
}