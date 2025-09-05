/**
 * 그리드 컴포넌트 관리자
 * 여러 그리드 인스턴스를 관리하고 공통 기능 제공
 */

import { GridComponent } from '../components/GridComponent';
import {
  GridComponentProps,
  GridColumn,
  SchemaGridData,
  CellChangeEvent,
  StructureChange,
  ValidationResult,
  DataType,
  CustomDataType,
  GridMetadata
} from '../types/grid';
import { GridValidationService } from './GridValidationService';
import { Logger } from '../core/logging/Logger';

export class GridManager {
  private grids: Map<string, GridComponent> = new Map();
  private validationService: GridValidationService;
  private logger: Logger;
  private defaultColumns: GridColumn[];

  constructor() {
    this.validationService = new GridValidationService();
    this.logger = new Logger('GridManager');
    this.defaultColumns = this.createDefaultColumns();
  }

  /**
   * 기본 컬럼 설정 생성
   */
  private createDefaultColumns(): GridColumn[] {
    return [
      {
        id: 'fieldName',
        title: '필드명',
        type: DataType.TEXT,
        width: 150,
        validation: [
          {
            type: 'required',
            message: '필드명은 필수입니다.'
          },
          {
            type: 'pattern',
            value: '^[a-zA-Z][a-zA-Z0-9_]*$',
            message: '필드명은 영문자로 시작하고 영문자, 숫자, 언더스코어만 사용 가능합니다.'
          }
        ]
      },
      {
        id: 'dataType',
        title: '데이터 타입',
        type: DataType.DROPDOWN,
        width: 120,
        source: ['string', 'number', 'boolean', 'date', 'array', 'object'],
        validation: [
          {
            type: 'required',
            message: '데이터 타입은 필수입니다.'
          }
        ]
      },
      {
        id: 'required',
        title: '필수',
        type: DataType.BOOLEAN,
        width: 80,
        defaultValue: false
      },
      {
        id: 'description',
        title: '설명',
        type: DataType.TEXT,
        width: 200,
        validation: [
          {
            type: 'maxLength',
            value: 500,
            message: '설명은 500자를 초과할 수 없습니다.'
          }
        ]
      },
      {
        id: 'defaultValue',
        title: '기본값',
        type: DataType.TEXT,
        width: 120
      },
      {
        id: 'constraints',
        title: '제약조건',
        type: DataType.TEXT,
        width: 150,
        validation: [
          {
            type: 'maxLength',
            value: 200,
            message: '제약조건은 200자를 초과할 수 없습니다.'
          }
        ]
      }
    ];
  }

  /**
   * 새 그리드 생성
   */
  public createGrid(
    gridId: string,
    container: any, // HTMLElement 대신 any 사용
    options?: Partial<GridComponentProps>
  ): GridComponent {
    try {
      // 기존 그리드가 있으면 제거
      if (this.grids.has(gridId)) {
        this.destroyGrid(gridId);
      }

      // 기본 속성 설정
      const defaultProps: GridComponentProps = {
        data: this.createEmptyData(10),
        columns: this.defaultColumns,
        onCellChange: this.handleCellChange.bind(this, gridId),
        onStructureChange: this.handleStructureChange.bind(this, gridId),
        readOnly: false,
        collaborationMode: false,
        height: 400,
        licenseKey: 'non-commercial-and-evaluation'
      };

      // 옵션 병합
      const props = { ...defaultProps, ...options };

      // 그리드 생성
      const grid = new GridComponent(container, props);
      this.grids.set(gridId, grid);

      this.logger.info(`그리드 생성됨: ${gridId}`);
      return grid;
    } catch (error) {
      this.logger.error(`그리드 생성 실패: ${gridId}`, { error });
      throw error;
    }
  }

  /**
   * 그리드 가져오기
   */
  public getGrid(gridId: string): GridComponent | undefined {
    return this.grids.get(gridId);
  }

  /**
   * 그리드 제거
   */
  public destroyGrid(gridId: string): boolean {
    const grid = this.grids.get(gridId);
    if (grid) {
      grid.destroy();
      this.grids.delete(gridId);
      this.logger.info(`그리드 제거됨: ${gridId}`);
      return true;
    }
    return false;
  }

  /**
   * 모든 그리드 제거
   */
  public destroyAllGrids(): void {
    this.grids.forEach((grid, gridId) => {
      grid.destroy();
      this.logger.info(`그리드 제거됨: ${gridId}`);
    });
    this.grids.clear();
  }

