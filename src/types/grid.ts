/**
 * 그리드 컴포넌트 관련 타입 정의
 */

// 데이터 타입 열거형
export enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage'
}

// 검증 규칙 인터페이스
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

// 그리드 컬럼 정의
export interface GridColumn {
  id: string;
  title: string;
  type: DataType;
  validation?: ValidationRule[];
  width?: number;
  readOnly?: boolean;
  source?: string[]; // 드롭다운 옵션
  format?: string; // 날짜/숫자 포맷
  defaultValue?: any;
}

// 스키마 그리드 데이터 모델
export interface SchemaGridData {
  fieldName: string;
  dataType: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  constraints?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enumValues?: string[];
}

// 구조 변경 타입
export interface StructureChange {
  type: 'insert_row' | 'remove_row' | 'insert_col' | 'remove_col' | 'move_row' | 'move_col';
  index: number;
  amount?: number;
  data?: any[];
}

// 셀 변경 이벤트
export interface CellChangeEvent {
  row: number;
  col: number;
  oldValue: any;
  newValue: any;
  source: string;
}

// 그리드 컴포넌트 속성
export interface GridComponentProps {
  data: SchemaGridData[][];
  columns: GridColumn[];
  onCellChange: (changes: CellChangeEvent[]) => void;
  onStructureChange: (changes: StructureChange[]) => void;
  readOnly?: boolean;
  collaborationMode?: boolean;
  height?: number;
  width?: number;
  licenseKey?: string;
}

// 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  row: number;
  col: number;
  message: string;
  type: string;
  value: any;
}

export interface ValidationWarning {
  row: number;
  col: number;
  message: string;
  type: string;
  value: any;
}

// 그리드 메타데이터
export interface GridMetadata {
  columns: GridColumn[];
  rowCount: number;
  columnCount: number;
  customTypes: CustomDataType[];
  constraints: GlobalConstraint[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// 커스텀 데이터 타입
export interface CustomDataType {
  name: string;
  baseType: DataType;
  validation: ValidationRule[];
  displayFormat?: string;
  description?: string;
}

// 전역 제약 조건
export interface GlobalConstraint {
  id: string;
  name: string;
  description: string;
  rule: string;
  columns: string[];
  enabled: boolean;
}

// 그리드 설정
export interface GridSettings {
  rowHeaders: boolean;
  colHeaders: boolean;
  contextMenu: boolean;
  manualRowResize: boolean;
  manualColumnResize: boolean;
  manualRowMove: boolean;
  manualColumnMove: boolean;
  copyPaste: boolean;
  fillHandle: boolean;
  autoWrapRow: boolean;
  autoWrapCol: boolean;
  minRows: number;
  minCols: number;
  maxRows?: number;
  maxCols?: number;
  stretchH: 'none' | 'last' | 'all';
  columnSorting: boolean;
  filters: boolean;
  dropdownMenu: boolean;
}

// 그리드 이벤트 핸들러
export interface GridEventHandlers {
  afterChange?: (changes: any[], source: string) => void;
  afterCreateRow?: (index: number, amount: number, source?: string) => void;
  afterRemoveRow?: (index: number, amount: number, physicalRows: number[], source?: string) => void;
  afterCreateCol?: (index: number, amount: number, source?: string) => void;
  afterRemoveCol?: (index: number, amount: number, physicalColumns: number[], source?: string) => void;
  beforeValidate?: (value: any, row: number, prop: string | number, source?: string) => boolean | void;
  afterValidate?: (isValid: boolean, value: any, row: number, prop: string | number, source?: string) => boolean | void;
  afterSelection?: (row: number, column: number, row2: number, column2: number, preventScrolling: object, selectionLayerLevel: number) => void;
}

// 고급 기능 관련 타입들
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ClipboardData {
  data: any[][];
  range: CellRange;
  timestamp: number;
  formats?: CellFormat[][];
}

export interface CellFormat {
  type?: string;
  className?: string;
  readOnly?: boolean;
  validator?: Function;
  renderer?: Function;
  editor?: string;
}

export interface FilterCondition {
  column: number;
  type: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'empty' | 'notEmpty';
  value: any;
  value2?: any;
}

export interface SortCondition {
  column: number;
  direction: 'asc' | 'desc';
}

export interface CellEditor {
  type: DataType;
  config?: any;
  validator?: (value: any) => boolean;
  formatter?: (value: any) => string;
}

export interface AdvancedGridFeatures {
  rangeSelection: boolean;
  clipboardOperations: boolean;
  advancedEditors: boolean;
  filtering: boolean;
  sorting: boolean;
  freezePanes: boolean;
  resizing: boolean;
  keyboardShortcuts: boolean;
}