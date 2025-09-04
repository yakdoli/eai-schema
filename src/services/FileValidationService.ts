import { logger } from "../utils/logger";
import { SecurityError, ValidationError } from "../middleware/errorHandler";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    detectedType?: string;
    encoding?: string;
    hasBOM?: boolean;
    lineCount?: number;
    structureValid?: boolean;
  };
}

export class FileValidationService {
  private readonly MAX_DEPTH = 10;
  private readonly MAX_ENTITY_EXPANSIONS = 1000;

  /**
   * 고급 파일 검증 수행
   */
  async validateFile(buffer: Buffer, filename: string, mimetype: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // 1. 기본 검증
      await this.performBasicValidation(buffer, filename, mimetype, result);

      // 2. 내용 기반 형식 감지
      const detectedType = this.detectFileType(buffer, mimetype);
      result.metadata!.detectedType = detectedType;

      // 3. 형식별 상세 검증
      switch (detectedType) {
        case 'xml':
          await this.validateXMLContent(buffer, result);
          break;
        case 'json':
          await this.validateJSONContent(buffer, result);
          break;
        case 'yaml':
          await this.validateYAMLContent(buffer, result);
          break;
        case 'csv':
          await this.validateCSVContent(buffer, result);
          break;
        default:
          result.warnings.push(`지원되지 않는 파일 형식: ${detectedType}`);
      }

      // 4. 보안 검증
      await this.performSecurityChecks(buffer, detectedType, result);

      // 5. 메타데이터 추출
      this.extractMetadata(buffer, detectedType, result);

      result.isValid = result.errors.length === 0;

    } catch (error) {
      logger.error("파일 검증 중 오류 발생:", error);
      result.errors.push(`검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * 기본 파일 검증
   */
  private async performBasicValidation(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    result: ValidationResult
  ): Promise<void> {
    // 파일 크기 검증 (이미 서비스에서 수행되지만 재검증)
    if (buffer.length === 0) {
      result.errors.push("파일이 비어 있습니다.");
      return;
    }

    // 파일명 검증
    if (!filename || filename.trim().length === 0) {
      result.errors.push("파일명이 유효하지 않습니다.");
    }

    // MIME 타입과 확장자 일치 검증
    const extension = filename.split('.').pop()?.toLowerCase();
    const expectedMimeType = this.getExpectedMimeType(extension);

    if (expectedMimeType && expectedMimeType.includes('/') && !mimetype.includes(expectedMimeType.split('/')[1]!)) {
      result.warnings.push(`MIME 타입(${mimetype})과 확장자(${extension})가 일치하지 않습니다.`);
    }

    // 인코딩 검증
    const encoding = this.detectEncoding(buffer);
    result.metadata!.encoding = encoding;

    if (encoding !== 'utf-8' && encoding !== 'utf-16') {
      result.warnings.push(`비표준 인코딩 감지: ${encoding}`);
    }
  }

  /**
   * 파일 형식 자동 감지
   */
  private detectFileType(buffer: Buffer, mimetype: string): string {
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

    // XML 감지
    if (content.trim().startsWith('<?xml') || content.includes('<') && content.includes('>')) {
      return 'xml';
    }

    // JSON 감지
    if ((content.trim().startsWith('{') && content.trim().endsWith('}')) ||
        (content.trim().startsWith('[') && content.trim().endsWith(']'))) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // JSON 파싱 실패 시 다른 형식으로 진행
      }
    }

    // YAML 감지
    if (content.includes('---') || /^\s*[\w\s]+:\s*/m.test(content)) {
      return 'yaml';
    }

    // CSV 감지
    if (content.includes(',') && content.split('\n').length > 1) {
      const lines = content.split('\n').slice(0, 5);
      const commaCounts = lines.map(line => (line.match(/,/g) || []).length);
      if (commaCounts.length > 0 && commaCounts.every(count => count > 0 && Math.abs(count - commaCounts[0]!) <= 1)) {
        return 'csv';
      }
    }

    // MIME 타입 기반 폴백
    if (mimetype.includes('xml')) return 'xml';
    if (mimetype.includes('json')) return 'json';
    if (mimetype.includes('yaml')) return 'yaml';
    if (mimetype.includes('csv')) return 'csv';

    return 'unknown';
  }

  /**
   * XML 내용 검증
   */
  private async validateXMLContent(buffer: Buffer, result: ValidationResult): Promise<void> {
    const content = buffer.toString('utf8');

    try {
      // 기본 XML 구조 검증
      if (!content.includes('<') || !content.includes('>')) {
        result.errors.push("유효하지 않은 XML 형식입니다.");
        return;
      }

      // XML 선언 검증
      if (!content.trim().startsWith('<?xml')) {
        result.warnings.push("XML 선언이 누락되었습니다.");
      }

      // 루트 요소 검증
      const rootMatch = content.match(/<([^\s>]+)[^>]*>[\s\S]*<\/\1>/);
      if (!rootMatch) {
        result.errors.push("유효하지 않은 XML 구조입니다. 루트 요소가 없습니다.");
        return;
      }

      // XXE 공격 방지 검증
      if (content.includes('<!ENTITY') && content.includes('SYSTEM')) {
        result.errors.push("외부 엔티티 참조가 포함된 XML은 허용되지 않습니다.");
      }

      // DTD 검증
      if (content.includes('<!DOCTYPE') && content.includes('SYSTEM')) {
        result.errors.push("외부 DTD 참조가 포함된 XML은 허용되지 않습니다.");
      }

      // 중첩 깊이 검증
      const depth = this.calculateXMLDepth(content);
      if (depth > this.MAX_DEPTH) {
        result.errors.push(`XML 중첩 깊이가 너무 깊습니다. 최대 ${this.MAX_DEPTH}까지 허용됩니다.`);
      }

      result.metadata!.structureValid = true;

    } catch (error) {
      result.errors.push(`XML 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * JSON 내용 검증
   */
  private async validateJSONContent(buffer: Buffer, result: ValidationResult): Promise<void> {
    const content = buffer.toString('utf8');

    try {
      const parsed = JSON.parse(content);

      // 구조 검증
      const structureValid = this.validateJSONObjectStructure(parsed);
      if (!structureValid) {
        result.warnings.push("JSON 구조에 문제가 있을 수 있습니다.");
      }

      // 순환 참조 검증 (간단한 버전)
      const hasCircular = this.detectCircularReferences(parsed);
      if (hasCircular) {
        result.errors.push("JSON에 순환 참조가 포함되어 있습니다.");
      }

      result.metadata!.structureValid = true;

    } catch (error) {
      result.errors.push(`JSON 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * YAML 내용 검증
   */
  private async validateYAMLContent(buffer: Buffer, result: ValidationResult): Promise<void> {
    const content = buffer.toString('utf8');

    try {
      // 기본 YAML 구조 검증
      if (!content.trim()) {
        result.errors.push("YAML 파일이 비어 있습니다.");
        return;
      }

      // 들여쓰기 일관성 검증
      const lines = content.split('\n');
      const indentLevels: number[] = [];

      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const indent = line.length - line.trimStart().length;
          indentLevels.push(indent);
        }
      }

      // 들여쓰기 일관성 확인
      if (indentLevels.length > 1) {
        const uniqueIndents = [...new Set(indentLevels)];
        if (uniqueIndents.some(indent => indent > 0 && !uniqueIndents.includes(indent - 2) && !uniqueIndents.includes(indent - 4))) {
          result.warnings.push("YAML 들여쓰기가 일관되지 않습니다.");
        }
      }

      result.metadata!.structureValid = true;

    } catch (error) {
      result.errors.push(`YAML 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * CSV 내용 검증
   */
  private async validateCSVContent(buffer: Buffer, result: ValidationResult): Promise<void> {
    const content = buffer.toString('utf8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      result.errors.push("CSV 파일이 비어 있습니다.");
      return;
    }

    // 헤더 검증
    const headerLine = lines[0];
    const headerFields = this.parseCSVLine(headerLine!);

    if (headerFields.length === 0) {
      result.warnings.push("CSV 헤더가 비어 있습니다.");
    }

    // 데이터 행 검증
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const fields = this.parseCSVLine(lines[i]!);
      if (fields.length !== headerFields.length) {
        result.warnings.push(`행 ${i + 1}의 필드 수가 헤더와 일치하지 않습니다.`);
      }
    }

    result.metadata!.lineCount = lines.length;
    result.metadata!.structureValid = true;
  }

  /**
   * 보안 검증 수행
   */
  private async performSecurityChecks(buffer: Buffer, fileType: string, result: ValidationResult): Promise<void> {
    const content = buffer.toString('utf8');

    // 스크립트 태그 검증 (XML/HTML)
    if (fileType === 'xml' && content.includes('<script')) {
      result.errors.push("XML 파일에 스크립트 태그가 포함되어 있습니다.");
    }

    // 잠재적 악성 패턴 검증
    const maliciousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /Function\(/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        result.warnings.push(`잠재적 보안 위험 패턴 감지: ${pattern.source}`);
      }
    }

    // 파일 크기 기반 추가 검증
    if (buffer.length > 10 * 1024 * 1024) { // 10MB 이상
      result.warnings.push("대용량 파일입니다. 처리 시간이 오래 걸릴 수 있습니다.");
    }
  }

  /**
   * 메타데이터 추출
   */
  private extractMetadata(buffer: Buffer, fileType: string, result: ValidationResult): void {
    const content = buffer.toString('utf8');

    // BOM 감지
    result.metadata!.hasBOM = buffer.length >= 3 &&
      buffer[0] === 0xEF &&
      buffer[1] === 0xBB &&
      buffer[2] === 0xBF;

    // 줄 수 계산
    result.metadata!.lineCount = content.split('\n').length;

    // 파일 타입별 추가 메타데이터
    switch (fileType) {
      case 'xml':
        const xmlMatches = content.match(/<[^>]+>/g);
        if (xmlMatches) {
          (result.metadata as any).elementCount = xmlMatches.length;
        }
        break;
      case 'json':
        try {
          const parsed = JSON.parse(content);
          (result.metadata as any).objectKeys = this.countJSONObjectKeys(parsed);
        } catch {
          // 파싱 실패 시 무시
        }
        break;
    }
  }

  // 헬퍼 메서드들
  private getExpectedMimeType(extension?: string): string {
    const mimeTypes: Record<string, string> = {
      'xml': 'application/xml',
      'json': 'application/json',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml',
      'csv': 'text/csv',
      'txt': 'text/plain'
    };
    return extension ? mimeTypes[extension] || '' : '';
  }

  private detectEncoding(buffer: Buffer): string {
    // 간단한 인코딩 감지
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf-8-bom';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf-16-be';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf-16-le';
    }
    return 'utf-8';
  }

  private calculateXMLDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const matches = content.match(/<\/?[^>]+>/g);
    if (!matches) return 0;

    for (const match of matches) {
      if (!match.startsWith('</')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  private validateJSONObjectStructure(obj: any): boolean {
    // 간단한 구조 검증
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    // 너무 깊은 중첩 검증
    const depth = this.calculateObjectDepth(obj);
    return depth <= this.MAX_DEPTH;
  }

  private calculateObjectDepth(obj: any, currentDepth = 0): number {
    if (currentDepth > this.MAX_DEPTH) {
      return currentDepth;
    }

    if (Array.isArray(obj)) {
      let maxDepth = currentDepth;
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          maxDepth = Math.max(maxDepth, this.calculateObjectDepth(item, currentDepth + 1));
        }
      }
      return maxDepth;
    }

    if (typeof obj === 'object') {
      let maxDepth = currentDepth;
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          maxDepth = Math.max(maxDepth, this.calculateObjectDepth(value, currentDepth + 1));
        }
      }
      return maxDepth;
    }

    return currentDepth;
  }

  private detectCircularReferences(obj: any, visited = new Set()): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    if (visited.has(obj)) {
      return true;
    }

    visited.add(obj);

    for (const value of Object.values(obj)) {
      if (this.detectCircularReferences(value, visited)) {
        return true;
      }
    }

    visited.delete(obj);
    return false;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // 다음 따옴표 건너뛰기
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private countJSONObjectKeys(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    let count = 0;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        count += this.countJSONObjectKeys(item);
      }
    } else {
      count += Object.keys(obj).length;
      for (const value of Object.values(obj)) {
        count += this.countJSONObjectKeys(value);
      }
    }

    return count;
  }
}

// 싱글톤 인스턴스
export const fileValidationService = new FileValidationService();