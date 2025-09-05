/**
 * 그리드 고급 기능 서비스
 * 셀 범위 선택, 복사/붙여넣기, 고급 에디터, 필터링/정렬 등의 기능 제공
 */

import Handsontable from 'handsontable';
import {
  GridColumn,
  SchemaGridData,
  DataType,
  ValidationResult,
  CellChangeEvent
} from '../types/grid';
import { Logger } from '../core/logging/Logger';

// 셀 범위 선택 인터페이스
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// 복사/붙여넣기 데이터 인터페이스
export interface ClipboardData {
  data: any[][];
  range: CellRange;
  timestamp: number;
}

// 필터 조건 인터페이스
export interface FilterCondition {
  column: number;
  type: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'empty' | 'notEmpty';
  value: any;
  value2?: any; // between 조건용
}

// 정렬 조건 인터페이스
export interface SortCondition {
  column: number;
  direction: 'asc' | 'desc';
}

export class GridAdvancedFeatures {
  private hot: Handsontable;
  private logger: Logger;
  private clipboard: ClipboardData | null = null;
  private selectedRange: CellRange | null = null;
  private activeFilters: FilterCondition[] = [];
  private activeSorts: SortCondition[] = [];

  constructor(handsontableInstance: Handsontable) {
    this.hot = handsontableInstance;
    this.logger = new Logger('GridAdvancedFeatures');
    this.initializeFeatures();
  }

  /**
   * 고급 기능 초기화
   */
  private initializeFeatures(): void {
    this.setupRangeSelection();
    this.setupClipboardOperations();
    this.setupAdvancedEditors();
    this.setupKeyboardShortcuts();
  }

  /**
   * 셀 범위 선택 기능 설정
   */
  private setupRangeSelection(): void {
    // 선택 영역 변경 이벤트 핸들러
    this.hot.addHook('afterSelection', (row: number, column: number, row2: number, column2: number) => {
      this.selectedRange = {
        startRow: Math.min(row, row2),
        startCol: Math.min(column, column2),
        endRow: Math.max(row, row2),
        endCol: Math.max(column, column2)
      };

      this.highlightSelectedRange();
      this.logger.debug('셀 범위 선택됨:', this.selectedRange);
    });

    // 선택 해제 이벤트 핸들러
    this.hot.addHook('afterDeselect', () => {
      this.selectedRange = null;
      this.clearRangeHighlight();
    });
  }

