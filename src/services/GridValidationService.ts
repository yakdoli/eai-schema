/**
 * 그리드 데이터 검증 서비스
 * 실시간 검증 및 오류 표시 기능 제공
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaGridData,
  GridColumn,
  DataType
} from '../types/grid';
import { Logger } from '../core/logging/Logger';

export class GridValidationService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('GridValidationService');
  }

  /**
   * 전체 그리드 데이터 검증
   */
  public validateGrid(data: SchemaGridData[][], columns: GridColumn[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // 각 행과 열에 대해 검증 수행
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < columns.length; col++) {
          const cellValue = data[row]?.[col];
          const column = columns[col];
          
          if (column && cellValue !== undefined) {
            const cellValidation = this.validateCell(cellValue, column, row, col);
            errors.push(...cellValidation.errors);
            warnings.push(...cellValidation.warnings);
          }
        }
      }

      // 전역 제약 조건 검증
      const globalValidation = this.validateGlobalConstraints(data, columns);
      errors.push(...globalValidation.errors);
      warnings.push(...globalValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('그리드 검증 중 오류 발생:', error);
      return {
        isValid: false,
        errors: [{
          row: -1,
          col: -1,
          message: '검증 중 시스템 오류가 발생했습니다.',
          type: 'system_error',
          value: null
        }],
        warnings: []
      };
    }
  }

  /**
   * 단일 셀 검증
   */
  public validateCell(value: any, column: GridColumn, row: number, col: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // 데이터 타입 검증
      const typeValidation = this.validateDataType(value, column.type, row, col);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
      }

      // 커스텀 검증 규칙 적용
      if (column.validation) {
        for (const rule of column.validation) {
          const ruleValidation = this.validateRule(value, rule, row, col);
          if (!ruleValidation.isValid) {
            if (rule.type === 'required') {
              errors.push(...ruleValidation.errors);
            } else {
              warnings.push(...ruleValidation.warnings);
            }
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error(`셀 검증 중 오류 발생 (${row}, ${col}):`, error);
      return {
        isValid: false,
        errors: [{
          row,
          col,
          message: '셀 검증 중 오류가 발생했습니다.',
          type: 'validation_error',
          value
        }],
        warnings: []
      };
    }
  }

  /**
   * 데이터 타입 검증
   */
  private validateDataType(value: any, dataType: DataType, row: number, col: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined || value === '') {
      return { isValid: true, errors: [], warnings: [] };
    }

    switch (dataType) {
      case DataType.TEXT:
        if (typeof value !== 'string') {
          errors.push({
            row,
            col,
            message: '텍스트 형식이어야 합니다.',
            type: 'type_mismatch',
            value
          });
        }
        break;

      case DataType.NUMBER:
        if (isNaN(Number(value))) {
          errors.push({
            row,
            col,
            message: '숫자 형식이어야 합니다.',
            type: 'type_mismatch',
            value
          });
        }
        break;

      case DataType.BOOLEAN:
        if (typeof value !== 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
          errors.push({
            row,
            col,
            message: '불린 형식이어야 합니다 (true/false).',
            type: 'type_mismatch',
            value
          });
        }
        break;

      case DataType.DATE:
        if (!this.isValidDate(value)) {
          errors.push({
            row,
            col,
            message: '유효한 날짜 형식이어야 합니다.',
            type: 'type_mismatch',
            value
          });
        }
        break;

      case DataType.EMAIL:
        if (!this.isValidEmail(String(value))) {
          errors.push({
            row,
            col,
            message: '유효한 이메일 형식이어야 합니다.',
            type: 'type_mismatch',
            value
          });
        }
        break;

      case DataType.URL:
        if (!this.isValidUrl(String(value))) {
          errors.push({
            row,
            col,
            message: '유효한 URL 형식이어야 합니다.',
            type: 'type_mismatch',
            value
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 검증 규칙 적용
   */
  private validateRule(value: any, rule: ValidationRule, row: number, col: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (rule.type) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          errors.push({
            row,
            col,
            message: rule.message || '필수 입력 항목입니다.',
            type: 'required',
            value
          });
        }
        break;

      case 'minLength':
        if (String(value).length < rule.value) {
          warnings.push({
            row,
            col,
            message: rule.message || `최소 ${rule.value}자 이상 입력해야 합니다.`,
            type: 'min_length',
            value
          });
        }
        break;

      case 'maxLength':
        if (String(value).length > rule.value) {
          warnings.push({
            row,
            col,
            message: rule.message || `최대 ${rule.value}자까지 입력 가능합니다.`,
            type: 'max_length',
            value
          });
        }
        break;

      case 'pattern':
        const regex = new RegExp(rule.value);
        if (!regex.test(String(value))) {
          warnings.push({
            row,
            col,
            message: rule.message || '지정된 패턴과 일치하지 않습니다.',
            type: 'pattern_mismatch',
            value
          });
        }
        break;

      case 'range':
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          const [min, max] = rule.value;
          if (numValue < min || numValue > max) {
            warnings.push({
              row,
              col,
              message: rule.message || `값은 ${min}과 ${max} 사이여야 합니다.`,
              type: 'range_violation',
              value
            });
          }
        }
        break;

      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          warnings.push({
            row,
            col,
            message: rule.message || '커스텀 검증 규칙을 만족하지 않습니다.',
            type: 'custom_validation',
            value
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0 && warnings.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 전역 제약 조건 검증
   */
  private validateGlobalConstraints(data: SchemaGridData[][], columns: GridColumn[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 중복 필드명 검증
    const fieldNames = new Set<string>();
    for (let row = 0; row < data.length; row++) {
      const fieldName = data[row]?.[0]?.fieldName;
      if (fieldName) {
        if (fieldNames.has(fieldName)) {
          errors.push({
            row,
            col: 0,
            message: `중복된 필드명입니다: ${fieldName}`,
            type: 'duplicate_field',
            value: fieldName
          });
        } else {
          fieldNames.add(fieldName);
        }
      }
    }

    // 필수 필드 검증
    for (let row = 0; row < data.length; row++) {
      const rowData = data[row];
      if (rowData) {
        const fieldName = rowData[0]?.fieldName;
        const dataType = rowData[1]?.dataType;
        
        if (!fieldName || fieldName.trim() === '') {
          errors.push({
            row,
            col: 0,
            message: '필드명은 필수입니다.',
            type: 'required_field',
            value: fieldName
          });
        }

        if (!dataType || dataType.trim() === '') {
          errors.push({
            row,
            col: 1,
            message: '데이터 타입은 필수입니다.',
            type: 'required_field',
            value: dataType
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 날짜 유효성 검증
   */
  private isValidDate(value: any): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * 이메일 유효성 검증
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * URL 유효성 검증
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 실시간 검증 (디바운싱 적용)
   */
  public validateCellRealtime(
    value: any,
    column: GridColumn,
    row: number,
    col: number,
    callback: (result: ValidationResult) => void,
    delay: number = 300
  ): void {
    // 디바운싱을 위한 타이머 설정
    setTimeout(() => {
      const result = this.validateCell(value, column, row, col);
      callback(result);
    }, delay);
  }

  /**
   * 검증 결과를 사용자 친화적 메시지로 변환
   */
  public formatValidationMessage(error: ValidationError | ValidationWarning): string {
    const position = `행 ${error.row + 1}, 열 ${error.col + 1}`;
    return `${position}: ${error.message}`;
  }

  /**
   * 검증 통계 생성
   */
  public getValidationStats(result: ValidationResult): {
    totalErrors: number;
    totalWarnings: number;
    errorsByType: Record<string, number>;
    warningsByType: Record<string, number>;
  } {
    const errorsByType: Record<string, number> = {};
    const warningsByType: Record<string, number> = {};

    result.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    result.warnings.forEach(warning => {
      warningsByType[warning.type] = (warningsByType[warning.type] || 0) + 1;
    });

    return {
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      errorsByType,
      warningsByType
    };
  }
}