  /**
   * 빈 데이터 생성
   */
  private createEmptyData(rows: number): SchemaGridData[][] {
    const emptyData: SchemaGridData[][] = [];
    
    for (let i = 0; i < rows; i++) {
      const row: SchemaGridData[] = [];
      for (let j = 0; j < this.defaultColumns.length; j++) {
        const column = this.defaultColumns[j];
        const cellData: SchemaGridData = {
          fieldName: '',
          dataType: '',
          required: false,
          description: '',
          defaultValue: column.defaultValue || '',
          constraints: ''
        };
        row.push(cellData);
      }
      emptyData.push(row);
    }
    
    return emptyData;
  }

  /**
   * 셀 변경 이벤트 핸들러
   */
  private handleCellChange(gridId: string, changes: CellChangeEvent[]): void {
    this.logger.debug(`그리드 ${gridId} 셀 변경:`, changes);
    
    // 변경 사항을 다른 서비스에 알림 (예: 협업 서비스)
    // TODO: 협업 기능 구현 시 추가
  }

  /**
   * 구조 변경 이벤트 핸들러
   */
  private handleStructureChange(gridId: string, changes: StructureChange[]): void {
    this.logger.debug(`그리드 ${gridId} 구조 변경:`, changes);
    
    // 구조 변경 사항을 다른 서비스에 알림
    // TODO: 협업 기능 구현 시 추가
  }

  /**
   * 스키마 데이터를 그리드 데이터로 변환
   */
  public convertSchemaToGridData(schema: any): SchemaGridData[][] {
    try {
      const gridData: SchemaGridData[][] = [];
      
      if (schema && typeof schema === 'object') {
        // JSON 스키마 처리
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([fieldName, fieldDef]: [string, any]) => {
            const cellData: SchemaGridData = {
              fieldName,
              dataType: fieldDef.type || 'string',
              required: schema.required?.includes(fieldName) || false,
              description: fieldDef.description || '',
              defaultValue: fieldDef.default || '',
              constraints: this.extractConstraints(fieldDef)
            };
            gridData.push([cellData]);
          });
        }
        
        // XML 스키마 처리 (XSD)
        else if (schema.elements) {
          schema.elements.forEach((element: any) => {
            const cellData: SchemaGridData = {
              fieldName: element.name || '',
              dataType: element.type || 'string',
              required: element.minOccurs !== '0',
              description: element.annotation?.documentation || '',
              defaultValue: element.default || '',
              constraints: this.extractXmlConstraints(element)
            };
            gridData.push([cellData]);
          });
        }
      }
      
      // 최소 행 수 보장
      while (gridData.length < 10) {
        const emptyRow = this.createEmptyData(1)[0];
        if (emptyRow) {
          gridData.push(emptyRow);
        }
      }
      
