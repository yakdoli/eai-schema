import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';

export interface ProcessingOptions {
  chunkSize?: number;
  maxMemoryUsage?: number;
  compressionEnabled?: boolean;
  validateStructure?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  metadata: {
    originalSize: number;
    processedSize: number;
    processingTime: number;
    chunksProcessed?: number;
    compressionRatio?: number;
  };
  errors: string[];
}

export class FileProcessingService {
  private readonly DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
  private readonly MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');

  /**
   * 파일을 청킹하여 처리
   */
  async processFileInChunks(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        processingTime: 0
      },
      errors: []
    };

    try {
      const stats = await fs.stat(filePath);
      result.metadata.originalSize = stats.size;

      const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
      const totalChunks = Math.ceil(stats.size / chunkSize);

      logger.info(`파일 청킹 처리 시작: ${filePath}, 크기: ${stats.size}, 청크 수: ${totalChunks}`);

      // 메모리 사용량 검증
      if (options.maxMemoryUsage && stats.size > options.maxMemoryUsage) {
        result.errors.push(`파일 크기가 메모리 제한을 초과합니다: ${stats.size} > ${options.maxMemoryUsage}`);
        return result;
      }

      const chunks: Buffer[] = [];
      let processedSize = 0;

      // 파일을 청킹하여 읽기
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, stats.size);
        const chunk = await this.readFileChunk(filePath, start, end - start);

        // 청크 처리 (필요시 변환, 검증 등)
        const processedChunk = await this.processChunk(chunk, i, options);
        chunks.push(processedChunk);
        processedSize += processedChunk.length;

        logger.debug(`청크 ${i + 1}/${totalChunks} 처리 완료`);
      }

      // 청크들을 하나의 파일로 결합
      const outputPath = await this.combineChunks(chunks, filePath);
      result.outputPath = outputPath;
      result.metadata.processedSize = processedSize;
      result.metadata.chunksProcessed = totalChunks;
      result.success = true;

      // 압축 비율 계산
      if (options.compressionEnabled) {
        result.metadata.compressionRatio = processedSize / result.metadata.originalSize;
      }

    } catch (error) {
      logger.error('파일 청킹 처리 중 오류 발생:', error);
      result.errors.push(`처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 스트림 기반 파일 처리
   */
  async processFileWithStream(
    inputPath: string,
    outputPath: string,
    transform?: (chunk: Buffer) => Promise<Buffer>
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        processingTime: 0
      },
      errors: []
    };

    try {
      const stats = await fs.stat(inputPath);
      result.metadata.originalSize = stats.size;

      const readStream = await this.createReadStream(inputPath);
      const writeStream = await this.createWriteStream(outputPath);

      let processedSize = 0;

      return new Promise((resolve) => {
        readStream.on('data', async (chunk: Buffer) => {
          try {
            let processedChunk = chunk;

            // 변환 함수가 제공된 경우 적용
            if (transform) {
              processedChunk = await transform(chunk);
            }

            // 청크 크기 검증 및 조정
            processedChunk = await this.validateAndAdjustChunk(processedChunk);

            writeStream.write(processedChunk);
            processedSize += processedChunk.length;

          } catch (error) {
            logger.error('청크 처리 중 오류:', error);
            result.errors.push(`청크 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            readStream.destroy();
          }
        });

        readStream.on('end', () => {
          writeStream.end();
          result.metadata.processedSize = processedSize;
          result.outputPath = outputPath;
          result.success = result.errors.length === 0;
          result.metadata.processingTime = Date.now() - startTime;
          resolve(result);
        });

        readStream.on('error', (error) => {
          logger.error('읽기 스트림 오류:', error);
          result.errors.push(`스트림 읽기 실패: ${error.message}`);
          resolve(result);
        });

        writeStream.on('error', (error: Error) => {
           logger.error('쓰기 스트림 오류:', error);
           result.errors.push(`스트림 쓰기 실패: ${error.message}`);
           resolve(result);
         });
      });

    } catch (error) {
      logger.error('스트림 처리 중 오류 발생:', error);
      result.errors.push(`처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      result.metadata.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 파일 형식 변환
   */
  async convertFileFormat(
    inputPath: string,
    outputPath: string,
    fromFormat: string,
    toFormat: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        processingTime: 0
      },
      errors: []
    };

    const startTime = Date.now();

    try {
      const inputContent = await fs.readFile(inputPath);
      result.metadata.originalSize = inputContent.length;

      let outputContent: Buffer;

      // 형식 변환 로직
      switch (`${fromFormat}->${toFormat}`) {
        case 'json->xml':
          outputContent = await this.convertJsonToXml(inputContent);
          break;
        case 'xml->json':
          outputContent = await this.convertXmlToJson(inputContent);
          break;
        case 'yaml->json':
          outputContent = await this.convertYamlToJson(inputContent);
          break;
        case 'json->yaml':
          outputContent = await this.convertJsonToYaml(inputContent);
          break;
        case 'csv->json':
          outputContent = await this.convertCsvToJson(inputContent);
          break;
        case 'json->csv':
          outputContent = await this.convertJsonToCsv(inputContent);
          break;
        default:
          throw new ValidationError(`지원되지 않는 변환: ${fromFormat} -> ${toFormat}`);
      }

      // 압축 적용 (선택사항)
      if (options.compressionEnabled) {
        outputContent = await this.compressContent(outputContent);
      }

      await fs.writeFile(outputPath, outputContent);
      result.outputPath = outputPath;
      result.metadata.processedSize = outputContent.length;
      result.success = true;

      if (options.compressionEnabled) {
        result.metadata.compressionRatio = outputContent.length / result.metadata.originalSize;
      }

    } catch (error) {
      logger.error('형식 변환 중 오류 발생:', error);
      result.errors.push(`변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 파일 압축
   */
  async compressFile(inputPath: string, outputPath: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        processingTime: 0
      },
      errors: []
    };

    try {
      const inputContent = await fs.readFile(inputPath);
      result.metadata.originalSize = inputContent.length;

      const compressedContent = await this.compressContent(inputContent);
      await fs.writeFile(outputPath, compressedContent);

      result.outputPath = outputPath;
      result.metadata.processedSize = compressedContent.length;
      result.metadata.compressionRatio = compressedContent.length / result.metadata.originalSize;
      result.success = true;

    } catch (error) {
      logger.error('압축 중 오류 발생:', error);
      result.errors.push(`압축 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 파일 압축 해제
   */
  async decompressFile(inputPath: string, outputPath: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        processingTime: 0
      },
      errors: []
    };

    try {
      const inputContent = await fs.readFile(inputPath);
      result.metadata.originalSize = inputContent.length;

      const decompressedContent = await this.decompressContent(inputContent);
      await fs.writeFile(outputPath, decompressedContent);

      result.outputPath = outputPath;
      result.metadata.processedSize = decompressedContent.length;
      result.metadata.compressionRatio = result.metadata.originalSize / decompressedContent.length;
      result.success = true;

    } catch (error) {
      logger.error('압축 해제 중 오류 발생:', error);
      result.errors.push(`압축 해제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  // 프라이빗 헬퍼 메서드들

  private async readFileChunk(filePath: string, start: number, length: number): Promise<Buffer> {
    const fileHandle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(length);
      await fileHandle.read(buffer, 0, length, start);
      return buffer;
    } finally {
      await fileHandle.close();
    }
  }

  private async processChunk(chunk: Buffer, index: number, options: ProcessingOptions): Promise<Buffer> {
    // 청크 처리 로직 (필요시 구현)
    // 예: 데이터 변환, 검증, 필터링 등

    if (options.validateStructure) {
      // 간단한 구조 검증
      if (chunk.length === 0) {
        throw new ValidationError(`청크 ${index}가 비어 있습니다.`);
      }
    }

    return chunk;
  }

  private async combineChunks(chunks: Buffer[], originalPath: string): Promise<string> {
    const combinedBuffer = Buffer.concat(chunks);
    const outputPath = path.join(this.TEMP_DIR, `processed_${Date.now()}_${path.basename(originalPath)}`);

    await fs.writeFile(outputPath, combinedBuffer);
    return outputPath;
  }

  private async createReadStream(filePath: string): Promise<Readable> {
    const fileHandle = await fs.open(filePath, 'r');
    const stream = new Readable({
      read(size) {
        // 스트림 읽기 로직
      }
    });

    // 실제 구현에서는 fs.createReadStream 사용
    await fileHandle.close();
    return require('fs').createReadStream(filePath);
  }

  private async createWriteStream(filePath: string): Promise<any> {
    // 실제 구현에서는 fs.createWriteStream 사용
    return require('fs').createWriteStream(filePath);
  }

  private async validateAndAdjustChunk(chunk: Buffer): Promise<Buffer> {
    // 청크 크기 검증 및 조정
    if (chunk.length > this.MAX_MEMORY_USAGE) {
      throw new ValidationError(`청크 크기가 메모리 제한을 초과합니다: ${chunk.length}`);
    }

    return chunk;
  }

  // 형식 변환 헬퍼 메서드들

  private async convertJsonToXml(jsonBuffer: Buffer): Promise<Buffer> {
    const json = JSON.parse(jsonBuffer.toString());
    const xml = this.jsonToXmlString(json);
    return Buffer.from(xml);
  }

  private async convertXmlToJson(xmlBuffer: Buffer): Promise<Buffer> {
    const xml = xmlBuffer.toString();
    const json = this.xmlToJsonObject(xml);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private async convertYamlToJson(yamlBuffer: Buffer): Promise<Buffer> {
    // YAML 파싱 로직 (간단한 구현)
    const yaml = yamlBuffer.toString();
    const json = this.yamlToJsonObject(yaml);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private async convertJsonToYaml(jsonBuffer: Buffer): Promise<Buffer> {
    const json = JSON.parse(jsonBuffer.toString());
    const yaml = this.jsonToYamlString(json);
    return Buffer.from(yaml);
  }

  private async convertCsvToJson(csvBuffer: Buffer): Promise<Buffer> {
    const csv = csvBuffer.toString();
    const json = this.csvToJsonObject(csv);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private async convertJsonToCsv(jsonBuffer: Buffer): Promise<Buffer> {
    const json = JSON.parse(jsonBuffer.toString());
    const csv = this.jsonToCsvString(json);
    return Buffer.from(csv);
  }

  private async compressContent(content: Buffer): Promise<Buffer> {
    // 간단한 압축 로직 (실제로는 zlib 사용)
    // 여기서는 데모를 위해 원본 반환
    return content;
  }

  private async decompressContent(content: Buffer): Promise<Buffer> {
    // 간단한 압축 해제 로직
    return content;
  }

  // 변환 헬퍼 메서드들 (간단한 구현)

  private jsonToXmlString(obj: any, rootName = 'root'): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
    xml += this.objectToXml(obj, 1);
    xml += `</${rootName}>`;
    return xml;
  }

  private objectToXml(obj: any, indent: number): string {
    const indentStr = '  '.repeat(indent);
    let xml = '';

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        xml += `${indentStr}<item${index}>\n`;
        xml += this.objectToXml(item, indent + 1);
        xml += `${indentStr}</item${index}>\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        xml += `${indentStr}<${key}>\n`;
        xml += this.objectToXml(value, indent + 1);
        xml += `${indentStr}</${key}>\n`;
      });
    } else {
      xml += `${indentStr}${obj}\n`;
    }

    return xml;
  }

  private xmlToJsonObject(xml: string): any {
    // 간단한 XML 파싱 (실제로는 xml2js 라이브러리 사용 권장)
    const result: any = {};

    // 기본적인 XML 파싱 로직
    const matches = xml.match(/<(\w+)>(.*?)<\/\1>/gs);
    if (matches) {
      matches.forEach(match => {
        const [, tag, content] = match.match(/<(\w+)>(.*?)<\/\1>/) || [];
        if (tag && content) {
          result[tag] = content;
        }
      });
    }

    return result;
  }

  private yamlToJsonObject(yaml: string): any {
    // 간단한 YAML 파싱
    const lines = yaml.split('\n');
    const result: any = {};

    lines.forEach(line => {
      const match = line.match(/^(\s*)([\w]+):\s*(.*)$/);
      if (match) {
        const [, indent, key, value] = match;
        result[key!] = value;
      }
    });

    return result;
  }

  private jsonToYamlString(obj: any): string {
    let yaml = '';

    const convert = (obj: any, indent = 0): string => {
      const indentStr = '  '.repeat(indent);
      let result = '';

      if (Array.isArray(obj)) {
        obj.forEach(item => {
          result += `${indentStr}- ${convert(item, indent + 1)}`;
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          result += `${indentStr}${key}: ${convert(value, indent + 1)}`;
        });
      } else {
        result += `${obj}\n`;
      }

      return result;
    };

    return convert(obj);
  }

  private csvToJsonObject(csv: string): any[] {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]!);
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]!);
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header!] = values[index] || '';
      });

      result.push(obj);
    }

    return result;
  }

  private jsonToCsvString(json: any): string {
    if (!Array.isArray(json) || json.length === 0) {
      return '';
    }

    const headers = Object.keys(json[0]);
    let csv = headers.join(',') + '\n';

    json.forEach(item => {
      const values = headers.map(header => {
        const value = item[header] || '';
        // CSV 이스케이핑
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    return csv;
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
          i++;
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
}

// 싱글톤 인스턴스
export const fileProcessingService = new FileProcessingService();