/**
 * API v2 타입 정의
 * RESTful API v2 엔드포인트를 위한 요청/응답 타입들
 */

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        name?: string;
        email?: string;
        roles?: string[];
        permissions?: string[];
        role?: string;
        tier?: string;
      };
    }
  }
}

// 공통 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

export interface ResponseMeta {
  version: string;
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 스키마 관련 타입
export interface CreateSchemaRequest {
  name: string;
  description?: string;
  format: 'xml' | 'json' | 'yaml' | 'xsd' | 'wsdl';
  content: string;
  tags?: string[];
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  content?: string;
  tags?: string[];
}

export interface SchemaResponse {
  id: string;
  name: string;
  description?: string;
  format: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  size: number;
  isValid: boolean;
  lastValidation?: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: string;
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

// 그리드 관련 타입
export interface ConvertToGridRequest {
  format: 'xml' | 'json' | 'yaml';
  content: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  preserveComments?: boolean;
  includeMetadata?: boolean;
  maxDepth?: number;
  arrayHandling?: 'flatten' | 'preserve';
}

export interface UpdateGridRequest {
  gridData: GridCellData[][];
  metadata?: GridMetadata;
}

export interface GridCellData {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  validation?: CellValidation;
  formatting?: CellFormatting;
}

export interface CellValidation {
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface CellFormatting {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

export interface GridMetadata {
  columns: GridColumnDefinition[];
  rowCount: number;
  columnCount: number;
  customTypes?: CustomDataType[];
  constraints?: GlobalConstraint[];
}

export interface GridColumnDefinition {
  id: string;
  title: string;
  type: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  validation?: CellValidation;
}

export interface CustomDataType {
  name: string;
  baseType: string;
  validation: CellValidation[];
  displayFormat?: string;
}

export interface GlobalConstraint {
  type: 'unique' | 'foreign_key' | 'check';
  columns: string[];
  reference?: string;
  condition?: string;
}

export interface ExportSchemaRequest {
  format: 'xml' | 'json' | 'yaml';
  options?: ExportOptions;
}

export interface ExportOptions {
  pretty?: boolean;
  includeComments?: boolean;
  includeMetadata?: boolean;
  encoding?: 'utf-8' | 'utf-16' | 'ascii';
}

// 협업 관련 타입
export interface CreateSessionRequest {
  schemaId: string;
  name?: string;
  description?: string;
  permissions?: SessionPermissions;
  expiresAt?: string;
}

export interface SessionPermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  share: boolean;
  admin: boolean;
}

export interface SessionResponse {
  id: string;
  schemaId: string;
  name?: string;
  description?: string;
  createdAt: string;
  expiresAt?: string;
  activeUsers: ActiveUser[];
  permissions: SessionPermissions;
  status: 'active' | 'inactive' | 'expired';
}

export interface ActiveUser {
  id: string;
  name: string;
  email?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  color: string;
  lastActivity: string;
  permissions: SessionPermissions;
}

export interface CursorPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// 검색 및 필터링
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export interface SearchFilters {
  format?: string[];
  tags?: string[];
  createdBy?: string[];
  dateRange?: DateRange;
  size?: SizeRange;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface SizeRange {
  min: number;
  max: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// 배치 작업
export interface BatchRequest<T> {
  operations: BatchOperation<T>[];
  options?: BatchOptions;
}

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  id?: string;
  data: T;
}

export interface BatchOptions {
  continueOnError?: boolean;
  maxConcurrency?: number;
  timeout?: number;
}

export interface BatchResponse<T> {
  results: BatchResult<T>[];
  summary: BatchSummary;
}

export interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  operation: string;
  id?: string;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  duration: number;
}

// 버전 관리
export interface VersionInfo {
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  supportedUntil?: string;
  migrationGuide?: string;
}

export interface ApiVersionResponse {
  current: string;
  supported: string[];
  versions: Record<string, VersionInfo>;
}