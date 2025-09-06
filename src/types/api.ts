// API 관련 타입 정의

import { Request, Response } from 'express';
import { Schema, SchemaFormat, SchemaGridData, ValidationResult } from './schema';
import { CollaborationSession, GridChange } from './collaboration';

// 요청 타입들
export interface CreateSchemaRequest {
  name: string;
  description?: string;
  format: SchemaFormat;
  content: string;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  content?: string;
  gridData?: SchemaGridData[][];
}

export interface ConvertToGridRequest {
  content: string;
  format: SchemaFormat;
}

export interface UpdateGridRequest {
  gridData: SchemaGridData[][];
  changes: GridChange[];
}

export interface ExportSchemaRequest {
  format: SchemaFormat;
  includeMetadata?: boolean;
}

export interface CreateSessionRequest {
  schemaId: string;
  name: string;
  settings?: Partial<CollaborationSession['settings']>;
}

// 응답 타입들
export interface GetSchemaResponse {
  schema: Schema;
}

export interface CreateSchemaResponse {
  schema: Schema;
}

export interface UpdateSchemaResponse {
  schema: Schema;
  validation?: ValidationResult;
}

export interface DeleteSchemaResponse {
  success: boolean;
  message: string;
}

export interface ConvertToGridResponse {
  gridData: SchemaGridData[][];
  validation: ValidationResult;
}

export interface UpdateGridResponse {
  success: boolean;
  validation: ValidationResult;
  conflicts?: GridChange[];
}

export interface ExportSchemaResponse {
  content: string;
  format: SchemaFormat;
  filename: string;
}

export interface CreateSessionResponse {
  session: CollaborationSession;
  websocketUrl: string;
}

export interface GetSessionResponse {
  session: CollaborationSession;
}

// 확장된 Request 타입
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    permissions: string[];
  };
  requestId: string;
}

// 미들웨어 타입들
export type MiddlewareFunction = (req: AuthenticatedRequest, res: Response, next: Function) => void | Promise<void>;

export interface ValidationMiddlewareOptions {
  schema?: any; // Joi 또는 다른 검증 스키마
  property?: 'body' | 'query' | 'params';
  body?: any;
  query?: any;
  params?: any;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

// 파일 업로드 관련
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
}

export interface FileUploadOptions {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}