import https from 'https';
import http from 'http';
import { URL } from 'url';
import { SecurityError, NetworkError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// SSRF 방지를 위한 차단된 호스트/IP 대역
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal', // GCP 메타데이터
  '169.254.169.254', // AWS/Azure 메타데이터
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16'
];

// 허용된 포트
const ALLOWED_PORTS = [80, 443, 8080, 8443];

// 최대 응답 크기 (50MB)
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;

// 요청 타임아웃 (5초)
const REQUEST_TIMEOUT = 5000;

export interface FetchResult {
  content: Buffer;
  contentType: string;
  size: number;
  url: string;
  fetchedAt: Date;
}

export class UrlFetchService {
  // URL 보안 검증
  private validateUrl(urlString: string): URL {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(urlString);
    } catch (error) {
      throw new ValidationError('유효하지 않은 URL 형식입니다.');
    }

    // 프로토콜 검증 (HTTPS만 허용, 개발 환경에서는 HTTP도 허용)
    if (parsedUrl.protocol !== 'https:' && 
        (process.env.NODE_ENV === 'production' || parsedUrl.protocol !== 'http:')) {
      throw new SecurityError('HTTPS URL만 허용됩니다.');
    }

    // 호스트 검증 (SSRF 방지)
    if (this.isBlockedHost(parsedUrl.hostname)) {
      throw new SecurityError('차단된 호스트입니다.');
    }

    // 포트 검증
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80);
    if (!ALLOWED_PORTS.includes(port)) {
      throw new SecurityError(`허용되지 않은 포트입니다. 허용된 포트: ${ALLOWED_PORTS.join(', ')}`);
    }

    // IP 주소 직접 접근 차단
    if (this.isIpAddress(parsedUrl.hostname)) {
      throw new SecurityError('IP 주소로의 직접 접근은 허용되지 않습니다.');
    }

    return parsedUrl;
  }

  // 차단된 호스트 확인
  private isBlockedHost(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();
    
    for (const blockedHost of BLOCKED_HOSTS) {
      if (blockedHost.includes('/')) {
        // CIDR 표기법 처리 (간단한 구현)
        if (this.isInCidrRange(hostname, blockedHost)) {
          return true;
        }
      } else if (lowerHostname === blockedHost || lowerHostname.endsWith(`.${blockedHost}`)) {
        return true;
      }
    }

    return false;
  }

  // IP 주소 확인
  private isIpAddress(hostname: string): boolean {
    // IPv4 패턴
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 패턴 (간단한 버전)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
  }

  // CIDR 범위 확인 (간단한 구현)
  private isInCidrRange(ip: string, cidr: string): boolean {
    // 실제 구현에서는 더 정교한 CIDR 검사가 필요
    // 여기서는 기본적인 사설 IP 대역만 체크
    if (cidr === '10.0.0.0/8') {
      return ip.startsWith('10.');
    }
    if (cidr === '172.16.0.0/12') {
      const parts = ip.split('.');
      if (parts[0] === '172') {
        const second = parseInt(parts[1]);
        return second >= 16 && second <= 31;
      }
    }
    if (cidr === '192.168.0.0/16') {
      return ip.startsWith('192.168.');
    }
    return false;
  }

  // URL에서 스키마 가져오기
  async fetchFromUrl(urlString: string): Promise<FetchResult> {
    const parsedUrl = this.validateUrl(urlString);
    
    logger.info(`URL에서 스키마 가져오기 시작: ${urlString}`);

    return new Promise((resolve, reject) => {
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'EAI-Schema-Toolkit/1.0',
          'Accept': 'application/xml, text/xml, application/json, text/plain, */*',
          'Accept-Encoding': 'identity', // 압축 해제 복잡성 방지
        }
      };

      const request = client.request(options, (response) => {
        // 상태 코드 확인
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new NetworkError(`HTTP 오류: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        // Content-Length 확인
        const contentLength = response.headers['content-length'];
        if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
          reject(new ValidationError(`응답 크기가 너무 큽니다. 최대 ${MAX_RESPONSE_SIZE / 1024 / 1024}MB까지 허용됩니다.`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          
          // 실시간 크기 확인
          if (totalSize > MAX_RESPONSE_SIZE) {
            request.destroy();
            reject(new ValidationError(`응답 크기가 너무 큽니다. 최대 ${MAX_RESPONSE_SIZE / 1024 / 1024}MB까지 허용됩니다.`));
            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          const content = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'application/octet-stream';

          // 기본적인 내용 검증
          this.validateContent(content, contentType);

          const result: FetchResult = {
            content,
            contentType,
            size: totalSize,
            url: urlString,
            fetchedAt: new Date()
          };

          logger.info(`URL에서 스키마 가져오기 완료: ${urlString} (크기: ${totalSize} bytes)`);
          resolve(result);
        });

        response.on('error', (error) => {
          reject(new NetworkError(`응답 처리 중 오류: ${error.message}`));
        });
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new NetworkError(`요청 타임아웃: ${REQUEST_TIMEOUT}ms`));
      });

      request.on('error', (error) => {
        reject(new NetworkError(`네트워크 오류: ${error.message}`));
      });

      request.end();
    });
  }

  // 가져온 내용 기본 검증
  private validateContent(content: Buffer, contentType: string): void {
    if (content.length === 0) {
      throw new ValidationError('빈 응답입니다.');
    }

    // 내용 타입별 기본 검증
    const contentString = content.toString('utf8', 0, Math.min(1024, content.length));

    if (contentType.includes('xml')) {
      // XML 기본 구조 확인
      if (!contentString.includes('<') || !contentString.includes('>')) {
        throw new ValidationError('유효하지 않은 XML 형식입니다.');
      }

      // XXE 공격 방지
      if (contentString.includes('<!ENTITY') && contentString.includes('SYSTEM')) {
        throw new SecurityError('외부 엔티티 참조가 포함된 XML은 허용되지 않습니다.');
      }
    }

    if (contentType.includes('json')) {
      // JSON 기본 구조 확인
      if (!contentString.trim().startsWith('{') && !contentString.trim().startsWith('[')) {
        throw new ValidationError('유효하지 않은 JSON 형식입니다.');
      }
    }
  }

  // 지원되는 URL 스키마 확인
  isSupportedUrl(urlString: string): boolean {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const urlFetchService = new UrlFetchService();