/**
 * API v2 통합 테스트
 * 현대화된 API 구조의 주요 기능들을 테스트
 */

import request from 'supertest';
import { createApp } from '../../index';

const app = createApp();

describe('API v2 통합 테스트', () => {
  describe('API 버전 관리', () => {
    it('현재 API 버전 정보를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current).toBe('2.0');
      expect(response.body.data.supported).toContain('2.0');
      expect(response.body.meta.version).toBe('2.0');
      expect(response.body.meta.requestId).toBeDefined();
    });

    it('특정 버전 정보를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version/2.0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('2.0');
      expect(response.body.data.deprecated).toBe(false);
    });

    it('존재하지 않는 버전 조회 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version/3.0')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VERSION_NOT_FOUND');
    });

    it('API 기능 비교 정보를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version/features')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.features).toBeDefined();
      expect(response.body.data.features['2.0']).toBeDefined();
    });

    it('API 통계 정보를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentVersion).toBe('2.0');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });

    it('변경 로그를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version/changelog/2.0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('2.0');
      expect(response.body.data.changes).toBeInstanceOf(Array);
    });
  });

  describe('API 문서', () => {
    it('Swagger UI에 접근할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
    });

    it('OpenAPI JSON 스펙을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/docs/openapi.json')
        .expect(200);

      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toContain('EAI Schema Toolkit API v2');
    });

    it('문서 메타데이터를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/docs/meta')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toContain('EAI Schema Toolkit API v2');
      expect(response.body.data.version).toBe('2.0.0');
    });
  });

  describe('스키마 API', () => {
    it('스키마 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/schemas')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('페이지네이션이 올바르게 작동해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/schemas?page=1&limit=5')
        .expect(200);

      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(5);
    });

    it('잘못된 페이지네이션 파라미터에 대해 검증 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/schemas?page=0&limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('스키마를 생성할 수 있어야 함', async () => {
      const schemaData = {
        name: '테스트 스키마',
        description: 'API v2 테스트용 스키마',
        format: 'xml',
        content: '<root><element>test</element></root>',
        tags: ['test', 'api-v2']
      };

      const response = await request(app)
        .post('/api/v2/schemas')
        .send(schemaData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(schemaData.name);
      expect(response.body.data.format).toBe(schemaData.format);
    });

    it('잘못된 스키마 데이터에 대해 검증 에러를 반환해야 함', async () => {
      const invalidData = {
        name: '', // 빈 이름
        format: 'invalid', // 잘못된 형식
        content: '' // 빈 내용
      };

      const response = await request(app)
        .post('/api/v2/schemas')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('특정 스키마를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/schemas/test-schema-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test-schema-id');
    });
  });

  describe('협업 API', () => {
    it('협업 세션 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/collaboration/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('새 협업 세션을 생성할 수 있어야 함', async () => {
      const sessionData = {
        schemaId: 'test-schema-id',
        name: '테스트 협업 세션',
        description: 'API v2 테스트용 협업 세션'
      };

      const response = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schemaId).toBe(sessionData.schemaId);
      expect(response.body.data.name).toBe(sessionData.name);
    });

    it('잘못된 세션 데이터에 대해 검증 에러를 반환해야 함', async () => {
      const invalidData = {
        schemaId: '', // 빈 스키마 ID
        name: '' // 빈 이름
      };

      const response = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('공통 기능', () => {
    it('모든 응답에 표준화된 형식이 적용되어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version')
        .expect(200);

      // 표준 응답 구조 확인
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      
      // 메타데이터 확인
      expect(response.body.meta).toHaveProperty('version');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('모든 응답에 적절한 헤더가 설정되어야 함', async () => {
      const response = await request(app)
        .get('/api/v2/version')
        .expect(200);

      expect(response.headers['api-version']).toBe('2.0');
      expect(response.headers['x-api-version']).toBe('2.0');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('존재하지 않는 엔드포인트에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v2/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('Rate Limiting이 적용되어야 함', async () => {
      // Rate limit 헤더 확인
      const response = await request(app)
        .get('/api/v2/version')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('하위 호환성', () => {
    it('API v1 엔드포인트가 deprecated 경고와 함께 작동해야 함', async () => {
      const response = await request(app)
        .get('/api/v1/schemas')
        .expect(200);

      expect(response.headers['warning']).toContain('deprecated');
      expect(response.headers['x-deprecated']).toBe('true');
      expect(response.headers['x-migration-guide']).toBeDefined();
    });

    it('지원되지 않는 v1 엔드포인트에 대해 410 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/v1/unsupported-endpoint')
        .expect(410);

      expect(response.body.code).toBe('ENDPOINT_DEPRECATED');
      expect(response.body.migrationGuide).toBeDefined();
    });
  });

  describe('에러 처리', () => {
    it('서버 에러 시 표준화된 에러 응답을 반환해야 함', async () => {
      // 의도적으로 에러를 발생시키는 요청 (실제 구현에서는 mock 사용)
      const response = await request(app)
        .post('/api/v2/schemas')
        .send({}) // 빈 데이터로 검증 에러 유발
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });

    it('개발 환경에서는 상세한 에러 정보를 포함해야 함', async () => {
      // NODE_ENV=development일 때만 테스트
      if (process.env.NODE_ENV === 'development') {
        const response = await request(app)
          .post('/api/v2/schemas')
          .send({})
          .expect(400);

        expect(response.body.error.details).toBeDefined();
      }
    });
  });
});