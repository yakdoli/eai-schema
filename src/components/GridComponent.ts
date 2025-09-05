/**
 * Handsontable 기반 그리드 컴포넌트
 * 엑셀라이크 인터페이스 제공
 */

import Handsontable from 'handsontable';
import {
  GridComponentProps,
  GridColumn,
  SchemaGridData,
  CellChangeEvent,
  StructureChange,
  ValidationResult,
  DataType,
  CellRange,
  FilterCondition,
  SortCondition
} from '../types/grid';
import { GridValidationService } from '../services/GridValidationService';
import { GridAdvancedFeatures } from '../services/GridAdvancedFeatures';
import { GridAdvancedUI } from './GridAdvancedUI';
import { Logger } from '../core/logging/Logger';

export class GridComponent {
  private hot: Handsontable | null = null;
  private container: HTMLElement;
  private validationService: GridValidationService;
  private advancedFeatures: GridAdvancedFeatures | null = null;
  private advancedUI: GridAdvancedUI | null = null;
  private logger: Logger;
  private props: GridComponentProps;
  private validationResults: Map<string, ValidationResult> = new Map();

  constructor(container: HTMLElement, props: GridComponentProps) {
    this.container = container;
    this.props = props;
    this.validationService = new GridValidationService();
    this.logger = new Logger('GridComponent');
    
    this.initialize();
  }

