/**
 * SchemaConverter 단위 테스트
 */

import { SchemaConverter } from '../../services/SchemaConverter';
import { SchemaFormat, SchemaGridData } from '../../types/schema';
import { Logger } from '../../core/logging/Logger';

// Logger 모킹
jest.mock('../../core/logging/Logger');

describe('SchemaConverter', () => {
  let converter: SchemaConverter;

  beforeEach(() => {
    // Logger 모킹 설정
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    
    converter = new SchemaConverter();
  });

  describe('fromGrid', () => {
    const sampleGridData: SchemaGridData[][] = [
      [{
        fieldName: 'id',
        dataType: 'integer',
        required: true,
        description: '고유 식별자',
        defaultValue: null,
        constraints: '{"minimum": 1}'
      }],
      [{
        fieldName: 'name',
        dataType: 'string',
        required: true,
        description: '사용자 이름',
        defaultValue: '',
        constraints: '{"maxLength": 100}'
      }],
      [{
        fieldName: 'email',
        dataType: 'string',
        required: false,
        description: '이메일 주소',
        defaultValue: null,
        constraints: '{"format": "email"}'
      }]
    ];

    it('그리드 데이터를 XML로 변환해야 함', async () => {
      const result = await converter.fromGrid(sampleGridData, SchemaFormat.XML);
      
      expect(result.errors).toHaveLength(0);
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('<schema>');
      expect(result.xml).toContain('<field name="id"');
      expect(result.xml).toContain('<field name="name"');
      expect(result.xml).toContain('<field name="email"');
    });

    it('그리드 데이터를 JSON으로 변환해야 함', async () => {
      const result = await converter.fromGrid(sampleGridData, SchemaFormat.JSON);
      
      expect(result.errors).toHaveLength(0);
      expect(result.json).toBeDefined();
      
      const parsedJson = JSON.parse(result.json!);
      expect(parsedJson.type).toBe('object');
      expect(parsedJson.properties).toBeDefined();
      expect(parsedJson.properties.id).toBeDefined();
      expect(parsedJson.properties.name).toBeDefined();
      expect(parsedJson.properties.email).toBeDefined();
      expect(parsedJson.required).toContain('id');
      expect(parsedJson.required).toContain('name');
      expect(parsedJson.required).not.toContain('email');
    });

    it('그리드 데이터를 YAML로 변환해야 함', async () => {
      const result = await converter.fromGrid(sampleGridData, SchemaFormat.YAML);
      
      expect(result.errors).toHaveLength(0);
      expect(result.yaml).toBeDefined();
      expect(result.yaml).toContain('type: object');
      expect(result.yaml).toContain('properties:');
      expect(result.yaml).toContain('id:');
      expect(result.yaml).toContain('name:');
      expect(result.yaml).toContain('email:');
    });

    it('그리드 데이터를 XSD로 변환해야 함', async () => {
      const result = await converter.fromGrid(sampleGridData, SchemaFormat.XSD);
      
      expect(result.errors).toHaveLength(0);
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('xmlns:xs="http://www.w3.org/2001/XMLSchema"');
      expect(result.xml).toContain('xs:element');
    });

    it('잘못된 그리드 데이터에 대해 오류를 반환해야 함', async () => {
      const invalidGridData: SchemaGridData[][] = [
        [{
          fieldName: '', // 빈 필드명
          dataType: 'string',
          required: true,
          description: '잘못된 필드'
        }]
      ];

      const result = await converter.fromGrid(invalidGridData, SchemaFormat.JSON);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
    });

    it('지원하지 않는 형식에 대해 오류를 반환해야 함', async () => {
      const result = await converter.fromGrid(sampleGridData, 'unsupported' as SchemaFormat);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('지원하지 않는 대상 형식');
    });
  });

  describe('toGrid', () => {
    it('XML 스키마를 그리드 데이터로 변환해야 함', async () => {
      const xmlSchema = `
        <?xml version="1.0" encoding="UTF-8"?>
        <schema>
          <fields>
            <field name="id" type="integer" required="true">
              <description>고유 식별자</description>
            </field>
            <field name="name" type="string" required="true">
              <description>사용자 이름</description>
            </field>
          </fields>
        </schema>
      `;

      const gridData = await converter.toGrid(xmlSchema, SchemaFormat.XML);
      
      expect(gridData).toHaveLength(2);
      expect(gridData[0][0].fieldName).toBe('id');
      expect(gridData[0][0].dataType).toBe('integer');
      expect(gridData[0][0].required).toBe(true);
      expect(gridData[1][0].fieldName).toBe('name');
      expect(gridData[1][0].dataType).toBe('string');
      expect(gridData[1][0].required).toBe(true);
    });

    it('JSON 스키마를 그리드 데이터로 변환해야 함', async () => {
      const jsonSchema = `{
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "고유 식별자"
          },
          "name": {
            "type": "string",
            "description": "사용자 이름"
          },
          "email": {
            "type": "string",
            "description": "이메일 주소"
          }
        },
        "required": ["id", "name"]
      }`;

      const gridData = await converter.toGrid(jsonSchema, SchemaFormat.JSON);
      
      expect(gridData).toHaveLength(3);
      
      const idField = gridData.find(row => row[0].fieldName === 'id')?.[0];
      expect(idField).toBeDefined();
      expect(idField!.dataType).toBe('integer');
      expect(idField!.required).toBe(true);
      
      const emailField = gridData.find(row => row[0].fieldName === 'email')?.[0];
      expect(emailField).toBeDefined();
      expect(emailField!.required).toBe(false);
    });

    it('YAML 스키마를 그리드 데이터로 변환해야 함', async () => {
      const yamlSchema = `
type: object
properties:
  id:
    type: integer
    description: 고유 식별자
  name:
    type: string
    description: 사용자 이름
required:
  - id
  - name
      `;

      const gridData = await converter.toGrid(yamlSchema, SchemaFormat.YAML);
      
      expect(gridData).toHaveLength(2);
      expect(gridData[0][0].fieldName).toBe('id');
      expect(gridData[1][0].fieldName).toBe('name');
    });

    it('잘못된 XML에 대해 오류를 발생시켜야 함', async () => {
      const invalidXml = '<invalid><unclosed>';
      
      await expect(converter.toGrid(invalidXml, SchemaFormat.XML))
        .rejects.toThrow('스키마 변환 실패');
    });

    it('잘못된 JSON에 대해 오류를 발생시켜야 함', async () => {
      const invalidJson = '{"invalid": json}';
      
      await expect(converter.toGrid(invalidJson, SchemaFormat.JSON))
        .rejects.toThrow('스키마 변환 실패');
    });

    it('XXE 공격 패턴을 감지해야 함', async () => {
      const xxeXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE foo [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <schema>&xxe;</schema>
      `;
      
      await expect(converter.toGrid(xxeXml, SchemaFormat.XML))
        .rejects.toThrow('잠재적인 XXE 공격 패턴이 감지되었습니다');
    });
  });

  describe('validate', () => {
    it('유효한 XML 스키마를 검증해야 함', async () => {
      const validXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <schema>
          <fields>
            <field name="id" type="integer" required="true">
              <description>고유 식별자</description>
            </field>
          </fields>
        </schema>
      `;

      const result = await converter.validate(validXml, SchemaFormat.XML);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('유효한 JSON 스키마를 검증해야 함', async () => {
      const validJson = `{
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          }
        },
        "required": ["id"]
      }`;

      const result = await converter.validate(validJson, SchemaFormat.JSON);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('유효한 YAML 스키마를 검증해야 함', async () => {
      const validYaml = `
type: object
properties:
  id:
    type: integer
required:
  - id
      `;

      const result = await converter.validate(validYaml, SchemaFormat.YAML);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('잘못된 XML에 대해 검증 오류를 반환해야 함', async () => {
      const invalidXml = '<invalid><unclosed>';

      const result = await converter.validate(invalidXml, SchemaFormat.XML);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('잘못된 JSON에 대해 검증 오류를 반환해야 함', async () => {
      const invalidJson = '{"invalid": json}';

      const result = await converter.validate(invalidJson, SchemaFormat.JSON);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('잘못된 YAML에 대해 검증 오류를 반환해야 함', async () => {
      const invalidYaml = `
invalid: yaml: structure:
  - unclosed
      `;

      const result = await converter.validate(invalidYaml, SchemaFormat.YAML);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('빈 XML 스키마에 대해 오류를 반환해야 함', async () => {
      const emptyXml = '<?xml version="1.0" encoding="UTF-8"?>';

      const result = await converter.validate(emptyXml, SchemaFormat.XML);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.code === 'EMPTY_SCHEMA')).toBe(true);
    });

    it('잘못된 JSON 스키마 구조에 대해 오류를 반환해야 함', async () => {
      const invalidJsonSchema = `{
        "properties": "should be object",
        "required": "should be array"
      }`;

      const result = await converter.validate(invalidJsonSchema, SchemaFormat.JSON);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('데이터 타입 매핑', () => {
    it('다양한 데이터 타입을 올바르게 매핑해야 함', async () => {
      const gridDataWithTypes: SchemaGridData[][] = [
        [{ fieldName: 'stringField', dataType: 'string', required: true, description: 'String field' }],
        [{ fieldName: 'numberField', dataType: 'number', required: true, description: 'Number field' }],
        [{ fieldName: 'booleanField', dataType: 'boolean', required: true, description: 'Boolean field' }],
        [{ fieldName: 'dateField', dataType: 'date', required: true, description: 'Date field' }]
      ];

      const result = await converter.fromGrid(gridDataWithTypes, SchemaFormat.JSON);
      
      expect(result.errors).toHaveLength(0);
      expect(result.json).toBeDefined();
      
      const parsedJson = JSON.parse(result.json!);
      expect(parsedJson.properties.stringField.type).toBe('string');
      expect(parsedJson.properties.numberField.type).toBe('number');
      expect(parsedJson.properties.booleanField.type).toBe('boolean');
      expect(parsedJson.properties.dateField.type).toBe('string');
    });
  });

  describe('제약 조건 처리', () => {
    it('유효한 제약 조건을 올바르게 처리해야 함', async () => {
      const gridDataWithConstraints: SchemaGridData[][] = [
        [{
          fieldName: 'constrainedField',
          dataType: 'string',
          required: true,
          description: 'Field with constraints',
          constraints: '{"minLength": 5, "maxLength": 100}'
        }]
      ];

      const result = await converter.fromGrid(gridDataWithConstraints, SchemaFormat.JSON);
      
      expect(result.errors).toHaveLength(0);
      expect(result.json).toBeDefined();
      
      const parsedJson = JSON.parse(result.json!);
      expect(parsedJson.properties.constrainedField.minLength).toBe(5);
      expect(parsedJson.properties.constrainedField.maxLength).toBe(100);
    });

    it('잘못된 제약 조건에 대해 경고를 생성해야 함', async () => {
      const gridDataWithInvalidConstraints: SchemaGridData[][] = [
        [{
          fieldName: 'invalidConstraintsField',
          dataType: 'string',
          required: true,
          description: 'Field with invalid constraints',
          constraints: 'invalid json'
        }]
      ];

      const result = await converter.fromGrid(gridDataWithInvalidConstraints, SchemaFormat.JSON);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.code === 'INVALID_CONSTRAINTS_FORMAT')).toBe(true);
    });
  });
});