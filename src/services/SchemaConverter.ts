/**
 * 스키마 변환 엔진
 * 그리드 데이터와 다양한 스키마 형식 간의 변환을 담당
 */

import { SchemaGridData, SchemaFormat, ConversionResult, ValidationResult } from '../types/schema';
import { Logger } from '../core/logging/Logger';
import * as xml2js from 'xml2js';
import * as yaml from 'js-yaml';

/**
 * 스키마 변환기 인터페이스
 */
export interface ISchemaConverter {
  /**
   * 그리드 데이터를 지정된 형식으로 변환
   */
  fromGrid(gridData: SchemaGridData[][], targetFormat: SchemaFormat): Promise<ConversionResult>;
  
  /**
   * 스키마 문자열을 그리드 데이터로 변환
   */
  toGrid(schema: string, sourceFormat: SchemaFormat): Promise<SchemaGridData[][]>;
  
  /**
   * 스키마 검증
   */
  validate(schema: string, format: SchemaFormat): Promise<ValidationResult>;
}

/**
 * 스키마 변환 엔진 구현체
 */
export class SchemaConverter implements ISchemaConverter {
  private logger: Logger;
  private xmlBuilder: xml2js.Builder;
  private xmlParser: xml2js.Parser;

  constructor() {
    this.logger = Logger.getInstance();
    
    // XML 빌더 설정
    this.xmlBuilder = new xml2js.Builder({
      rootName: 'schema',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });

    // XML 파서 설정 (XXE 공격 방지)
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: true,
      trim: true,
      // XXE 공격 방지를 위한 설정
      async: false,
      strict: true
    });
  }

  /**
   * 그리드 데이터를 지정된 형식으로 변환
   */
  async fromGrid(gridData: SchemaGridData[][], targetFormat: SchemaFormat): Promise<ConversionResult> {
    const result: ConversionResult = {
      errors: [],
      warnings: []
    };

    try {
      this.logger.info(`그리드 데이터를 ${targetFormat} 형식으로 변환 시작`, { 
        rowCount: gridData.length,
        targetFormat 
      });

      // 그리드 데이터 검증
      const validationResult = await this.validateGridData(gridData);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors.map(err => ({
          message: err.message,
          code: err.code,
          sourceFormat: SchemaFormat.JSON, // 그리드는 JSON 형태로 간주
          targetFormat,
          line: err.line,
          column: err.column
        })));
      }
      
      // 경고도 추가
      result.warnings.push(...validationResult.warnings.map(warn => ({
        message: warn.message,
        code: warn.code,
        details: warn.value
      })));

      // 형식별 변환 수행
      switch (targetFormat) {
        case SchemaFormat.XML:
          result.xml = await this.convertToXML(gridData);
          break;
        case SchemaFormat.JSON:
          result.json = await this.convertToJSON(gridData);
          break;
        case SchemaFormat.YAML:
          result.yaml = await this.convertToYAML(gridData);
          break;
        case SchemaFormat.XSD:
          result.xml = await this.convertToXSD(gridData);
          break;
        case SchemaFormat.WSDL:
          result.xml = await this.convertToWSDL(gridData);
          break;
        default:
          throw new Error(`지원하지 않는 대상 형식: ${targetFormat}`);
      }

      this.logger.info(`그리드 데이터 변환 완료`, { 
        targetFormat,
        hasErrors: result.errors.length > 0,
        hasWarnings: result.warnings.length > 0
      });

    } catch (error) {
      this.logger.error('그리드 데이터 변환 중 오류 발생', error);
      result.errors.push({
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        code: 'CONVERSION_ERROR',
        sourceFormat: SchemaFormat.JSON,
        targetFormat
      });
    }

    return result;
  }

  /**
   * 스키마 문자열을 그리드 데이터로 변환
   */
  async toGrid(schema: string, sourceFormat: SchemaFormat): Promise<SchemaGridData[][]> {
    try {
      this.logger.info(`${sourceFormat} 스키마를 그리드 데이터로 변환 시작`);

      let parsedData: any;

      // 형식별 파싱
      switch (sourceFormat) {
        case SchemaFormat.XML:
        case SchemaFormat.XSD:
        case SchemaFormat.WSDL:
          parsedData = await this.parseXML(schema);
          break;
        case SchemaFormat.JSON:
          parsedData = JSON.parse(schema);
          break;
        case SchemaFormat.YAML:
          parsedData = yaml.load(schema);
          break;
        default:
          throw new Error(`지원하지 않는 소스 형식: ${sourceFormat}`);
      }

      // 파싱된 데이터를 그리드 형태로 변환
      const gridData = await this.convertParsedDataToGrid(parsedData, sourceFormat);

      this.logger.info(`스키마를 그리드 데이터로 변환 완료`, { 
        sourceFormat,
        rowCount: gridData.length 
      });

      return gridData;

    } catch (error) {
      this.logger.error('스키마를 그리드 데이터로 변환 중 오류 발생', error);
      throw new Error(`스키마 변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 스키마 검증
   */
  async validate(schema: string, format: SchemaFormat): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      this.logger.info(`${format} 스키마 검증 시작`);

      // 기본 구문 검증
      await this.validateSyntax(schema, format);

      // 형식별 상세 검증
      switch (format) {
        case SchemaFormat.XML:
        case SchemaFormat.XSD:
        case SchemaFormat.WSDL:
          await this.validateXMLSchema(schema, result);
          break;
        case SchemaFormat.JSON:
          await this.validateJSONSchema(schema, result);
          break;
        case SchemaFormat.YAML:
          await this.validateYAMLSchema(schema, result);
          break;
      }

      result.isValid = result.errors.length === 0;

      this.logger.info(`스키마 검증 완료`, { 
        format,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      this.logger.error('스키마 검증 중 오류 발생', error);
      result.isValid = false;
      result.errors.push({
        field: 'schema',
        message: error instanceof Error ? error.message : '알 수 없는 검증 오류',
        code: 'VALIDATION_ERROR'
      });
    }

    return result;
  }

  /**
   * 그리드 데이터를 XML로 변환
   */
  private async convertToXML(gridData: SchemaGridData[][]): Promise<string> {
    const schemaObject = {
      fields: {
        field: gridData.flat().map(row => ({
          $: {
            name: row.fieldName,
            type: row.dataType,
            required: row.required.toString()
          },
          description: row.description,
          defaultValue: row.defaultValue,
          constraints: row.constraints
        }))
      }
    };

    return this.xmlBuilder.buildObject(schemaObject);
  }

  /**
   * 그리드 데이터를 JSON으로 변환
   */
  private async convertToJSON(gridData: SchemaGridData[][]): Promise<string> {
    const schemaObject = {
      type: 'object',
      properties: {},
      required: []
    };

    gridData.flat().forEach(row => {
      schemaObject.properties[row.fieldName] = {
        type: this.mapDataTypeToJSONType(row.dataType),
        description: row.description,
        default: row.defaultValue
      };

      if (row.required) {
        schemaObject.required.push(row.fieldName);
      }

      // 제약 조건 추가
      if (row.constraints) {
        try {
          const constraints = JSON.parse(row.constraints);
          Object.assign(schemaObject.properties[row.fieldName], constraints);
        } catch {
          // 제약 조건 파싱 실패 시 문자열로 저장
          schemaObject.properties[row.fieldName].constraints = row.constraints;
        }
      }
    });

    return JSON.stringify(schemaObject, null, 2);
  }

  /**
   * 그리드 데이터를 YAML로 변환
   */
  private async convertToYAML(gridData: SchemaGridData[][]): Promise<string> {
    const jsonSchema = await this.convertToJSON(gridData);
    const schemaObject = JSON.parse(jsonSchema);
    return yaml.dump(schemaObject, { indent: 2, lineWidth: 120 });
  }

  /**
   * 그리드 데이터를 XSD로 변환
   */
  private async convertToXSD(gridData: SchemaGridData[][]): Promise<string> {
    const elements = gridData.flat().map(row => {
      const element = {
        $: {
          name: row.fieldName,
          type: this.mapDataTypeToXSDType(row.dataType)
        }
      };

      if (!row.required) {
        element.$.minOccurs = '0';
      }

      return element;
    });

    const xsdObject = {
      'xs:schema': {
        $: {
          'xmlns:xs': 'http://www.w3.org/2001/XMLSchema',
          'targetNamespace': 'http://example.com/schema',
          'xmlns': 'http://example.com/schema',
          'elementFormDefault': 'qualified'
        },
        'xs:element': {
          $: { name: 'root' },
          'xs:complexType': {
            'xs:sequence': {
              'xs:element': elements
            }
          }
        }
      }
    };

    return this.xmlBuilder.buildObject(xsdObject);
  }

  /**
   * 그리드 데이터를 WSDL로 변환
   */
  private async convertToWSDL(gridData: SchemaGridData[][]): Promise<string> {
    // WSDL은 복잡한 구조이므로 기본 템플릿 제공
    const wsdlObject = {
      'wsdl:definitions': {
        $: {
          'xmlns:wsdl': 'http://schemas.xmlsoap.org/wsdl/',
          'xmlns:soap': 'http://schemas.xmlsoap.org/wsdl/soap/',
          'xmlns:tns': 'http://example.com/service',
          'targetNamespace': 'http://example.com/service'
        },
        'wsdl:types': {
          'xs:schema': {
            $: {
              'xmlns:xs': 'http://www.w3.org/2001/XMLSchema',
              'targetNamespace': 'http://example.com/service'
            },
            'xs:element': gridData.flat().map(row => ({
              $: {
                name: row.fieldName,
                type: this.mapDataTypeToXSDType(row.dataType)
              }
            }))
          }
        }
      }
    };

    return this.xmlBuilder.buildObject(wsdlObject);
  } 
 /**
   * XML 파싱 (XXE 공격 방지 포함)
   */
  private async parseXML(xmlString: string): Promise<any> {
    // XXE 공격 방지를 위한 사전 검사
    if (this.containsXXEPatterns(xmlString)) {
      throw new Error('잠재적인 XXE 공격 패턴이 감지되었습니다');
    }

    return new Promise((resolve, reject) => {
      this.xmlParser.parseString(xmlString, (err, result) => {
        if (err) {
          reject(new Error(`XML 파싱 오류: ${err.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * XXE 공격 패턴 검사
   */
  private containsXXEPatterns(xmlString: string): boolean {
    const xxePatterns = [
      /<!ENTITY/i,
      /<!DOCTYPE.*\[/i,
      /SYSTEM\s+["'][^"']*["']/i,
      /PUBLIC\s+["'][^"']*["']/i
    ];

    return xxePatterns.some(pattern => pattern.test(xmlString));
  }

  /**
   * 파싱된 데이터를 그리드 형태로 변환
   */
  private async convertParsedDataToGrid(parsedData: any, sourceFormat: SchemaFormat): Promise<SchemaGridData[][]> {
    const gridData: SchemaGridData[] = [];

    switch (sourceFormat) {
      case SchemaFormat.XML:
      case SchemaFormat.XSD:
      case SchemaFormat.WSDL:
        this.extractFieldsFromXML(parsedData, gridData);
        break;
      case SchemaFormat.JSON:
        this.extractFieldsFromJSON(parsedData, gridData);
        break;
      case SchemaFormat.YAML:
        this.extractFieldsFromYAML(parsedData, gridData);
        break;
    }

    // 2차원 배열로 변환 (각 행은 하나의 필드)
    return gridData.map(field => [field]);
  }

  /**
   * XML에서 필드 추출
   */
  private extractFieldsFromXML(xmlData: any, gridData: SchemaGridData[]): void {
    if (xmlData.schema && xmlData.schema.fields && xmlData.schema.fields.field) {
      const fields = Array.isArray(xmlData.schema.fields.field) 
        ? xmlData.schema.fields.field 
        : [xmlData.schema.fields.field];

      fields.forEach((field: any) => {
        gridData.push({
          fieldName: field.name || field.$.name || '',
          dataType: field.type || field.$.type || 'string',
          required: this.parseBoolean(field.required || field.$.required),
          description: field.description || '',
          defaultValue: field.defaultValue,
          constraints: field.constraints
        });
      });
    }
  }

  /**
   * JSON에서 필드 추출
   */
  private extractFieldsFromJSON(jsonData: any, gridData: SchemaGridData[]): void {
    if (jsonData.properties) {
      Object.keys(jsonData.properties).forEach(fieldName => {
        const property = jsonData.properties[fieldName];
        gridData.push({
          fieldName,
          dataType: this.mapJSONTypeToDataType(property.type || 'string'),
          required: jsonData.required ? jsonData.required.includes(fieldName) : false,
          description: property.description || '',
          defaultValue: property.default,
          constraints: property.constraints ? JSON.stringify(property.constraints) : undefined
        });
      });
    }
  }

  /**
   * YAML에서 필드 추출 (JSON과 동일한 구조)
   */
  private extractFieldsFromYAML(yamlData: any, gridData: SchemaGridData[]): void {
    this.extractFieldsFromJSON(yamlData, gridData);
  }

  /**
   * 그리드 데이터 검증
   */
  private async validateGridData(gridData: SchemaGridData[][]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    gridData.forEach((row, rowIndex) => {
      row.forEach((field, colIndex) => {
        // 필수 필드 검증
        if (!field.fieldName || field.fieldName.trim() === '') {
          result.errors.push({
            field: 'fieldName',
            message: '필드명은 필수입니다',
            code: 'REQUIRED_FIELD',
            line: rowIndex + 1,
            column: colIndex + 1
          });
        }

        // 데이터 타입 검증
        if (!field.dataType || field.dataType.trim() === '') {
          result.errors.push({
            field: 'dataType',
            message: '데이터 타입은 필수입니다',
            code: 'REQUIRED_DATA_TYPE',
            line: rowIndex + 1,
            column: colIndex + 1
          });
        }

        // 필드명 중복 검증
        const duplicateFields = gridData.flat().filter(f => f.fieldName === field.fieldName);
        if (duplicateFields.length > 1) {
          result.warnings.push({
            field: 'fieldName',
            message: `중복된 필드명: ${field.fieldName}`,
            code: 'DUPLICATE_FIELD_NAME'
          });
        }

        // 제약 조건 JSON 형식 검증
        if (field.constraints) {
          try {
            JSON.parse(field.constraints);
          } catch {
            result.warnings.push({
              field: 'constraints',
              message: `제약 조건이 유효한 JSON 형식이 아닙니다: ${field.constraints}`,
              code: 'INVALID_CONSTRAINTS_FORMAT'
            });
          }
        }
      });
    });

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 구문 검증
   */
  private async validateSyntax(schema: string, format: SchemaFormat): Promise<void> {
    switch (format) {
      case SchemaFormat.XML:
      case SchemaFormat.XSD:
      case SchemaFormat.WSDL:
        await this.parseXML(schema); // 파싱 성공하면 구문이 올바름
        break;
      case SchemaFormat.JSON:
        JSON.parse(schema);
        break;
      case SchemaFormat.YAML:
        yaml.load(schema);
        break;
    }
  }

  /**
   * XML 스키마 검증
   */
  private async validateXMLSchema(schema: string, result: ValidationResult): Promise<void> {
    try {
      const parsedXML = await this.parseXML(schema);
      
      // 기본 XML 구조 검증
      if (!parsedXML) {
        result.errors.push({
          field: 'schema',
          message: 'XML 스키마가 비어있습니다',
          code: 'EMPTY_SCHEMA'
        });
      }

      // 루트 요소 검증
      const rootKeys = Object.keys(parsedXML);
      if (rootKeys.length === 0) {
        result.errors.push({
          field: 'schema',
          message: 'XML 스키마에 루트 요소가 없습니다',
          code: 'NO_ROOT_ELEMENT'
        });
      }

    } catch (error) {
      result.errors.push({
        field: 'schema',
        message: `XML 스키마 검증 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        code: 'XML_VALIDATION_ERROR'
      });
    }
  }

  /**
   * JSON 스키마 검증
   */
  private async validateJSONSchema(schema: string, result: ValidationResult): Promise<void> {
    try {
      const parsedJSON = JSON.parse(schema);
      
      // JSON Schema 기본 구조 검증
      if (typeof parsedJSON !== 'object' || parsedJSON === null) {
        result.errors.push({
          field: 'schema',
          message: 'JSON 스키마는 객체여야 합니다',
          code: 'INVALID_JSON_SCHEMA_TYPE'
        });
      }

      // properties 필드 검증
      if (parsedJSON.properties && typeof parsedJSON.properties !== 'object') {
        result.errors.push({
          field: 'properties',
          message: 'properties 필드는 객체여야 합니다',
          code: 'INVALID_PROPERTIES_TYPE'
        });
      }

      // required 필드 검증
      if (parsedJSON.required && !Array.isArray(parsedJSON.required)) {
        result.errors.push({
          field: 'required',
          message: 'required 필드는 배열이어야 합니다',
          code: 'INVALID_REQUIRED_TYPE'
        });
      }

    } catch (error) {
      result.errors.push({
        field: 'schema',
        message: `JSON 스키마 검증 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        code: 'JSON_VALIDATION_ERROR'
      });
    }
  }

  /**
   * YAML 스키마 검증
   */
  private async validateYAMLSchema(schema: string, result: ValidationResult): Promise<void> {
    try {
      const parsedYAML = yaml.load(schema);
      
      // YAML 기본 구조 검증
      if (typeof parsedYAML !== 'object' || parsedYAML === null) {
        result.errors.push({
          field: 'schema',
          message: 'YAML 스키마는 객체여야 합니다',
          code: 'INVALID_YAML_SCHEMA_TYPE'
        });
      }

    } catch (error) {
      result.errors.push({
        field: 'schema',
        message: `YAML 스키마 검증 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        code: 'YAML_VALIDATION_ERROR'
      });
    }
  }

  /**
   * 데이터 타입을 JSON 타입으로 매핑
   */
  private mapDataTypeToJSONType(dataType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'text': 'string',
      'number': 'number',
      'integer': 'integer',
      'boolean': 'boolean',
      'date': 'string',
      'datetime': 'string',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[dataType.toLowerCase()] || 'string';
  }

  /**
   * JSON 타입을 데이터 타입으로 매핑
   */
  private mapJSONTypeToDataType(jsonType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'integer': 'integer',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[jsonType.toLowerCase()] || 'string';
  }

  /**
   * 데이터 타입을 XSD 타입으로 매핑
   */
  private mapDataTypeToXSDType(dataType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'xs:string',
      'text': 'xs:string',
      'number': 'xs:decimal',
      'integer': 'xs:int',
      'boolean': 'xs:boolean',
      'date': 'xs:date',
      'datetime': 'xs:dateTime',
      'time': 'xs:time'
    };

    return typeMap[dataType.toLowerCase()] || 'xs:string';
  }

  /**
   * 문자열을 불린으로 파싱
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }
}