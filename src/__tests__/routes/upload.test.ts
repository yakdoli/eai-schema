/// <reference types="jest" />
import request from 'supertest';
import express from 'express';
import { uploadRoutes } from '../../routes/upload';
import { errorHandler } from '../../middleware/errorHandler';
import { fileUploadService } from '../../services/fileUploadService';
import { urlFetchService } from '../../services/urlFetchService';

// Mock dependencies
jest.mock('../../services/fileUploadService');
jest.mock('../../services/urlFetchService');
jest.mock('../../utils/logger');

const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;
const mockUrlFetchService = urlFetchService as jest.Mocked<typeof urlFetchService>;

const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);
app.use(errorHandler);

describe('Upload Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload/file', () => {
    it('유효한 파일 업로드를 처리해야 함', async () => {
      const mockFileInfo = {
        id: 'test-id',
        originalName: 'test.xml',
        filename: 'test-id_test.xml',
        path: '/temp/test-id_test.xml',
        size: 1024,
        mimetype: 'application/xml',
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockFileUploadService.saveFile.mockResolvedValue(mockFileInfo);

      const xmlContent = '<?xml version="1.0"?><root></root>';
      
      const response = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(xmlContent), {
          filename: 'test.xml',
          contentType: 'application/xml'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fileId).toBe('test-id');
    });

    it('파일이 없을 때 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/upload/file');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('업로드할 파일이 없습니다');
    });
  });

  describe('POST /api/upload/url', () => {
    it('유효한 URL 요청을 처리해야 함', async () => {
      const mockFetchResult = {
        content: Buffer.from('<?xml version="1.0"?><root></root>'),
        contentType: 'application/xml',
        size: 1024,
        url: 'https://example.com/schema.wsdl',
        fetchedAt: new Date()
      };

      const mockFileInfo = {
        id: 'test-id',
        originalName: 'schema.wsdl',
        filename: 'test-id_schema.wsdl',
        path: '/temp/test-id_schema.wsdl',
        size: 1024,
        mimetype: 'application/xml',
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockUrlFetchService.fetchFromUrl.mockResolvedValue(mockFetchResult);
      mockFileUploadService.saveFile.mockResolvedValue(mockFileInfo);

      const response = await request(app)
        .post('/api/upload/url')
        .send({ url: 'https://example.com/schema.wsdl' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fileId).toBe('test-id');
    });

    it('URL이 없을 때 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/upload/url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('URL이 필요합니다');
    });

    it('유효하지 않은 URL 형식일 때 에러를 반환해야 함', async () => {
      mockUrlFetchService.fetchFromUrl.mockRejectedValue(new Error('유효하지 않은 URL 형식입니다.'));

      const response = await request(app)
        .post('/api/upload/url')
        .send({ url: 'not-a-url' });

      expect(response.status).toBe(500); // 내부 서버 오류로 처리됨
    });
  });

  describe('POST /api/upload/validate-url', () => {
    it('유효한 URL 검증을 처리해야 함', async () => {
      mockUrlFetchService.isSupportedUrl.mockReturnValue(true);

      const response = await request(app)
        .post('/api/upload/validate-url')
        .send({ url: 'https://example.com/schema.wsdl' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    it('URL이 없을 때 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/upload/validate-url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('URL이 필요합니다');
    });
  });

  describe('GET /api/upload/files', () => {
    it('업로드된 파일 목록을 반환해야 함', async () => {
      const mockFiles = [
        {
          id: 'test-id-1',
          originalName: 'test1.xml',
          filename: 'test-id-1_test1.xml',
          path: '/temp/test-id-1_test1.xml',
          size: 1024,
          mimetype: 'application/xml',
          uploadedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ];

      mockFileUploadService.getUploadedFiles.mockReturnValue(mockFiles);

      const response = await request(app)
        .get('/api/upload/files');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});