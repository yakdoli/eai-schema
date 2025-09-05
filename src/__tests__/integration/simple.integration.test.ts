import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';

describe('간단한 통합 테스트', () => {
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

  describe('기본 API 테스트', () => {
    test('헬스체크 엔드포인트', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('메인 페이지', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message');
    });

    test('존재하지 않는 엔드포인트', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});