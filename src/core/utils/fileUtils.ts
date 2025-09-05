// 파일 처리 유틸리티

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { generateUuid, generateFileChecksum } from './crypto';
import { FileProcessingError } from '../../types/errors';

/**
 * 파일 존재 여부 확인
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * 디렉토리 생성 (재귀적)
 */
export const ensureDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (_error) {
    throw new FileProcessingError(
      `디렉토리 생성 실패: ${dirPath}`,
      dirPath,
      'directory'
    );
  }
};

/**
 * 파일 읽기 (텍스트)
 */
export const readTextFile = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (_error) {
    throw new FileProcessingError(
      `파일 읽기 실패: ${filePath}`,
      filePath,
      'text'
    );
  }
};

/**
 * 파일 쓰기 (텍스트)
 */
export const writeTextFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (_error) {
    throw new FileProcessingError(
      `파일 쓰기 실패: ${filePath}`,
      filePath,
      'text'
    );
  }
};

/**
 * 파일 읽기 (바이너리)
 */
export const readBinaryFile = async (filePath: string): Promise<Buffer> => {
  try {
    return await fs.readFile(filePath);
  } catch (_error) {
    throw new FileProcessingError(
      `바이너리 파일 읽기 실패: ${filePath}`,
      filePath,
      'binary'
    );
  }
};

/**
 * 파일 쓰기 (바이너리)
 */
export const writeBinaryFile = async (filePath: string, buffer: Buffer): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);
  } catch (_error) {
    throw new FileProcessingError(
      `바이너리 파일 쓰기 실패: ${filePath}`,
      filePath,
      'binary'
    );
  }
};

/**
 * 파일 삭제
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // 파일이 존재하지 않는 경우는 무시
    if ((error as any).code !== 'ENOENT') {
      throw new FileProcessingError(
        `파일 삭제 실패: ${filePath}`,
        filePath
      );
    }
  }
};

/**
 * 디렉토리 삭제 (재귀적)
 */
export const deleteDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (_error) {
    throw new FileProcessingError(
      `디렉토리 삭제 실패: ${dirPath}`,
      dirPath,
      'directory'
    );
  }
};

/**
 * 파일 정보 조회
 */
export const getFileInfo = async (filePath: string): Promise<{
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isFile: boolean;
  isDirectory: boolean;
}> => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (_error) {
    throw new FileProcessingError(
      `파일 정보 조회 실패: ${filePath}`,
      filePath
    );
  }
};

/**
 * 디렉토리 내 파일 목록 조회
 */
export const listFiles = async (dirPath: string, recursive = false): Promise<string[]> => {
  try {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        const subFiles = await listFiles(fullPath, true);
        files.push(...subFiles);
      }
    }
    
    return files;
  } catch (_error) {
    throw new FileProcessingError(
      `디렉토리 목록 조회 실패: ${dirPath}`,
      dirPath,
      'directory'
    );
  }
};

/**
 * 파일 복사
 */
export const copyFile = async (sourcePath: string, destPath: string): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(destPath));
    await fs.copyFile(sourcePath, destPath);
  } catch (_error) {
    throw new FileProcessingError(
      `파일 복사 실패: ${sourcePath} -> ${destPath}`,
      sourcePath
    );
  }
};

/**
 * 파일 이동
 */
export const moveFile = async (sourcePath: string, destPath: string): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(destPath));
    await fs.rename(sourcePath, destPath);
  } catch (_error) {
    throw new FileProcessingError(
      `파일 이동 실패: ${sourcePath} -> ${destPath}`,
      sourcePath
    );
  }
};

/**
 * 임시 파일 생성
 */
export const createTempFile = async (
  content: string | Buffer,
  extension = '.tmp',
  tempDir = './temp'
): Promise<string> => {
  const filename = `${generateUuid()}${extension}`;
  const filePath = path.join(tempDir, filename);
  
  await ensureDirectory(tempDir);
  
  if (typeof content === 'string') {
    await writeTextFile(filePath, content);
  } else {
    await writeBinaryFile(filePath, content);
  }
  
  return filePath;
};

/**
 * 파일 스트림 복사
 */
export const streamCopy = async (sourcePath: string, destPath: string): Promise<void> => {
  try {
    await ensureDirectory(path.dirname(destPath));
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);
    await pipeline(readStream, writeStream);
  } catch (_error) {
    throw new FileProcessingError(
      `스트림 복사 실패: ${sourcePath} -> ${destPath}`,
      sourcePath
    );
  }
};

/**
 * 파일 체크섬 검증
 */
export const verifyFileChecksum = async (filePath: string, expectedChecksum: string): Promise<boolean> => {
  try {
    const buffer = await readBinaryFile(filePath);
    const actualChecksum = generateFileChecksum(buffer);
    return actualChecksum === expectedChecksum;
  } catch (_error) {
    throw new FileProcessingError(
      `체크섬 검증 실패: ${filePath}`,
      filePath
    );
  }
};

/**
 * 파일 확장자 추출
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

/**
 * 파일명에서 확장자 제거
 */
export const removeFileExtension = (filename: string): string => {
  return path.parse(filename).name;
};

/**
 * 안전한 파일명 생성 (특수문자 제거)
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};