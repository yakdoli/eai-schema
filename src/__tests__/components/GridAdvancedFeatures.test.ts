/**
 * 그리드 고급 기능 테스트
 */

import { GridAdvancedFeatures, FilterCondition, SortCondition } from '../../services/GridAdvancedFeatures';
import { DataType } from '../../types/grid';

// Handsontable 모킹
const mockHandsontable = {
  addHook: jest.fn(),
  getCellMeta: jest.fn(() => ({
    className: '',
    type: 'text',
    readOnly: false
  })),
  setCellMeta: jest.fn(),
  render: jest.fn(),
  countRows: jest.fn(() => 10),
  countCols: jest.fn(() => 6),
  getDataAtCell: jest.fn(() => 'test'),
  setDataAtCell: jest.fn(),
  getSelected: jest.fn(() => [[0, 0, 1, 1]]),
  selectCell: jest.fn(),
  updateSettings: jest.fn(),
  getPlugin: jest.fn(() => ({
    sort: jest.fn(),
    clearSort: jest.fn()
  })),
  setRowHeight: jest.fn(),
  setColWidth: jest.fn()
};

describe('GridAdvancedFeatures', () => {
  let advancedFeatures: GridAdvancedFeatures;

  beforeEach(() => {
    jest.clearAllMocks();
    advancedFeatures = new GridAdvancedFeatures(mockHandsontable as any);
  });

  describe('셀 범위 선택', () => {
    test('전체 선택이 올바르게 작동해야 함', () => {
      advancedFeatures.selectAll();
      
      expect(mockHandsontable.selectCell).toHaveBeenCalledWith(0, 0, 9, 5);
    });

    test('선택된 범위를 올바르게 반환해야 함', () => {
      // 선택 이벤트 시뮬레이션
      const afterSelectionCallback = mockHandsontable.addHook.mock.calls
        .find(call => call[0] === 'afterSelection')?.[1];
      
      if (afterSelectionCallback) {
        afterSelectionCallback(1, 2, 3, 4);
      }

      const range = advancedFeatures.getSelectedRange();
      expect(range).toEqual({
        startRow: 1,
        startCol: 2,
        endRow: 3,
        endCol: 4
      });
    });
  });

  describe('복사/붙여넣기 기능', () => {
    test('포맷 포함 복사가 올바르게 작동해야 함', () => {
      // 선택 범위 설정
      const afterSelectionCallback = mockHandsontable.addHook.mock.calls
        .find(call => call[0] === 'afterSelection')?.[1];
      
      if (afterSelectionCallback) {
        afterSelectionCallback(0, 0, 1, 1);
      }

      // 셀 데이터 모킹
      mockHandsontable.getDataAtCell
        .mockReturnValueOnce('test1')
        .mockReturnValueOnce('test2')
        .mockReturnValueOnce('test3')
        .mockReturnValueOnce('test4');

      mockHandsontable.getCellMeta.mockReturnValue({
        type: 'text',
        className: 'test-class',
        readOnly: false
      });

      advancedFeatures.copyWithFormat();

      const clipboardData = advancedFeatures.getClipboardData();
      expect(clipboardData).toBeTruthy();
      expect(clipboardData?.data).toHaveLength(2);
      expect(clipboardData?.data[0]).toHaveLength(2);
    });

    test('선택된 셀 삭제가 올바르게 작동해야 함', () => {
      // 선택 범위 설정
      const afterSelectionCallback = mockHandsontable.addHook.mock.calls
        .find(call => call[0] === 'afterSelection')?.[1];
      
      if (afterSelectionCallback) {
        afterSelectionCallback(0, 0, 1, 1);
      }

      advancedFeatures.deleteSelectedCells();

      expect(mockHandsontable.setDataAtCell).toHaveBeenCalledWith([
        [0, 0, ''],
        [0, 1, ''],
        [1, 0, ''],
        [1, 1, '']
      ]);
    });
  });

  describe('데이터 타입별 에디터', () => {
    test('텍스트 에디터가 올바르게 설정되어야 함', () => {
      advancedFeatures.applyCellEditor(0, 0, DataType.TEXT);

      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'type', 'text');
      expect(mockHandsontable.render).toHaveBeenCalled();
    });

    test('숫자 에디터가 올바르게 설정되어야 함', () => {
      advancedFeatures.applyCellEditor(0, 0, DataType.NUMBER);

      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'type', 'numeric');
      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'numericFormat', { pattern: '0,0.00' });
    });

    test('불린 에디터가 올바르게 설정되어야 함', () => {
      advancedFeatures.applyCellEditor(0, 0, DataType.BOOLEAN);

      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'type', 'checkbox');
    });

    test('날짜 에디터가 올바르게 설정되어야 함', () => {
      advancedFeatures.applyCellEditor(0, 0, DataType.DATE);

      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'type', 'date');
      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'dateFormat', 'YYYY-MM-DD');
    });

    test('드롭다운 에디터가 올바르게 설정되어야 함', () => {
      advancedFeatures.applyCellEditor(0, 0, DataType.DROPDOWN);

      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'type', 'dropdown');
      expect(mockHandsontable.setCellMeta).toHaveBeenCalledWith(0, 0, 'source', ['옵션1', '옵션2', '옵션3']);
    });
  });

  describe('필터링 기능', () => {
    test('필터가 올바르게 적용되어야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'equals',
        value: 'test'
      };

      advancedFeatures.applyFilter(condition);

      const activeFilters = advancedFeatures.getActiveFilters();
      expect(activeFilters).toContain(condition);
    });

    test('필터가 올바르게 제거되어야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'equals',
        value: 'test'
      };

      advancedFeatures.applyFilter(condition);
      advancedFeatures.removeFilter(0);

      const activeFilters = advancedFeatures.getActiveFilters();
      expect(activeFilters).not.toContain(condition);
    });

    test('모든 필터가 올바르게 제거되어야 함', () => {
      const condition1: FilterCondition = {
        column: 0,
        type: 'equals',
        value: 'test1'
      };

      const condition2: FilterCondition = {
        column: 1,
        type: 'contains',
        value: 'test2'
      };

      advancedFeatures.applyFilter(condition1);
      advancedFeatures.applyFilter(condition2);
      advancedFeatures.clearAllFilters();

      const activeFilters = advancedFeatures.getActiveFilters();
      expect(activeFilters).toHaveLength(0);
    });
  });

  describe('정렬 기능', () => {
    test('정렬이 올바르게 적용되어야 함', () => {
      const condition: SortCondition = {
        column: 0,
        direction: 'asc'
      };

      advancedFeatures.applySort(condition);

      const activeSorts = advancedFeatures.getActiveSorts();
      expect(activeSorts).toContain(condition);
    });

    test('정렬이 올바르게 제거되어야 함', () => {
      const condition: SortCondition = {
        column: 0,
        direction: 'asc'
      };

      advancedFeatures.applySort(condition);
      advancedFeatures.removeSort(0);

      const activeSorts = advancedFeatures.getActiveSorts();
      expect(activeSorts).not.toContain(condition);
    });

    test('모든 정렬이 올바르게 제거되어야 함', () => {
      const condition1: SortCondition = {
        column: 0,
        direction: 'asc'
      };

      const condition2: SortCondition = {
        column: 1,
        direction: 'desc'
      };

      advancedFeatures.applySort(condition1);
      advancedFeatures.applySort(condition2);
      advancedFeatures.clearAllSorts();

      const activeSorts = advancedFeatures.getActiveSorts();
      expect(activeSorts).toHaveLength(0);
    });
  });

  describe('행/열 크기 조정', () => {
    test('행 높이가 올바르게 조정되어야 함', () => {
      advancedFeatures.resizeRow(0, 50);

      expect(mockHandsontable.setRowHeight).toHaveBeenCalledWith(0, 50);
      expect(mockHandsontable.render).toHaveBeenCalled();
    });

    test('열 너비가 올바르게 조정되어야 함', () => {
      advancedFeatures.resizeColumn(0, 150);

      expect(mockHandsontable.setColWidth).toHaveBeenCalledWith(0, 150);
      expect(mockHandsontable.render).toHaveBeenCalled();
    });
  });

  describe('행/열 고정', () => {
    test('행이 올바르게 고정되어야 함', () => {
      advancedFeatures.freezeRows(2);

      expect(mockHandsontable.updateSettings).toHaveBeenCalledWith({
        fixedRowsTop: 2
      });
    });

    test('열이 올바르게 고정되어야 함', () => {
      advancedFeatures.freezeColumns(3);

      expect(mockHandsontable.updateSettings).toHaveBeenCalledWith({
        fixedColumnsLeft: 3
      });
    });
  });

  describe('필터 조건 매칭', () => {
    test('equals 조건이 올바르게 작동해야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'equals',
        value: 'test'
      };

      // private 메서드 테스트를 위해 reflection 사용
      const matchesFilter = (advancedFeatures as any).matchesFilter;
      
      expect(matchesFilter('test', condition)).toBe(true);
      expect(matchesFilter('TEST', condition)).toBe(true); // 대소문자 무시
      expect(matchesFilter('other', condition)).toBe(false);
    });

    test('contains 조건이 올바르게 작동해야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'contains',
        value: 'est'
      };

      const matchesFilter = (advancedFeatures as any).matchesFilter;
      
      expect(matchesFilter('test', condition)).toBe(true);
      expect(matchesFilter('testing', condition)).toBe(true);
      expect(matchesFilter('other', condition)).toBe(false);
    });

    test('greaterThan 조건이 올바르게 작동해야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'greaterThan',
        value: '10'
      };

      const matchesFilter = (advancedFeatures as any).matchesFilter;
      
      expect(matchesFilter('15', condition)).toBe(true);
      expect(matchesFilter('5', condition)).toBe(false);
      expect(matchesFilter('10', condition)).toBe(false);
    });

    test('between 조건이 올바르게 작동해야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'between',
        value: '10',
        value2: '20'
      };

      const matchesFilter = (advancedFeatures as any).matchesFilter;
      
      expect(matchesFilter('15', condition)).toBe(true);
      expect(matchesFilter('10', condition)).toBe(true);
      expect(matchesFilter('20', condition)).toBe(true);
      expect(matchesFilter('5', condition)).toBe(false);
      expect(matchesFilter('25', condition)).toBe(false);
    });

    test('empty 조건이 올바르게 작동해야 함', () => {
      const condition: FilterCondition = {
        column: 0,
        type: 'empty',
        value: ''
      };

      const matchesFilter = (advancedFeatures as any).matchesFilter;
      
      expect(matchesFilter('', condition)).toBe(true);
      expect(matchesFilter(null, condition)).toBe(true);
      expect(matchesFilter(undefined, condition)).toBe(true);
      expect(matchesFilter('   ', condition)).toBe(true);
      expect(matchesFilter('test', condition)).toBe(false);
    });
  });
});