      return gridData;
    } catch (error) {
      this.logger.error('스키마를 그리드 데이터로 변환 중 오류:', { error });
      return this.createEmptyData(10);
    }
  }

  /**
   * 그리드 데이터를 스키마로 변환
   */
  public convertGridDataToSchema(gridData: SchemaGridData[][], format: 'json' | 'xml' | 'yaml'): any {
    try {
      const schema: any = {};
      
      switch (format) {
        case 'json':
          schema.$schema = 'http://json-schema.org/draft-07/schema#';
          schema.type = 'object';
          schema.properties = {};
          schema.required = [];
          
          gridData.forEach(row => {
            const cellData = row[0];
            if (cellData && cellData.fieldName) {
              schema.properties[cellData.fieldName] = {
                type: cellData.dataType || 'string',
                description: cellData.description || ''
              };
              
              if (cellData.defaultValue) {
                schema.properties[cellData.fieldName].default = cellData.defaultValue;
              }
              
              if (cellData.required) {
                schema.required.push(cellData.fieldName);
              }
              
              // 제약조건 추가
              if (cellData.constraints) {
                this.applyConstraintsToJsonSchema(
                  schema.properties[cellData.fieldName],
                  cellData.constraints
                );
              }
            }
          });
          break;
          
        case 'xml':
          schema.elements = [];
          
          gridData.forEach(row => {
            const cellData = row[0];
            if (cellData && cellData.fieldName) {
              const element: any = {
                name: cellData.fieldName,
                type: cellData.dataType || 'string',
                minOccurs: cellData.required ? '1' : '0'
              };
              
              if (cellData.description) {
                element.annotation = {
                  documentation: cellData.description
                };
              }
              
              if (cellData.defaultValue) {
                element.default = cellData.defaultValue;
              }
              
              schema.elements.push(element);
            }
          });
          break;
          
        case 'yaml':
          // YAML은 JSON과 유사한 구조 사용
          return this.convertGridDataToSchema(gridData, 'json');
      }
      
      return schema;
    } catch (error) {
      this.logger.error('그리드 데이터를 스키마로 변환 중 오류:', { error });
      throw error;
    }
  }

  /**
   * 제약조건 추출 (JSON 스키마)
   */
  private extractConstraints(fieldDef: any): string {
    const constraints: string[] = [];
    
    if (fieldDef.minLength !== undefined) {
      constraints.push(`minLength: ${fieldDef.minLength}`);
    }
    if (fieldDef.maxLength !== undefined) {
      constraints.push(`maxLength: ${fieldDef.maxLength}`);
    }
    if (fieldDef.minimum !== undefined) {
      constraints.push(`minimum: ${fieldDef.minimum}`);
    }
    if (fieldDef.maximum !== undefined) {
      constraints.push(`maximum: ${fieldDef.maximum}`);
    }
    if (fieldDef.pattern) {
      constraints.push(`pattern: ${fieldDef.pattern}`);
    }
    if (fieldDef.enum) {
      constraints.push(`enum: [${fieldDef.enum.join(', ')}]`);
    }
    
    return constraints.join(', ');
  }

  /**
   * 제약조건 추출 (XML 스키마)
   */
  private extractXmlConstraints(element: any): string {
    const constraints: string[] = [];
    
    if (element.maxOccurs && element.maxOccurs !== 'unbounded') {
      constraints.push(`maxOccurs: ${element.maxOccurs}`);
    }
    if (element.restrictions) {
      Object.entries(element.restrictions).forEach(([key, value]) => {
        constraints.push(`${key}: ${value}`);
      });
    }
    
    return constraints.join(', ');
  }

  /**
   * JSON 스키마에 제약조건 적용
   */
  private applyConstraintsToJsonSchema(property: any, constraints: string): void {
    const constraintPairs = constraints.split(',').map(c => c.trim());
    
    constraintPairs.forEach(constraint => {
      const [key, value] = constraint.split(':').map(s => s.trim());
      
      switch (key) {
        case 'minLength':
        case 'maxLength':
        case 'minimum':
        case 'maximum':
          if (value) {
            property[key] = parseInt(value, 10);
          }
          break;
        case 'pattern':
          property[key] = value;
          break;
        case 'enum':
          if (value) {
            property[key] = value.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
          }
          break;
          break;
      }
    });
  }

  /**
   * 그리드 메타데이터 생성
   */
  public createGridMetadata(gridData: SchemaGridData[][], columns: GridColumn[]): GridMetadata {
    return {
      columns,
      rowCount: gridData.length,
      columnCount: columns.length,
      customTypes: [],
      constraints: [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 전체 검증 수행
   */
  public validateAllGrids(): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    
    this.grids.forEach((grid, gridId) => {
      const result = grid.validateAll();
      results.set(gridId, result);
    });
    
    return results;
  }

  /**
   * 그리드 통계 정보 가져오기
   */
  public getGridStats(): {
    totalGrids: number;
    activeGrids: number;
    totalCells: number;
    validationErrors: number;
    validationWarnings: number;
  } {
    let totalCells = 0;
    let validationErrors = 0;
    let validationWarnings = 0;
    
    this.grids.forEach(grid => {
      const data = grid.getData();
      totalCells += data.length * (data[0]?.length || 0);
      
      const validationResults = grid.getValidationResults();
      validationResults.forEach(result => {
        validationErrors += result.errors.length;
        validationWarnings += result.warnings.length;
      });
    });
    
    return {
      totalGrids: this.grids.size,
      activeGrids: this.grids.size,
      totalCells,
      validationErrors,
      validationWarnings
    };
  }

  /**
   * 그리드 데이터 내보내기
   */
  public exportGridData(gridId: string, format: 'csv' | 'json' | 'xml'): string {
    const grid = this.grids.get(gridId);
    if (!grid) {
      throw new Error(`그리드를 찾을 수 없습니다: ${gridId}`);
    }
    
    const data = grid.getData();
    
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'xml':
        return this.convertToXML(data);
      default:
        throw new Error(`지원하지 않는 형식: ${format}`);
    }
  }

  /**
   * CSV 형식으로 변환
   */
  private convertToCSV(data: any[][]): string {
    const headers = this.defaultColumns.map(col => col.title);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const csvRow = row.map((cell: any) => {
        const value = typeof cell === 'string' ? cell : String(cell || '');
        return value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(csvRow.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * XML 형식으로 변환
   */
  private convertToXML(data: any[][]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schema>\n';
    
    data.forEach((row, index) => {
      if (row[0]) { // 빈 행 제외
        xml += `  <field id="${index}">\n`;
        this.defaultColumns.forEach((col, colIndex) => {
          const value = row[colIndex] || '';
          xml += `    <${col.id}>${this.escapeXml(String(value))}</${col.id}>\n`;
        });
        xml += '  </field>\n';
      }
    });
    
    xml += '</schema>';
    return xml;
  }

  /**
   * XML 이스케이프
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}