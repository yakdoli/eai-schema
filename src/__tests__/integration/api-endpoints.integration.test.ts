import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../index';
// import path from 'path'; // 현재 사용되지 않음
// import fs from 'fs'; // 현재 사용되지 않음

describe('API 엔드포인트 통합 테스트', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    // 테스트용 앱 생성
    app = createApp();
    server = app.listen(0); // 랜덤 포트 사용
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('스키마 변환 API', () => {
    test('XML 파일 업로드 및 변환', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <schema>
          <element name="user" type="object">
            <property name="id" type="string" required="true"/>
            <property name="name" type="string" required="true"/>
            <property name="email" type="string" required="false"/>
          </element>
        </schema>`;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'xml')
        .field('targetFormat', 'json')
        .attach('file', Buffer.from(xmlContent), 'test.xml')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('json');
    });

    test('JSON 스키마 검증', async () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['id', 'name']
      };

      const response = await request(app)
        .post('/api/validate')
        .send({
          schema: JSON.stringify(jsonSchema),
          format: 'json'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
    });

    test('YAML 변환 테스트', async () => {
      const yamlContent = `
        type: object
        properties:
          user:
            type: object
            properties:
              id:
                type: string
              name:
                type: string
              email:
                type: string
                format: email
            required:
              - id
              - name
      `;

      const response = await request(app)
        .post('/api/convert')
        .field('format', 'yaml')
        .field('targetFormat', 'xml')
        .attach('file', Buffer.from(yamlContent), 'test.yaml')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('xml');
    });
  });

  describe('URL 기반 스키마 가져오기', () => {
    test('유효한 URL에서 스키마 가져오기', async () => {
      // 실제 테스트에서는 모킹된 URL을 사용
      const mockUrl = 'https://httpbin.org/json';
      
      const response = await request(app)
        .post('/api/fetch-schema')
        .send({
          url: mockUrl,
          format: 'json'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('schema');
    });

    test('잘못된 URL 처리', async () => {
      const response = await request(app)
        .post('/api/fetch-schema')
        .send({
          url: 'invalid-url',
          format: 'json'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('메시지 매핑 생성', () => {
    test('소스와 타겟 스키마로 매핑 생성', async () => {
      const sourceSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          userName: { type: 'string' }
        }
      };

      const targetSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };

      const response = await request(app)
        .post('/api/message-mapping')
        .send({
          sourceSchema: JSON.stringify(sourceSchema),
          targetSchema: JSON.stringify(targetSchema),
          sourceFormat: 'json',
          targetFormat: 'json'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mapping');
      expect(response.body.mapping).toHaveProperty('mappings');
    });
  });

  describe('API v2 엔드포인트', () => {
    test('API v2 버전 정보 조회', async () => {
      const response = await request(app)
        .get('/api/v2/version')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('apiVersion', 'v2');
    });

    test('API v2 문서 조회', async () => {
      const response = await request(app)
        .get('/api/v2/docs')
        .expect(200);

      expect(response.body).toHaveProperty('swagger');
    });
  });

  describe('성능 모니터링', () => {
    test('Prometheus 메트릭 조회', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    test('헬스체크 엔드포인트', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('에러 처리', () => {
    test('존재하지 않는 엔드포인트', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('잘못된 요청 형식', async () => {
      const response = await request(app)
        .post('/api/convert')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});