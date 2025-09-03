import { UrlFetchService } from '../../services/urlFetchService';
import { SecurityError, ValidationError, NetworkError } from '../../middleware/errorHandler';

// Mock dependencies
jest.mock('../../utils/logger');

describe('UrlFetchService', () => {
  let service: UrlFetchService;
  
  beforeEach(() => {
    service = new UrlFetchService();
  });

  describe('URL 검증', () => {
    it('유효한 HTTPS URL을 허용해야 함', () => {
      expect(service.isSupportedUrl('https://example.com/schema.wsdl')).toBe(true);
    });

    it('개발 환경에서 HTTP URL을 허용해야 함', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      expect(service.isSupportedUrl('http://example.com/schema.wsdl')).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('프로덕션 환경에서 HTTP URL을 거부해야 함', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      await expect(service.fetchFromUrl('http://example.com/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('http://example.com/schema.wsdl'))
        .rejects.toThrow('HTTPS URL만 허용됩니다');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('localhost URL을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://localhost/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://localhost/schema.wsdl'))
        .rejects.toThrow('차단된 호스트입니다');
    });

    it('127.0.0.1 URL을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://127.0.0.1/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://127.0.0.1/schema.wsdl'))
        .rejects.toThrow('차단된 호스트입니다');
    });

    it('사설 IP 대역 URL을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://192.168.1.1/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://10.0.0.1/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://172.16.0.1/schema.wsdl'))
        .rejects.toThrow(SecurityError);
    });

    it('IP 주소 직접 접근을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://8.8.8.8/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://8.8.8.8/schema.wsdl'))
        .rejects.toThrow('IP 주소로의 직접 접근은 허용되지 않습니다');
    });

    it('허용되지 않은 포트를 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://example.com:9999/schema.wsdl'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://example.com:9999/schema.wsdl'))
        .rejects.toThrow('허용되지 않은 포트입니다');
    });

    it('유효하지 않은 URL 형식을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('not-a-url'))
        .rejects.toThrow(ValidationError);
      await expect(service.fetchFromUrl('not-a-url'))
        .rejects.toThrow('유효하지 않은 URL 형식입니다');
    });

    it('메타데이터 서비스 URL을 거부해야 함', async () => {
      await expect(service.fetchFromUrl('https://169.254.169.254/metadata'))
        .rejects.toThrow(SecurityError);
      await expect(service.fetchFromUrl('https://metadata.google.internal/metadata'))
        .rejects.toThrow(SecurityError);
    });
  });

  describe('지원되는 URL 확인', () => {
    it('HTTP/HTTPS URL을 지원해야 함', () => {
      expect(service.isSupportedUrl('https://example.com')).toBe(true);
      expect(service.isSupportedUrl('http://example.com')).toBe(true);
    });

    it('다른 프로토콜은 지원하지 않아야 함', () => {
      expect(service.isSupportedUrl('ftp://example.com')).toBe(false);
      expect(service.isSupportedUrl('file:///etc/passwd')).toBe(false);
      expect(service.isSupportedUrl('javascript:alert(1)')).toBe(false);
    });

    it('유효하지 않은 URL은 지원하지 않아야 함', () => {
      expect(service.isSupportedUrl('not-a-url')).toBe(false);
      expect(service.isSupportedUrl('')).toBe(false);
    });
  });
});