  /**
   * 그리드 초기화
   */
  private initialize(): void {
    try {
      const settings = this.createHandsontableSettings();
      this.hot = new Handsontable(this.container, settings);
      
      // 고급 기능 초기화
      this.advancedFeatures = new GridAdvancedFeatures(this.hot);
      this.advancedUI = new GridAdvancedUI(this);
      
      this.logger.info('그리드 컴포넌트가 성공적으로 초기화되었습니다.');
    } catch (error) {
      this.logger.error('그리드 초기화 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Handsontable 설정 생성
   */
  private createHandsontableSettings(): Handsontable.GridSettings {
    const data = this.convertDataForHandsontable();
    const columns = this.createColumnSettings();

    return {
      data,
      columns,
      rowHeaders: true,
      colHeaders: this.props.columns.map(col => col.title),
      contextMenu: !this.props.readOnly,
      manualRowResize: true,
      manualColumnResize: true,
      manualRowMove: !this.props.readOnly,
      manualColumnMove: !this.props.readOnly,
      copyPaste: !this.props.readOnly,
      fillHandle: !this.props.readOnly ? 'vertical' : false,
      autoWrapRow: true,
      autoWrapCol: true,
      minRows: 10,
      minCols: this.props.columns.length,
      stretchH: 'all',
      columnSorting: true,
      filters: true,
      dropdownMenu: true,
      readOnly: this.props.readOnly || false,
      height: this.props.height || 400,
      width: this.props.width || '100%',
      licenseKey: this.props.licenseKey || 'non-commercial-and-evaluation',
      
      // 이벤트 핸들러
      afterChange: this.handleAfterChange.bind(this),
      afterCreateRow: this.handleAfterCreateRow.bind(this),
      afterRemoveRow: this.handleAfterRemoveRow.bind(this),
      afterCreateCol: this.handleAfterCreateCol.bind(this),
      afterRemoveCol: this.handleAfterRemoveCol.bind(this),
      beforeValidate: this.handleBeforeValidate.bind(this),
      afterValidate: this.handleAfterValidate.bind(this),
      afterSelection: this.handleAfterSelection.bind(this),

      // 셀 렌더러 설정
      cells: this.createCellRenderer.bind(this)
    };
  }

  /**
   * 데이터를 Handsontable 형식으로 변환
   */
  private convertDataForHandsontable(): any[][] {
    return this.props.data.map(row => 
      this.props.columns.map((col, colIndex) => {
        const cellData = row[colIndex];
        if (!cellData) {return '';}
        
        switch (col.id) {
          case 'fieldName':
            return cellData.fieldName || '';
          case 'dataType':
            return cellData.dataType || '';
          case 'required':
            return cellData.required || false;
          case 'description':
            return cellData.description || '';
          case 'defaultValue':
            return cellData.defaultValue || '';
          case 'constraints':
            return cellData.constraints || '';
          default:
            return cellData || '';
        }
      })
    );
  }

  /**
   * 컬럼 설정 생성
   */
  private createColumnSettings(): Handsontable.ColumnSettings[] {
    return this.props.columns.map(col => {
      const columnSetting: Handsontable.ColumnSettings = {
        data: col.id,
        width: col.width || 120,
        readOnly: col.readOnly || false
      };

      // 데이터 타입에 따른 에디터 설정
      switch (col.type) {
        case DataType.TEXT:
          columnSetting.type = 'text';
          break;
        case DataType.NUMBER:
          columnSetting.type = 'numeric';
          columnSetting.numericFormat = {
            pattern: '0,0.00'
          };
          break;
        case DataType.BOOLEAN:
          columnSetting.type = 'checkbox';
          break;
        case DataType.DATE:
          columnSetting.type = 'date';
          columnSetting.dateFormat = 'YYYY-MM-DD';
          break;
        case DataType.DROPDOWN:
          columnSetting.type = 'dropdown';
          columnSetting.source = col.source || [];
          break;
        default:
          columnSetting.type = 'text';
      }

      return columnSetting;
    });
  }

  /**
   * 셀 렌더러 생성
   */
  private createCellRenderer(row: number, col: number): Handsontable.CellProperties {
    const cellProperties: Handsontable.CellProperties = {};
    
    // 검증 결과에 따른 스타일 적용
    const cellKey = `${row}-${col}`;
    const validationResult = this.validationResults.get(cellKey);
    
    if (validationResult && !validationResult.isValid) {
      if (validationResult.errors.length > 0) {
        cellProperties.className = 'cell-error';
      } else if (validationResult.warnings.length > 0) {
        cellProperties.className = 'cell-warning';
      }
    }

    // 협업 모드에서 다른 사용자의 편집 표시
    if (this.props.collaborationMode) {
      // TODO: 협업 기능 구현 시 추가
    }

    return cellProperties;
  }

  /**
   * 셀 변경 이벤트 핸들러
   */
  private handleAfterChange(changes: [number, string | number, any, any][] | null, source: string): void {
    if (!changes || source === 'loadData') {return;}

    const cellChanges: CellChangeEvent[] = changes.map(([row, prop, oldValue, newValue]) => ({
      row,
      col: typeof prop === 'string' ? this.getColumnIndex(prop) : prop,
      oldValue,
      newValue,
      source
    }));

    // 실시간 검증 수행
    this.validateChangedCells(cellChanges);

    // 부모 컴포넌트에 변경 사항 알림
    this.props.onCellChange(cellChanges);
  }

  /**
   * 행 추가 이벤트 핸들러
   */
  private handleAfterCreateRow(index: number, amount: number, _source?: string): void {
    const change: StructureChange = {
      type: 'insert_row',
      index,
      amount
    };

    this.props.onStructureChange([change]);
  }

  /**
   * 행 삭제 이벤트 핸들러
   */
  private handleAfterRemoveRow(index: number, amount: number, _physicalRows: number[], _source?: string): void {
    const change: StructureChange = {
      type: 'remove_row',
      index,
      amount
    };

    this.props.onStructureChange([change]);
  }

  /**
   * 열 추가 이벤트 핸들러
   */
  private handleAfterCreateCol(index: number, amount: number, _source?: string): void {
    const change: StructureChange = {
      type: 'insert_col',
      index,
      amount
    };

    this.props.onStructureChange([change]);
  }

  /**
   * 열 삭제 이벤트 핸들러
   */
  private handleAfterRemoveCol(index: number, amount: number, _physicalColumns: number[], _source?: string): void {
    const change: StructureChange = {
      type: 'remove_col',
      index,
      amount
    };

    this.props.onStructureChange([change]);
  }

  /**
   * 검증 전 이벤트 핸들러
   */
  private handleBeforeValidate(_value: any, _row: number, _prop: string | number, _source?: string): boolean | void {
    // 커스텀 검증 로직 적용 가능
    return true;
  }

  /**
   * 검증 후 이벤트 핸들러
   */
  private handleAfterValidate(isValid: boolean, value: any, _row: number, prop: string | number, _source?: string): boolean | void {
    const col = typeof prop === 'string' ? this.getColumnIndex(prop) : prop;
    const column = this.props.columns[col];
    
    if (column) {
      const validationResult = this.validationService.validateCell(value, column, row, col);
      const cellKey = `${row}-${col}`;
      this.validationResults.set(cellKey, validationResult);
      
      // 셀 스타일 업데이트
      this.updateCellStyle(row, col, validationResult);
    }

    return isValid;
  }

  /**
   * 선택 영역 변경 이벤트 핸들러
   */
  private handleAfterSelection(_row: number, _column: number, _row2: number, _column2: number): void {
    // 협업 모드에서 선택 영역 동기화
    if (this.props.collaborationMode) {
      // TODO: 협업 기능 구현 시 추가
    }
  }

  /**
   * 변경된 셀들에 대한 검증 수행
   */
  private validateChangedCells(changes: CellChangeEvent[]): void {
    changes.forEach(change => {
      const column = this.props.columns[change.col];
      if (column) {
        this.validationService.validateCellRealtime(
          change.newValue,
          column,
          change.row,
          change.col,
          (result) => {
            const cellKey = `${change.row}-${change.col}`;
            this.validationResults.set(cellKey, result);
            this.updateCellStyle(change.row, change.col, result);
          }
        );
      }
    });
  }

  /**
   * 셀 스타일 업데이트
   */
  private updateCellStyle(row: number, col: number, validationResult: ValidationResult): void {
    if (!this.hot) {return;}

    let className = '';
    if (!validationResult.isValid) {
      if (validationResult.errors.length > 0) {
        className = 'cell-error';
      } else if (validationResult.warnings.length > 0) {
        className = 'cell-warning';
      }
    }

    this.hot.setCellMeta(row, col, 'className', className);
    this.hot.render();
  }

  /**
   * 컬럼 ID로 인덱스 찾기
   */
  private getColumnIndex(columnId: string): number {
    return this.props.columns.findIndex(col => col.id === columnId);
  }

  /**
   * 데이터 업데이트
   */
  public updateData(data: SchemaGridData[][]): void {
    if (!this.hot) {return;}

    const handsontableData = this.convertDataForHandsontable();
    this.hot.loadData(handsontableData);
    this.props.data = data;
  }

  /**
   * 컬럼 설정 업데이트
   */
  public updateColumns(columns: GridColumn[]): void {
    if (!this.hot) {return;}

    this.props.columns = columns;
    const columnSettings = this.createColumnSettings();
    this.hot.updateSettings({
      columns: columnSettings,
      colHeaders: columns.map(col => col.title)
    });
  }

  /**
   * 전체 그리드 검증
   */
  public validateAll(): ValidationResult {
    return this.validationService.validateGrid(this.props.data, this.props.columns);
  }

  /**
   * 현재 데이터 가져오기
   */
  public getData(): any[][] {
    return this.hot?.getData() || [];
  }

  /**
   * 선택된 영역 데이터 가져오기
   */
  public getSelectedData(): any[][] {
    return this.hot?.getSelected() ? this.hot.getDataAtRange(this.hot.getSelected()[0]) : [];
  }

  /**
   * 행 추가
   */
  public addRow(index?: number): void {
    if (!this.hot || this.props.readOnly) {return;}
    
    const insertIndex = index !== undefined ? index : this.hot.countRows();
    this.hot.alter('insert_row_above', insertIndex);
  }

  /**
   * 행 삭제
   */
  public removeRow(index: number): void {
    if (!this.hot || this.props.readOnly) {return;}
    
    this.hot.alter('remove_row', index);
  }

  /**
   * 열 추가
   */
  public addColumn(index?: number): void {
    if (!this.hot || this.props.readOnly) {return;}
    
    const insertIndex = index !== undefined ? index : this.hot.countCols();
    this.hot.alter('insert_col_start', insertIndex);
  }

  /**
   * 열 삭제
   */
  public removeColumn(index: number): void {
    if (!this.hot || this.props.readOnly) {return;}
    
    this.hot.alter('remove_col', index);
  }

  /**
   * 그리드 새로고침
   */
  public refresh(): void {
    if (!this.hot) {return;}
    
    this.hot.render();
  }

  /**
   * 그리드 파괴
   */
  public destroy(): void {
    if (this.hot) {
      this.hot.destroy();
      this.hot = null;
    }
    
    if (this.advancedUI) {
      this.advancedUI.destroy();
      this.advancedUI = null;
    }
    
    this.validationResults.clear();
    this.logger.info('그리드 컴포넌트가 파괴되었습니다.');
  }

  /**
   * 검증 결과 가져오기
   */
  public getValidationResults(): Map<string, ValidationResult> {
    return new Map(this.validationResults);
  }

  /**
   * 오류가 있는 셀 하이라이트
   */
  public highlightErrors(): void {
    if (!this.hot) {return;}

    this.validationResults.forEach((result, cellKey) => {
      if (!result.isValid && result.errors.length > 0) {
        const [row, col] = cellKey.split('-').map(Number);
        this.hot!.setCellMeta(row, col, 'className', 'cell-error');
      }
    });

    this.hot.render();
  }

  /**
   * 경고가 있는 셀 하이라이트
   */
  public highlightWarnings(): void {
    if (!this.hot) {return;}

    this.validationResults.forEach((result, cellKey) => {
      if (result.warnings.length > 0) {
        const [row, col] = cellKey.split('-').map(Number);
        this.hot!.setCellMeta(row, col, 'className', 'cell-warning');
      }
    });

    this.hot.render();
  }

  // ===== 고급 기능 메서드들 =====

  /**
   * 셀 범위 선택
   */
  public selectRange(startRow: number, startCol: number, endRow: number, endCol: number): void {
    if (!this.hot) {return;}
    this.hot.selectCell(startRow, startCol, endRow, endCol);
  }

  /**
   * 현재 선택된 범위 가져오기
   */
  public getSelectedRange(): CellRange | null {
    return this.advancedFeatures?.getSelectedRange() || null;
  }

  /**
   * 선택된 데이터 복사 (고급)
   */
  public copyWithFormat(): void {
    this.advancedFeatures?.copyWithFormat();
  }

  /**
   * 포맷 포함 붙여넣기
   */
  public pasteWithFormat(): void {
    this.advancedFeatures?.pasteWithFormat();
  }

  /**
   * 선택된 셀 내용 삭제
   */
  public deleteSelectedCells(): void {
    this.advancedFeatures?.deleteSelectedCells();
  }

  /**
   * 전체 선택
   */
  public selectAll(): void {
    this.advancedFeatures?.selectAll();
  }

  /**
   * 데이터 타입별 셀 에디터 적용
   */
  public applyCellEditor(row: number, col: number, dataType: DataType): void {
    this.advancedFeatures?.applyCellEditor(row, col, dataType);
  }

  /**
   * 필터 적용
   */
  public applyFilter(condition: FilterCondition): void {
    this.advancedFeatures?.applyFilter(condition);
  }

  /**
   * 정렬 적용
   */
  public applySort(condition: SortCondition): void {
    this.advancedFeatures?.applySort(condition);
  }

  /**
   * 필터 제거
   */
  public removeFilter(column: number): void {
    this.advancedFeatures?.removeFilter(column);
  }

  /**
   * 정렬 제거
   */
  public removeSort(column: number): void {
    this.advancedFeatures?.removeSort(column);
  }

  /**
   * 모든 필터 제거
   */
  public clearAllFilters(): void {
    this.advancedFeatures?.clearAllFilters();
  }

  /**
   * 모든 정렬 제거
   */
  public clearAllSorts(): void {
    this.advancedFeatures?.clearAllSorts();
  }

  /**
   * 행 크기 조정
   */
  public resizeRow(row: number, height: number): void {
    this.advancedFeatures?.resizeRow(row, height);
  }

  /**
   * 열 크기 조정
   */
  public resizeColumn(col: number, width: number): void {
    this.advancedFeatures?.resizeColumn(col, width);
  }

  /**
   * 행 고정
   */
  public freezeRows(count: number): void {
    this.advancedFeatures?.freezeRows(count);
  }

  /**
   * 열 고정
   */
  public freezeColumns(count: number): void {
    this.advancedFeatures?.freezeColumns(count);
  }

  /**
   * 활성 필터 목록 가져오기
   */
  public getActiveFilters(): FilterCondition[] {
    return this.advancedFeatures?.getActiveFilters() || [];
  }

  /**
   * 활성 정렬 목록 가져오기
   */
  public getActiveSorts(): SortCondition[] {
    return this.advancedFeatures?.getActiveSorts() || [];
  }

  /**
   * 클립보드 데이터 가져오기
   */
  public getClipboardData(): any {
    return this.advancedFeatures?.getClipboardData() || null;
  }

  /**
   * 고급 검증 수행
   */
  public validateCellRealtime(row: number, col: number, value: any): void {
    const column = this.props.columns[col];
    if (column) {
      this.validationService.validateCellRealtime(
        value,
        column,
        row,
        col,
        (result) => {
          const cellKey = `${row}-${col}`;
          this.validationResults.set(cellKey, result);
          this.updateCellStyle(row, col, result);
        }
      );
    }
  }

  /**
   * 셀 포맷 설정
   */
  public setCellFormat(row: number, col: number, format: any): void {
    if (!this.hot) {return;}

    Object.keys(format).forEach(key => {
      this.hot!.setCellMeta(row, col, key, format[key]);
    });

    this.hot.render();
  }

  /**
   * 셀 포맷 가져오기
   */
  public getCellFormat(row: number, col: number): any {
    if (!this.hot) {return {};}

    const cellMeta = this.hot.getCellMeta(row, col);
    return {
      type: cellMeta.type,
      className: cellMeta.className,
      readOnly: cellMeta.readOnly,
      validator: cellMeta.validator,
      renderer: cellMeta.renderer,
      editor: cellMeta.editor
    };
  }

  /**
   * 필터 패널 표시
   */
  public showFilterPanel(column: number, x?: number, y?: number): void {
    if (!this.advancedUI) {return;}

    // 좌표가 제공되지 않으면 컬럼 헤더 위치 계산
    if (x === undefined || y === undefined) {
      const containerRect = this.container.getBoundingClientRect();
      x = containerRect.left + (column * 120); // 기본 컬럼 너비
      y = containerRect.top + 30; // 헤더 높이
    }

    this.advancedUI.showFilterPanel(column, x, y);
  }

  /**
   * 키보드 단축키 도움말 표시
   */
  public showKeyboardShortcuts(): void {
    this.advancedUI?.showShortcutsHelp();
  }

  /**
   * 클립보드 피드백 표시
   */
  public showFeedback(message: string, duration?: number): void {
    this.advancedUI?.showClipboardFeedback(message, duration);
  }

  /**
   * 고급 컨텍스트 메뉴 표시
   */
  public showAdvancedContextMenu(x: number, y: number, row: number, col: number): HTMLElement | null {
    return this.advancedUI?.createAdvancedContextMenu(x, y, row, col) || null;
  }

  /**
   * 컬럼별 정렬 적용
   */
  public sortByColumn(column: number): void {
    this.advancedUI?.applySortByColumn(column);
  }

  /**
   * 데이터 타입 자동 감지 및 적용
   */
  public autoDetectDataTypes(): void {
    if (!this.hot) {return;}

    const data = this.hot.getData();
    const columns = this.props.columns;

    for (let col = 0; col < columns.length; col++) {
      const columnData = data.map(row => row[col]).filter(value => value !== null && value !== undefined && value !== '');
      
      if (columnData.length === 0) {continue;}

      const detectedType = this.detectDataType(columnData);
      
      if (detectedType !== columns[col].type) {
        columns[col].type = detectedType;
        
        // 컬럼의 모든 셀에 새 타입 적용
        for (let row = 0; row < data.length; row++) {
          this.applyCellEditor(row, col, detectedType);
        }
      }
    }

    this.logger.info('데이터 타입 자동 감지 완료');
    this.showFeedback('데이터 타입이 자동으로 감지되었습니다.');
  }

  /**
   * 데이터 타입 감지
   */
  private detectDataType(values: any[]): DataType {
    const sampleSize = Math.min(values.length, 10);
    const samples = values.slice(0, sampleSize);

    // 불린 타입 체크
    if (samples.every(val => typeof val === 'boolean' || ['true', 'false', '1', '0'].includes(String(val).toLowerCase()))) {
      return DataType.BOOLEAN;
    }

    // 숫자 타입 체크
    if (samples.every(val => !isNaN(Number(val)) && isFinite(Number(val)))) {
      return DataType.NUMBER;
    }

    // 날짜 타입 체크
    if (samples.every(val => !isNaN(Date.parse(String(val))))) {
      return DataType.DATE;
    }

    // 이메일 타입 체크
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (samples.every(val => emailRegex.test(String(val)))) {
      return DataType.EMAIL;
    }

    // URL 타입 체크
    if (samples.every(val => {
      try {
        new URL(String(val));
        return true;
      } catch {
        return false;
      }
    })) {
      return DataType.URL;
    }

    // 기본값: 텍스트
    return DataType.TEXT;
  }

  /**
   * 셀 수준 검증 규칙 설정
   */
  public setCellValidationRule(row: number, col: number, validator: (value: any) => boolean, message: string): void {
    if (!this.hot) {return;}

    this.hot.setCellMeta(row, col, 'validator', (value: any, callback: (valid: boolean) => void) => {
      const isValid = validator(value);
      if (!isValid) {
        this.hot!.setCellMeta(row, col, 'className', 'cell-error');
        this.showFeedback(message);
      } else {
        const currentClassName = this.hot!.getCellMeta(row, col).className || '';
        const newClassName = currentClassName.replace(/\s*cell-error\s*/g, '').trim();
        this.hot!.setCellMeta(row, col, 'className', newClassName);
      }
      callback(isValid);
    });

    this.logger.debug(`셀 검증 규칙 설정: (${row}, ${col})`);
  }

  /**
   * 조건부 포맷팅 적용
   */
  public applyConditionalFormatting(condition: (value: any, row: number, col: number) => boolean, className: string): void {
    if (!this.hot) {return;}

    const data = this.hot.getData();
    
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const value = data[row][col];
        
        if (condition(value, row, col)) {
          const currentClassName = this.hot.getCellMeta(row, col).className || '';
          const newClassName = `${currentClassName} ${className}`.trim();
          this.hot.setCellMeta(row, col, 'className', newClassName);
        }
      }
    }

    this.hot.render();
    this.logger.debug('조건부 포맷팅 적용됨');
  }

  /**
   * 데이터 검증 통계 가져오기
   */
  public getValidationStats(): {
    totalCells: number;
    validCells: number;
    errorCells: number;
    warningCells: number;
    validationRate: number;
  } {
    const totalCells = this.validationResults.size;
    let validCells = 0;
    let errorCells = 0;
    let warningCells = 0;

    this.validationResults.forEach(result => {
      if (result.isValid) {
        validCells++;
      } else {
        if (result.errors.length > 0) {
          errorCells++;
        }
        if (result.warnings.length > 0) {
          warningCells++;
        }
      }
    });

    return {
      totalCells,
      validCells,
      errorCells,
      warningCells,
      validationRate: totalCells > 0 ? (validCells / totalCells) * 100 : 100
    };
  }

  /**
   * 그리드 성능 최적화
   */
  public optimizePerformance(): void {
    if (!this.hot) {return;}

    // 가상화 활성화 (대용량 데이터용)
    this.hot.updateSettings({
      renderAllRows: false,
      viewportRowRenderingOffset: 'auto',
      viewportColumnRenderingOffset: 'auto'
    });

    this.logger.info('그리드 성능 최적화 적용됨');
  }
}