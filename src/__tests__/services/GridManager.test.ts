/**
 * GridManager 단위 테스트
 */

import { GridManager } from '../../services/GridManager';
import { GridComponent } from '../../components/GridComponent';
import {
  GridColumn,
  SchemaGridData,
  DataType,
  CellChangeEvent,
  StructureChange
} from '../../types/grid';

// GridComponent 모킹
jest.mock('../../components/GridComponent');

describe('GridManager', () => {
  let gridManager: GridManager;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    gridManager = new GridManager();
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
    
    // GridComponent 모킹 초기화
    (GridComponent as jest.MockedClass<typeof GridComponent>).mockClear();
  });

  afterEach(() => {
    gridManager.destroyAllGrids();
    document.body.removeChild(mockContainer);
  });

  describe('그리드 생성 및 관리', () => {
    it('새 그리드를 생성할 수 있어야 함', () => {
      const gridId = 'test-grid';
      
      const grid = gridManager.createGrid(gridId, mockContainer);
      
      expect(GridComponent).toHaveBeenCalledTimes(1);
      expect(grid).toBeInstanceOf(GridComponent);
      expect(gridManager.getGrid(gridId)).toBe(grid);
    });

    it('커스텀 옵션으로 그리드를 생성할 수 있어야 함', () => {
      const gridId = 'custom-grid';
      const options = {
        readOnly: true,
        collaborationMode: true,
        height: 500
      };
      
      const _grid = gridManager.createGrid(gridId, mockContainer, options);
      
      expect(GridComponent).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining(options)
      );
    });

    it('기존 그리드가 있으면 제거 후 새로 생성해야 함', () => {
      const gridId = 'existing-grid';
      
      // 첫 번째 그리드 생성
      const firstGrid = gridManager.createGrid(gridId, mockContainer);
      const destroySpy = jest.spyOn(firstGrid, 'destroy');
      
      // 같은 ID로 두 번째 그리드 생성
      const secondGrid = gridManager.createGrid(gridId, mockContainer);
      
      expect(destroySpy).toHaveBeenCalled();
      expect(GridComponent).toHaveBeenCalledTimes(2);
      expect(gridManager.getGrid(gridId)).toBe(secondGrid);
    });

    it('그리드를 가져올 수 있어야 함', () => {
      const gridId = 'get-test-grid';
      const grid = gridManager.createGrid(gridId, mockContainer);
      
      const retrievedGrid = gridManager.getGrid(gridId);
      
      expect(retrievedGrid).toBe(grid);
    });

    it('존재하지 않는 그리드는 undefined를 반환해야 함', () => {
      const nonExistentGrid = gridManager.getGrid('non-existent');
      
      expect(nonExistentGrid).toBeUndefined();
    });

    it('그리드를 제거할 수 있어야 함', () => {
      const gridId = 'remove-test-grid';
      const grid = gridManager.createGrid(gridId, mockContainer);
      const destroySpy = jest.spyOn(grid, 'destroy');
      
      const removed = gridManager.destroyGrid(gridId);
      
      expect(removed).toBe(true);
      expect(destroySpy).toHaveBeenCalled();
      expect(gridManager.getGrid(gridId)).toBeUndefined();
    });

    it('존재하지 않는 그리드 제거 시 false를 반환해야 함', () => {
      const removed = gridManager.destroyGrid('non-existent');
      
      expect(removed).toBe(false);
    });

    it('모든 그리드를 제거할 수 있어야 함', () => {
      const grid1 = gridManager.createGrid('grid1', mockContainer);
      const grid2 = gridManager.createGrid('grid2', mockContainer);
      
      const destroySpy1 = jest.spyOn(grid1, 'destroy');
      const destroySpy2 = jest.spyOn(grid2, 'destroy');
      
      gridManager.destroyAllGrids();
      
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
      expect(gridManager.getGrid('grid1')).toBeUndefined();
      expect(gridManager.getGrid('grid2')).toBeUndefined();
    });
  });

  describe('스키마 데이터 변환', () => {
    it('JSON 스키마를 그리드 데이터로 변환할 수 있어야 함', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: '고유 식별자'
          },
          name: {
            type: 'string',
            description: '이름',
            minLength: 2,
            maxLength: 50
          },
          email: {
            type: 'string',
            description: '이메일',
            pattern: '^[^@]+@[^@]+\\.[^@]+$'
          }
        },
        required: ['id', 'name']
      };

      const gridData = gridManager.convertSchemaToGridData(jsonSchema);

      expect(Array.isArray(gridData)).toBe(true);
      expect(gridData.length).toBeGreaterThanOrEqual(3);
      
      // id 필드 검증
      const idField = gridData.find(row => row[0]?.fieldName === 'id');
      expect(idField).toBeDefined();
      expect(idField![0].dataType).toBe('number');
      expect(idField![0].required).toBe(true);
      expect(idField![0].description).toBe('고유 식별자');

      // name 필드 검증
      const nameField = gridData.find(row => row[0]?.fieldName === 'name');
      expect(nameField).toBeDefined();
      expect(nameField![0].dataType).toBe('string');
      expect(nameField![0].required).toBe(true);
      expect(nameField![0].constraints).toContain('minLength: 2');
      expect(nameField![0].constraints).toContain('maxLength: 50');

      // email 필드 검증
      const emailField = gridData.find(row => row[0]?.fieldName === 'email');
      expect(emailField).toBeDefined();
      expect(emailField![0].required).toBe(false);
      expect(emailField![0].constraints).toContain('pattern:');
    });

    it('XML 스키마를 그리드 데이터로 변환할 수 있어야 함', () => {
      const xmlSchema = {
        elements: [
          {
            name: 'userId',
            type: 'int',
            minOccurs: '1',
            annotation: {
              documentation: '사용자 ID'
            }
          },
          {
            name: 'userName',
            type: 'string',
            minOccurs: '0',
            default: 'Anonymous'
          }
        ]
      };

      const gridData = gridManager.convertSchemaToGridData(xmlSchema);

      expect(Array.isArray(gridData)).toBe(true);
      
      const userIdField = gridData.find(row => row[0]?.fieldName === 'userId');
      expect(userIdField).toBeDefined();
      expect(userIdField![0].dataType).toBe('int');
      expect(userIdField![0].required).toBe(true);
      expect(userIdField![0].description).toBe('사용자 ID');

      const userNameField = gridData.find(row => row[0]?.fieldName === 'userName');
      expect(userNameField).toBeDefined();
      expect(userNameField![0].required).toBe(false);
      expect(userNameField![0].defaultValue).toBe('Anonymous');
    });

    it('그리드 데이터를 JSON 스키마로 변환할 수 있어야 함', () => {
      const gridData: SchemaGridData[][] = [
        [
          {
            fieldName: 'id',
            dataType: 'number',
            required: true,
            description: '고유 식별자',
            defaultValue: '',
            constraints: 'minimum: 1'
          }
        ],
        [
          {
            fieldName: 'name',
            dataType: 'string',
            required: true,
            description: '이름',
            defaultValue: 'Unknown',
            constraints: 'minLength: 2, maxLength: 50'
          }
        ]
      ];

      const schema = gridManager.convertGridDataToSchema(gridData, 'json');

      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('properties');
      expect(schema).toHaveProperty('required');

      expect(schema.properties.id).toEqual({
        type: 'number',
        description: '고유 식별자',
        minimum: 1
      });

      expect(schema.properties.name).toEqual({
        type: 'string',
        description: '이름',
        default: 'Unknown',
        minLength: 2,
        maxLength: 50
      });

      expect(schema.required).toEqual(['id', 'name']);
    });

    it('그리드 데이터를 XML 스키마로 변환할 수 있어야 함', () => {
      const gridData: SchemaGridData[][] = [
        [
          {
            fieldName: 'id',
            dataType: 'number',
            required: true,
            description: '고유 식별자',
            defaultValue: '1',
            constraints: ''
          }
        ]
      ];

      const schema = gridManager.convertGridDataToSchema(gridData, 'xml');

      expect(schema).toHaveProperty('elements');
      expect(Array.isArray(schema.elements)).toBe(true);
      expect(schema.elements).toHaveLength(1);

      const element = schema.elements[0];
      expect(element.name).toBe('id');
      expect(element.type).toBe('number');
      expect(element.minOccurs).toBe('1');
      expect(element.default).toBe('1');
      expect(element.annotation.documentation).toBe('고유 식별자');
    });

    it('빈 스키마에 대해 기본 그리드 데이터를 반환해야 함', () => {
      const emptySchema = {};
      const gridData = gridManager.convertSchemaToGridData(emptySchema);

      expect(Array.isArray(gridData)).toBe(true);
      expect(gridData.length).toBe(10); // 최소 10행 보장
    });

    it('잘못된 스키마에 대해 기본 그리드 데이터를 반환해야 함', () => {
      const invalidSchema = null;
      const gridData = gridManager.convertSchemaToGridData(invalidSchema);

      expect(Array.isArray(gridData)).toBe(true);
      expect(gridData.length).toBe(10);
    });
  });

  describe('검증 기능', () => {
    it('모든 그리드의 검증을 수행할 수 있어야 함', () => {
      const grid1 = gridManager.createGrid('grid1', mockContainer);
      const grid2 = gridManager.createGrid('grid2', mockContainer);

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      jest.spyOn(grid1, 'validateAll').mockReturnValue(mockValidationResult);
      jest.spyOn(grid2, 'validateAll').mockReturnValue(mockValidationResult);

      const results = gridManager.validateAllGrids();

      expect(results instanceof Map).toBe(true);
      expect(results.size).toBe(2);
      expect(results.get('grid1')).toBe(mockValidationResult);
      expect(results.get('grid2')).toBe(mockValidationResult);
    });
  });

  describe('통계 및 메타데이터', () => {
    it('그리드 통계를 가져올 수 있어야 함', () => {
      const grid1 = gridManager.createGrid('grid1', mockContainer);
      const grid2 = gridManager.createGrid('grid2', mockContainer);

      // 모킹된 데이터 설정
      jest.spyOn(grid1, 'getData').mockReturnValue([
        ['field1', 'string', true],
        ['field2', 'number', false]
      ]);
      jest.spyOn(grid2, 'getData').mockReturnValue([
        ['field3', 'boolean', true]
      ]);

      jest.spyOn(grid1, 'getValidationResults').mockReturnValue(new Map([
        ['0-0', { isValid: false, errors: [{ row: 0, col: 0, message: 'error', type: 'test', value: '' }], warnings: [] }]
      ]));
      jest.spyOn(grid2, 'getValidationResults').mockReturnValue(new Map());

      const stats = gridManager.getGridStats();

      expect(stats.totalGrids).toBe(2);
      expect(stats.activeGrids).toBe(2);
      expect(stats.totalCells).toBe(9); // (2 * 3) + (1 * 3)
      expect(stats.validationErrors).toBe(1);
      expect(stats.validationWarnings).toBe(0);
    });

    it('그리드 메타데이터를 생성할 수 있어야 함', () => {
      const gridData: SchemaGridData[][] = [
        [
          {
            fieldName: 'test',
            dataType: 'string',
            required: true,
            description: 'test field',
            defaultValue: '',
            constraints: ''
          }
        ]
      ];

      const columns: GridColumn[] = [
        {
          id: 'fieldName',
          title: '필드명',
          type: DataType.TEXT
        }
      ];

      const metadata = gridManager.createGridMetadata(gridData, columns);

      expect(metadata).toHaveProperty('columns', columns);
      expect(metadata).toHaveProperty('rowCount', 1);
      expect(metadata).toHaveProperty('columnCount', 1);
      expect(metadata).toHaveProperty('customTypes');
      expect(metadata).toHaveProperty('constraints');
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('createdAt');
      expect(metadata).toHaveProperty('updatedAt');
    });
  });

  describe('데이터 내보내기', () => {
    beforeEach(() => {
      const grid = gridManager.createGrid('export-test', mockContainer);
      jest.spyOn(grid, 'getData').mockReturnValue([
        ['field1', 'string', true, 'description1', 'default1', 'constraint1'],
        ['field2', 'number', false, 'description2', 'default2', 'constraint2']
      ]);
    });

    it('CSV 형식으로 내보낼 수 있어야 함', () => {
      const csv = gridManager.exportGridData('export-test', 'csv');

      expect(typeof csv).toBe('string');
      expect(csv).toContain('필드명,데이터 타입,필수,설명,기본값,제약조건');
      expect(csv).toContain('field1,string,true,description1,default1,constraint1');
      expect(csv).toContain('field2,number,false,description2,default2,constraint2');
    });

    it('JSON 형식으로 내보낼 수 있어야 함', () => {
      const json = gridManager.exportGridData('export-test', 'json');

      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('XML 형식으로 내보낼 수 있어야 함', () => {
      const xml = gridManager.exportGridData('export-test', 'xml');

      expect(typeof xml).toBe('string');
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<schema>');
      expect(xml).toContain('<field id="0">');
      expect(xml).toContain('<fieldName>field1</fieldName>');
    });

    it('존재하지 않는 그리드에 대해 오류를 발생시켜야 함', () => {
      expect(() => {
        gridManager.exportGridData('non-existent', 'csv');
      }).toThrow('그리드를 찾을 수 없습니다: non-existent');
    });

    it('지원하지 않는 형식에 대해 오류를 발생시켜야 함', () => {
      expect(() => {
        gridManager.exportGridData('export-test', 'unsupported' as any);
      }).toThrow('지원하지 않는 형식: unsupported');
    });
  });

  describe('이벤트 처리', () => {
    it('셀 변경 이벤트를 처리할 수 있어야 함', () => {
      const gridId = 'event-test';
      gridManager.createGrid(gridId, mockContainer);

      const changes: CellChangeEvent[] = [
        {
          row: 0,
          col: 0,
          oldValue: 'old',
          newValue: 'new',
          source: 'edit'
        }
      ];

      // private 메서드 테스트를 위한 타입 단언
      const manager = gridManager as any;
      
      expect(() => {
        manager.handleCellChange(gridId, changes);
      }).not.toThrow();
    });

    it('구조 변경 이벤트를 처리할 수 있어야 함', () => {
      const gridId = 'structure-test';
      gridManager.createGrid(gridId, mockContainer);

      const changes: StructureChange[] = [
        {
          type: 'insert_row',
          index: 0,
          amount: 1
        }
      ];

      const manager = gridManager as any;
      
      expect(() => {
        manager.handleStructureChange(gridId, changes);
      }).not.toThrow();
    });
  });

  describe('에러 처리', () => {
    it('그리드 생성 실패 시 에러를 발생시켜야 함', () => {
      // GridComponent 생성자가 에러를 던지도록 모킹
      (GridComponent as jest.MockedClass<typeof GridComponent>)
        .mockImplementationOnce(() => {
          throw new Error('Grid creation failed');
        });

      expect(() => {
        gridManager.createGrid('error-test', mockContainer);
      }).toThrow('Grid creation failed');
    });

    it('스키마 변환 실패 시 기본값을 반환해야 함', () => {
      // JSON.parse가 실패하도록 잘못된 데이터 전달
      const invalidSchema = { properties: null };
      
      const gridData = gridManager.convertSchemaToGridData(invalidSchema);
      
      expect(Array.isArray(gridData)).toBe(true);
      expect(gridData.length).toBe(10); // 기본 행 수
    });
  });
});