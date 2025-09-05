// 스키마 관련 타입 정의

export enum SchemaFormat {
  XML = 'xml',
  JSON = 'json',
  YAML = 'yaml',
  XSD = 'xsd',
  WSDL = 'wsdl'
}

export interface Schema {
  id: string;
  name: string;
  description?: string;
  format: SchemaFormat;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  originalContent: string;
  gridData?: SchemaGridData[][];
  gridMetadata?: GridMetadata;
  collaborationSession?: string;
  lastValidation?: ValidationResult;
}

export interface SchemaGridData {
  fieldName: string;
  dataType: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  constraints?: string;
}

export interface GridMetadata {
  columns: GridColumn[];
  rowCount: number;
  columnCount: number;
  customTypes: CustomDataType[];
  constraints: GlobalConstraint[];
}

export interface GridColumn {
  id: string;
  title: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'dropdown';
  validation?: ValidationRule[];
  width?: number;
}

export interface CustomDataType {
  name: string;
  baseType: string;
  validation: ValidationRule[];
  displayFormat?: string;
}

export interface GlobalConstraint {
  id: string;
  name: string;
  rule: string;
  errorMessage: string;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ConversionResult {
  xml?: string;
  json?: string;
  yaml?: string;
  errors: ConversionError[];
  warnings: ConversionWarning[];
}

export interface ConversionError {
  message: string;
  code: string;
  sourceFormat: SchemaFormat;
  targetFormat: SchemaFormat;
  line?: number;
  column?: number;
}

export interface ConversionWarning {
  message: string;
  code: string;
  details?: any;
}