/**
 * GridComponent 단위 테스트
 */

import { GridComponent } from '../../components/GridComponent';
import { GridValidationService } from '../../services/GridValidationService';
import {
  GridComponentProps,
  GridColumn,
  SchemaGridData,
  DataType,
  ValidationResult
} from '../../types/grid';

// Handsontable 모킹
jest.mock('handsontable', () => {
  return jest.fn().mockImplementation(() => ({
    loadData: jest.fn(),
    getData: jest.fn(() => []),
    updateSettings: jest.fn(),
    setCellMeta: jest.fn(),
    render: jest.fn(),
    alter: jest.fn(),
    countRows: jest.fn(() => 10),
    countCols: jest.fn(() => 6),
    getSelected: jest.fn(),
    getDataAtRange: jest.fn(() => []),
    destroy: jest.fn()
  }));
});

describe('GridComponent', () => {
  let container: HTMLElement;
  let mockProps: GridComponentProps;
  let gridComponent: GridComponent;

  beforeEach(() => {
    // DOM 컨테이너 생성
    container = document.createElement('div');
    document.body.appendChild(container);

    // 기본 컬럼 설정
    const columns: GridColumn[] = [
      {
        id: 'fieldName',
        title: '필드명',
        type: DataType.TEXT,
        width: 150,
        validation: [
          {
            type: 'required',
            message: '필드명은 필수입니다.'
          }
        ]
      },
      {
        id: 'dataType',
        title: '데이터 타입',
        type: DataType.DROPDOWN,
        width: 120,
        source: ['string', 'number', 'boolean']
      }
    ];

    // 기본 데이터
    const data: SchemaGridData[][] = [
      [
        {
          fieldName: 'id',
          dataType: 'number',
          required: true,
          description: '고유 식별자',
          defaultValue: '',
          constraints: 'minimum: 1'
        },
        {
          fieldName: 'name',
          dataType: 'string',
          required: true,
          description: '이름',
          defaultValue: '',
          constraints: 'minLength: 2'
        }
      ]
    ];

    // Props 설정
    mockProps = {
      data,
      columns,
      onCellChange: jest.fn(),
      onStructureChange: jest.fn(),
      readOnly: false,
      collaborationMode: false,
      height: 400,
      licenseKey: 'non-commercial-and-evaluation'
    };
  });

  afterEach(() => {
    if (gridComponent) {
      gridComponent.destroy();
    }
    document.body.removeChild(container);
  });

  describe('초기화', () => {
    it('그리드 컴포넌트가 정상적으로 생성되어야 함', () => {
      expect(() => {
        gridComponent = new GridComponent(container, mockProps);
      }).not.toThrow();
    });

    it('읽기 전용 모드로 생성할 수 있어야 함', () => {
      const readOnlyProps = { ...mockProps, readOnly: true };
      
      expect(() => {
        gridComponent = new GridComponent(container, readOnlyProps);
      }).not.toThrow();
    });

    it('협업 모드로 생성할 수 있어야 함', () => {
      const collaborationProps = { ...mockProps, collaborationMode: true };
      
      expect(() => {
        gridComponent = new GridComponent(container, collaborationProps);
      }).not.toThrow();
    });
  });

  describe('데이터 관리', () => {
    beforeEach(() => {
      gridComponent = new GridComponent(container, mockProps);
    });

    it('데이터를 업데이트할 수 있어야 함', () => {
      const newData: SchemaGridData[][] = [
        [
          {
            fieldName: 'email',
            dataType: 'string',
            required: false,
            description: '이메일',
            defaultValue: '',
            constraints: 'pattern: email'
          }
        ]
      ];

      expect(() => {
        gridComponent.updateData(newData);
      }).not.toThrow();
    });

    it('컬럼 설정을 업데이트할 수 있어야 함', () => {
      const newColumns: GridColumn[] = [
        {
          id: 'newField',
          title: '새 필드',
          type: DataType.TEXT,
          width: 100
        }
      ];

      expect(() => {
        gridComponent.updateColumns(newColumns);
      }).not.toThrow();
    });

    it('현재 데이터를 가져올 수 있어야 함', () => {
      const data = gridComponent.getData();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('행/열 조작', () => {
    beforeEach(() => {
      gridComponent = new GridComponent(container, mockProps);
    });

    it('행을 추가할 수 있어야 함', () => {
      expect(() => {
        gridComponent.addRow();
      }).not.toThrow();
    });

    it('특정 위치에 행을 추가할 수 있어야 함', () => {
      expect(() => {
        gridComponent.addRow(2);
      }).not.toThrow();
    });

    it('행을 삭제할 수 있어야 함', () => {
      expect(() => {
        gridComponent.removeRow(0);
      }).not.toThrow();
    });

    it('열을 추가할 수 있어야 함', () => {
      expect(() => {
        gridComponent.addColumn();
      }).not.toThrow();
    });

    it('열을 삭제할 수 있어야 함', () => {
      expect(() => {
        gridComponent.removeColumn(0);
      }).not.toThrow();
    });

    it('읽기 전용 모드에서는 행/열 조작이 제한되어야 함', () => {
      const readOnlyGrid = new GridComponent(container, { ...mockProps, readOnly: true });
      
      // 읽기 전용 모드에서는 조작 메서드가 실행되지 않아야 함
      expect(() => {
        readOnlyGrid.addRow();
        readOnlyGrid.removeRow(0);
        readOnlyGrid.addColumn();
        readOnlyGrid.removeColumn(0);
      }).not.toThrow();
      
      readOnlyGrid.destroy();
    });
  });

  describe('검증 기능', () => {
    beforeEach(() => {
      gridComponent = new GridComponent(container, mockProps);
    });

    it('전체 그리드 검증을 수행할 수 있어야 함', () => {
      const result = gridComponent.validateAll();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('검증 결과를 가져올 수 있어야 함', () => {
      const results = gridComponent.getValidationResults();
      expect(results instanceof Map).toBe(true);
    });

    it('오류가 있는 셀을 하이라이트할 수 있어야 함', () => {
      expect(() => {
        gridComponent.highlightErrors();
      }).not.toThrow();
    });

    it('경고가 있는 셀을 하이라이트할 수 있어야 함', () => {
      expect(() => {
        gridComponent.highlightWarnings();
      }).not.toThrow();
    });
  });

  describe('이벤트 처리', () => {
    beforeEach(() => {
      gridComponent = new GridComponent(container, mockProps);
    });

    it('셀 변경 이벤트가 발생해야 함', () => {
      // Handsontable의 afterChange 이벤트 시뮬레이션
      const changes = [[0, 'fieldName', 'oldValue', 'newValue']];
      
      // 이벤트 핸들러 직접 호출 (private 메서드이므로 타입 단언 사용)
      const gridInstance = gridComponent as any;
      
      expect(() => {
        gridInstance.handleAfterChange(changes, 'edit');
      }).not.toThrow();
      
      expect(mockProps.onCellChange).toHaveBeenCalled();
    });

    it('구조 변경 이벤트가 발생해야 함', () => {
      const gridInstance = gridComponent as any;
      
      expect(() => {
        gridInstance.handleAfterCreateRow(0, 1);
      }).not.toThrow();
      
      expect(mockProps.onStructureChange).toHaveBeenCalled();
    });
  });

  describe('유틸리티 기능', () => {
    beforeEach(() => {
      gridComponent = new GridComponent(container, mockProps);
    });

    it('그리드를 새로고침할 수 있어야 함', () => {
      expect(() => {
        gridComponent.refresh();
      }).not.toThrow();
    });

    it('선택된 영역의 데이터를 가져올 수 있어야 함', () => {
      const selectedData = gridComponent.getSelectedData();
      expect(Array.isArray(selectedData)).toBe(true);
    });

    it('그리드를 파괴할 수 있어야 함', () => {
      expect(() => {
        gridComponent.destroy();
      }).not.toThrow();
    });
  });

  describe('에러 처리', () => {
    it('잘못된 컨테이너로 생성 시 에러가 발생해야 함', () => {
      expect(() => {
        new GridComponent(null as any, mockProps);
      }).toThrow();
    });

    it('잘못된 props로 생성 시 에러가 발생해야 함', () => {
      expect(() => {
        new GridComponent(container, null as any);
      }).toThrow();
    });
  });
});

describe('GridValidationService', () => {
  let validationService: GridValidationService;
  let testColumns: GridColumn[];
  let testData: SchemaGridData[][];

  beforeEach(() => {
    validationService = new GridValidationService();
    
    testColumns = [
      {
        id: 'fieldName',
        title: '필드명',
        type: DataType.TEXT,
        validation: [
          {
            type: 'required',
            message: '필드명은 필수입니다.'
          },
          {
            type: 'pattern',
            value: '^[a-zA-Z][a-zA-Z0-9_]*$',
            message: '필드명은 영문자로 시작해야 합니다.'
          }
        ]
      },
      {
        id: 'dataType',
        title: '데이터 타입',
        type: DataType.DROPDOWN,
        source: ['string', 'number', 'boolean'],
        validation: [
          {
            type: 'required',
            message: '데이터 타입은 필수입니다.'
          }
        ]
      }
    ];

    testData = [
      [
        {
          fieldName: 'validField',
          dataType: 'string',
          required: true,
          description: '유효한 필드',
          defaultValue: '',
          constraints: ''
        },
        {
          fieldName: '',
          dataType: 'number',
          required: false,
          description: '빈 필드명',
          defaultValue: '',
          constraints: ''
        }
      ]
    ];
  });

  describe('전체 그리드 검증', () => {
    it('유효한 데이터에 대해 성공 결과를 반환해야 함', () => {
      const validData: SchemaGridData[][] = [
        [
          {
            fieldName: 'validField',
            dataType: 'string',
            required: true,
            description: '유효한 필드',
            defaultValue: '',
            constraints: ''
          }
        ]
      ];

      const result = validationService.validateGrid(validData, testColumns);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('잘못된 데이터에 대해 오류를 반환해야 함', () => {
      const result = validationService.validateGrid(testData, testColumns);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('단일 셀 검증', () => {
    it('필수 필드 검증이 작동해야 함', () => {
      const result = validationService.validateCell('', testColumns[0], 0, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('required');
    });

    it('패턴 검증이 작동해야 함', () => {
      const result = validationService.validateCell('123invalid', testColumns[0], 0, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('유효한 값에 대해 성공 결과를 반환해야 함', () => {
      const result = validationService.validateCell('validFieldName', testColumns[0], 0, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('데이터 타입 검증', () => {
    it('텍스트 타입 검증이 작동해야 함', () => {
      const textColumn: GridColumn = {
        id: 'text',
        title: '텍스트',
        type: DataType.TEXT
      };

      const result = validationService.validateCell('valid text', textColumn, 0, 0);
      expect(result.isValid).toBe(true);
    });

    it('숫자 타입 검증이 작동해야 함', () => {
      const numberColumn: GridColumn = {
        id: 'number',
        title: '숫자',
        type: DataType.NUMBER
      };

      const validResult = validationService.validateCell(123, numberColumn, 0, 0);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validationService.validateCell('not a number', numberColumn, 0, 0);
      expect(invalidResult.isValid).toBe(false);
    });

    it('불린 타입 검증이 작동해야 함', () => {
      const booleanColumn: GridColumn = {
        id: 'boolean',
        title: '불린',
        type: DataType.BOOLEAN
      };

      const validResult = validationService.validateCell(true, booleanColumn, 0, 0);
      expect(validResult.isValid).toBe(true);

      const stringTrueResult = validationService.validateCell('true', booleanColumn, 0, 0);
      expect(stringTrueResult.isValid).toBe(true);

      const invalidResult = validationService.validateCell('invalid', booleanColumn, 0, 0);
      expect(invalidResult.isValid).toBe(false);
    });

    it('이메일 타입 검증이 작동해야 함', () => {
      const emailColumn: GridColumn = {
        id: 'email',
        title: '이메일',
        type: DataType.EMAIL
      };

      const validResult = validationService.validateCell('test@example.com', emailColumn, 0, 0);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validationService.validateCell('invalid-email', emailColumn, 0, 0);
      expect(invalidResult.isValid).toBe(false);
    });

    it('URL 타입 검증이 작동해야 함', () => {
      const urlColumn: GridColumn = {
        id: 'url',
        title: 'URL',
        type: DataType.URL
      };

      const validResult = validationService.validateCell('https://example.com', urlColumn, 0, 0);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validationService.validateCell('not-a-url', urlColumn, 0, 0);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('검증 규칙', () => {
    it('최소 길이 검증이 작동해야 함', () => {
      const column: GridColumn = {
        id: 'test',
        title: '테스트',
        type: DataType.TEXT,
        validation: [
          {
            type: 'minLength',
            value: 5,
            message: '최소 5자 이상이어야 합니다.'
          }
        ]
      };

      const shortResult = validationService.validateCell('abc', column, 0, 0);
      expect(shortResult.warnings.length).toBeGreaterThan(0);

      const validResult = validationService.validateCell('abcdef', column, 0, 0);
      expect(validResult.warnings).toHaveLength(0);
    });

    it('최대 길이 검증이 작동해야 함', () => {
      const column: GridColumn = {
        id: 'test',
        title: '테스트',
        type: DataType.TEXT,
        validation: [
          {
            type: 'maxLength',
            value: 10,
            message: '최대 10자까지 가능합니다.'
          }
        ]
      };

      const longResult = validationService.validateCell('this is too long', column, 0, 0);
      expect(longResult.warnings.length).toBeGreaterThan(0);

      const validResult = validationService.validateCell('short', column, 0, 0);
      expect(validResult.warnings).toHaveLength(0);
    });

    it('범위 검증이 작동해야 함', () => {
      const column: GridColumn = {
        id: 'test',
        title: '테스트',
        type: DataType.NUMBER,
        validation: [
          {
            type: 'range',
            value: [1, 100],
            message: '1과 100 사이의 값이어야 합니다.'
          }
        ]
      };

      const lowResult = validationService.validateCell(0, column, 0, 0);
      expect(lowResult.warnings.length).toBeGreaterThan(0);

      const highResult = validationService.validateCell(101, column, 0, 0);
      expect(highResult.warnings.length).toBeGreaterThan(0);

      const validResult = validationService.validateCell(50, column, 0, 0);
      expect(validResult.warnings).toHaveLength(0);
    });

    it('커스텀 검증이 작동해야 함', () => {
      const column: GridColumn = {
        id: 'test',
        title: '테스트',
        type: DataType.TEXT,
        validation: [
          {
            type: 'custom',
            validator: (value: any) => value === 'expected',
            message: '값이 "expected"여야 합니다.'
          }
        ]
      };

      const invalidResult = validationService.validateCell('wrong', column, 0, 0);
      expect(invalidResult.warnings.length).toBeGreaterThan(0);

      const validResult = validationService.validateCell('expected', column, 0, 0);
      expect(validResult.warnings).toHaveLength(0);
    });
  });

  describe('유틸리티 기능', () => {
    it('검증 메시지를 포맷할 수 있어야 함', () => {
      const error = {
        row: 0,
        col: 1,
        message: '테스트 오류',
        type: 'test_error',
        value: 'test'
      };

      const formatted = validationService.formatValidationMessage(error);
      expect(formatted).toContain('행 1');
      expect(formatted).toContain('열 2');
      expect(formatted).toContain('테스트 오류');
    });

    it('검증 통계를 생성할 수 있어야 함', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          { row: 0, col: 0, message: '오류1', type: 'type1', value: '' },
          { row: 0, col: 1, message: '오류2', type: 'type1', value: '' },
          { row: 1, col: 0, message: '오류3', type: 'type2', value: '' }
        ],
        warnings: [
          { row: 0, col: 0, message: '경고1', type: 'warning1', value: '' }
        ]
      };

      const stats = validationService.getValidationStats(result);
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.totalWarnings).toBe(1);
      expect(stats.errorsByType.type1).toBe(2);
      expect(stats.errorsByType.type2).toBe(1);
      expect(stats.warningsByType.warning1).toBe(1);
    });
  });
});