  /**
   * 선택된 범위 시각적 표시
   */
  private highlightSelectedRange(): void {
    if (!this.selectedRange) return;

    const { startRow, startCol, endRow, endCol } = this.selectedRange;
    
    // 선택된 범위에 특별한 클래스 추가
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellMeta = this.hot.getCellMeta(row, col);
        const currentClassName = cellMeta.className || '';
        
        if (!currentClassName.includes('selected-range')) {
          this.hot.setCellMeta(row, col, 'className', `${currentClassName} selected-range`.trim());
        }
      }
    }

    this.hot.render();
  }

  /**
   * 범위 하이라이트 제거
   */
  private clearRangeHighlight(): void {
    const totalRows = this.hot.countRows();
    const totalCols = this.hot.countCols();

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const cellMeta = this.hot.getCellMeta(row, col);
        const currentClassName = cellMeta.className || '';
        
        if (typeof currentClassName === 'string' && currentClassName.includes('selected-range')) {
          const newClassName = currentClassName.replace(/\s*selected-range\s*/g, '').trim();
          this.hot.setCellMeta(row, col, 'className', newClassName);
        }
      }
    }

    this.hot.render();
  }

  /**
   * 클립보드 작업 설정
   */
  private setupClipboardOperations(): void {
    // 복사 기능 향상
    this.hot.addHook('afterCopy', (data: any[][], coords: any[]) => {
      if (coords && coords.length > 0) {
        const coord = coords[0];
        this.clipboard = {
          data,
          range: {
            startRow: coord.startRow,
            startCol: coord.startCol,
            endRow: coord.endRow,
            endCol: coord.endCol
          },
          timestamp: Date.now()
        };

        this.logger.debug('데이터 복사됨:', this.clipboard);
        this.showClipboardNotification('복사됨', data.length, data[0]?.length || 0);
      }
    });

    // 붙여넣기 기능 향상
    this.hot.addHook('afterPaste', (data: any[][], coords: any[]) => {
      if (coords && coords.length > 0) {
        this.logger.debug('데이터 붙여넣기됨:', { data, coords });
        this.showClipboardNotification('붙여넣기됨', data.length, data[0]?.length || 0);
        
        // 붙여넣기 후 검증 수행
        this.validatePastedData(coords[0]);
      }
    });
  }

  /**
   * 고급 셀 에디터 설정
   */
  private setupAdvancedEditors(): void {
    // 커스텀 에디터 등록
    this.registerCustomEditors();
  }

  /**
   * 커스텀 에디터 등록
   */
  private registerCustomEditors(): void {
    // 이메일 에디터
    const EmailEditor = (Handsontable.editors as any).TextEditor.prototype.extend();
    EmailEditor.prototype.getValue = function() {
      const value = (this as any).TEXTAREA.value;
      if (value && !(this as any).isValidEmail(value)) {
        (this as any).hot.setCellMeta((this as any).row, (this as any).col, 'className', 'cell-error');
      }
      return value;
    };
    EmailEditor.prototype.isValidEmail = function(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // URL 에디터
    const UrlEditor = (Handsontable.editors as any).TextEditor.prototype.extend();
    UrlEditor.prototype.getValue = function() {
      const value = (this as any).TEXTAREA.value;
      if (value && !(this as any).isValidUrl(value)) {
        (this as any).hot.setCellMeta((this as any).row, (this as any).col, 'className', 'cell-error');
      }
      return value;
    };
    UrlEditor.prototype.isValidUrl = function(url: string): boolean {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    // 에디터 등록
    (Handsontable.editors as any).registerEditor('email', EmailEditor);
    (Handsontable.editors as any).registerEditor('url', UrlEditor);
  }

  /**
   * 키보드 단축키 설정
   */
  private setupKeyboardShortcuts(): void {
    // Ctrl+A: 전체 선택
    this.hot.addHook('beforeKeyDown', (event: any) => {
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        this.selectAll();
      }
      
      // Ctrl+Shift+C: 고급 복사 (포맷 포함)
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.copyWithFormat();
      }
      
      // Ctrl+Shift+V: 고급 붙여넣기 (포맷 포함)
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        this.pasteWithFormat();
      }
      
      // Delete: 선택된 셀 내용 삭제
      if (event.key === 'Delete') {
        this.deleteSelectedCells();
      }
    });
  }

  /**
   * 전체 선택
   */
  public selectAll(): void {
    const totalRows = this.hot.countRows();
    const totalCols = this.hot.countCols();
    
    this.hot.selectCell(0, 0, totalRows - 1, totalCols - 1);
    this.logger.debug('전체 셀 선택됨');
  }

  /**
   * 포맷 포함 복사
   */
  public copyWithFormat(): void {
    if (!this.selectedRange) {
      this.logger.warn('선택된 범위가 없습니다');
      return;
    }

    const { startRow, startCol, endRow, endCol } = this.selectedRange;
    const data: any[][] = [];
    const formats: any[][] = [];

    for (let row = startRow; row <= endRow; row++) {
      const rowData: any[] = [];
      const rowFormats: any[] = [];
      
      for (let col = startCol; col <= endCol; col++) {
        const cellData = this.hot.getDataAtCell(row, col);
        const cellMeta = this.hot.getCellMeta(row, col);
        
        rowData.push(cellData);
        rowFormats.push({
          type: cellMeta.type,
          className: cellMeta.className,
          readOnly: cellMeta.readOnly,
          validator: cellMeta.validator
        });
      }
      
      data.push(rowData);
      formats.push(rowFormats);
    }

    this.clipboard = {
      data,
      range: this.selectedRange,
      timestamp: Date.now()
    };

    // 포맷 정보도 함께 저장
    (this.clipboard as any).formats = formats;

    this.logger.debug('포맷 포함 복사 완료:', this.clipboard);
    this.showClipboardNotification('포맷 포함 복사됨', data.length, data[0]?.length || 0);
  }

  /**
   * 포맷 포함 붙여넣기
   */
  public pasteWithFormat(): void {
    if (!this.clipboard || !this.selectedRange) {
      this.logger.warn('클립보드 데이터 또는 선택된 범위가 없습니다');
      return;
    }

    const { startRow, startCol } = this.selectedRange;
    const { data } = this.clipboard;
    const formats = (this.clipboard as any).formats;

    // 데이터와 포맷 적용
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row) {
        for (let j = 0; j < row.length; j++) {
          const targetRow = startRow + i;
          const targetCol = startCol + j;
          
          if (targetRow < this.hot.countRows() && targetCol < this.hot.countCols()) {
            // 데이터 설정
            this.hot.setDataAtCell(targetRow, targetCol, row[j]);
            
            // 포맷 적용
            if (formats && formats[i] && formats[i][j]) {
              const format = formats[i][j];
              Object.keys(format).forEach(key => {
                this.hot.setCellMeta(targetRow, targetCol, key, format[key]);
              });
            }
          }
        }
      }
    }

    this.hot.render();
    this.logger.debug('포맷 포함 붙여넣기 완료');
    this.showClipboardNotification('포맷 포함 붙여넣기됨', data.length, data[0]?.length || 0);
  }

  /**
   * 선택된 셀 내용 삭제
   */
  public deleteSelectedCells(): void {
    if (!this.selectedRange) {
      this.logger.warn('선택된 범위가 없습니다');
      return;
    }

    const { startRow, startCol, endRow, endCol } = this.selectedRange;
    const changes: any[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        changes.push([row, col, '']);
      }
    }

    this.hot.setDataAtCell(changes);
    this.logger.debug('선택된 셀 내용 삭제됨:', this.selectedRange);
  }

  /**
   * 데이터 타입별 셀 에디터 적용
   */
  public applyCellEditor(row: number, col: number, dataType: DataType): void {
    let editorConfig: any = {};

    switch (dataType) {
      case DataType.TEXT:
        editorConfig = { type: 'text' };
        break;
      case DataType.NUMBER:
        editorConfig = { 
          type: 'numeric',
          numericFormat: { pattern: '0,0.00' }
        };
        break;
      case DataType.BOOLEAN:
        editorConfig = { type: 'checkbox' };
        break;
      case DataType.DATE:
        editorConfig = { 
          type: 'date',
          dateFormat: 'YYYY-MM-DD'
        };
        break;
      case DataType.DROPDOWN:
        editorConfig = { 
          type: 'dropdown',
          source: ['옵션1', '옵션2', '옵션3'] // 실제로는 동적으로 설정
        };
        break;
      case DataType.EMAIL:
        editorConfig = { type: 'email' };
        break;
      case DataType.URL:
        editorConfig = { type: 'url' };
        break;
      default:
        editorConfig = { type: 'text' };
    }

    // 셀 메타데이터 설정
    Object.keys(editorConfig).forEach(key => {
      this.hot.setCellMeta(row, col, key, editorConfig[key]);
    });

    this.hot.render();
  }

  /**
   * 필터 적용
   */
  public applyFilter(condition: FilterCondition): void {
    // 기존 필터에서 같은 컬럼의 필터 제거
    this.activeFilters = this.activeFilters.filter(f => f.column !== condition.column);
    
    // 새 필터 추가
    this.activeFilters.push(condition);

    // 필터 적용
    this.executeFilters();
    
    this.logger.debug('필터 적용됨:', condition);
  }

  /**
   * 필터 실행
   */
  private executeFilters(): void {
    if (this.activeFilters.length === 0) {
      // 모든 행 표시
      this.showAllRows();
      return;
    }

    const totalRows = this.hot.countRows();
    const hiddenRows: number[] = [];

    for (let row = 0; row < totalRows; row++) {
      let shouldHide = false;

      for (const filter of this.activeFilters) {
        const cellValue = this.hot.getDataAtCell(row, filter.column);
        
        if (!this.matchesFilter(cellValue, filter)) {
          shouldHide = true;
          break;
        }
      }

      if (shouldHide) {
        hiddenRows.push(row);
      }
    }

    // 행 숨기기/표시
    this.hot.updateSettings({
      hiddenRows: { rows: hiddenRows }
    });
  }

  /**
   * 필터 조건 매칭 확인
   */
  private matchesFilter(value: any, filter: FilterCondition): boolean {
    const strValue = String(value || '').toLowerCase();
    const filterValue = String(filter.value || '').toLowerCase();

    switch (filter.type) {
      case 'equals':
        return strValue === filterValue;
      case 'contains':
        return strValue.includes(filterValue);
      case 'startsWith':
        return strValue.startsWith(filterValue);
      case 'endsWith':
        return strValue.endsWith(filterValue);
      case 'greaterThan':
        return Number(value) > Number(filter.value);
      case 'lessThan':
        return Number(value) < Number(filter.value);
      case 'between':
        const numValue = Number(value);
        return numValue >= Number(filter.value) && numValue <= Number(filter.value2 || 0);
      case 'empty':
        return !value || String(value).trim() === '';
      case 'notEmpty':
        return value && String(value).trim() !== '';
      default:
        return true;
    }
  }

  /**
   * 모든 행 표시
   */
  private showAllRows(): void {
    this.hot.updateSettings({
      hiddenRows: { rows: [] }
    });
  }

  /**
   * 정렬 적용
   */
  public applySort(condition: SortCondition): void {
    // 기존 정렬에서 같은 컬럼의 정렬 제거
    this.activeSorts = this.activeSorts.filter(s => s.column !== condition.column);
    
    // 새 정렬 추가 (맨 앞에)
    this.activeSorts.unshift(condition);

    // 정렬 실행
    this.executeSort();
    
    this.logger.debug('정렬 적용됨:', condition);
  }

  /**
   * 정렬 실행
   */
  private executeSort(): void {
    if (this.activeSorts.length === 0) return;

    // 다중 컬럼 정렬 설정
    const sortConfig = this.activeSorts.map(sort => ({
      column: sort.column,
      sortOrder: sort.direction
    }));

    this.hot.getPlugin('columnSorting').sort(sortConfig);
  }

  /**
   * 필터 제거
   */
  public removeFilter(column: number): void {
    this.activeFilters = this.activeFilters.filter(f => f.column !== column);
    this.executeFilters();
    this.logger.debug('필터 제거됨:', { column });
  }

  /**
   * 정렬 제거
   */
  public removeSort(column: number): void {
    this.activeSorts = this.activeSorts.filter(s => s.column !== column);
    this.executeSort();
    this.logger.debug('정렬 제거됨:', { column });
  }

  /**
   * 모든 필터 제거
   */
  public clearAllFilters(): void {
    this.activeFilters = [];
    this.showAllRows();
    this.logger.debug('모든 필터 제거됨');
  }

  /**
   * 모든 정렬 제거
   */
  public clearAllSorts(): void {
    this.activeSorts = [];
    this.hot.getPlugin('columnSorting').clearSort();
    this.logger.debug('모든 정렬 제거됨');
  }

  /**
   * 행/열 크기 조정 기능
   */
  public resizeRow(row: number, height: number): void {
    // Handsontable의 행 높이 조정은 updateSettings를 통해 수행
    const rowHeights = this.hot.getSettings().rowHeights || [];
    (rowHeights as any)[row] = height;
    this.hot.updateSettings({ rowHeights });
    this.hot.render();
    this.logger.debug(`행 ${row} 높이 조정: ${height}px`);
  }

  public resizeColumn(col: number, width: number): void {
    // Handsontable의 열 너비 조정은 updateSettings를 통해 수행
    const colWidths = this.hot.getSettings().colWidths || [];
    (colWidths as any)[col] = width;
    this.hot.updateSettings({ colWidths });
    this.hot.render();
    this.logger.debug(`열 ${col} 너비 조정: ${width}px`);
  }

  /**
   * 행/열 고정 기능
   */
  public freezeRows(count: number): void {
    this.hot.updateSettings({
      fixedRowsTop: count
    });
    this.logger.debug(`상단 ${count}개 행 고정됨`);
  }

  public freezeColumns(count: number): void {
    this.hot.updateSettings({
      fixedColumnsLeft: count
    });
    this.logger.debug(`좌측 ${count}개 열 고정됨`);
  }

  /**
   * 클립보드 알림 표시
   */
  private showClipboardNotification(action: string, rows: number, cols: number): void {
    // 실제 구현에서는 UI 알림 시스템 사용
    console.log(`${action}: ${rows}행 × ${cols}열`);
  }

  /**
   * 붙여넣기된 데이터 검증
   */
  private validatePastedData(coords: any): void {
    // 실제 구현에서는 GridValidationService 사용
    this.logger.debug('붙여넣기된 데이터 검증 시작:', coords);
  }

  /**
   * 현재 선택된 범위 반환
   */
  public getSelectedRange(): CellRange | null {
    return this.selectedRange;
  }

  /**
   * 활성 필터 목록 반환
   */
  public getActiveFilters(): FilterCondition[] {
    return [...this.activeFilters];
  }

  /**
   * 활성 정렬 목록 반환
   */
  public getActiveSorts(): SortCondition[] {
    return [...this.activeSorts];
  }

  /**
   * 클립보드 데이터 반환
   */
  public getClipboardData(): ClipboardData | null {
    return this.clipboard;
  }
}