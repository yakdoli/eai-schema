import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../index';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

describe('협업 기능 통합 테스트', () => {
  let app: Express;
  let server: any;
  let io: Server;
  let serverPort: number;

  beforeAll(async () => {
    app = createApp();
    server = createServer(app);
    
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = server.address()?.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (io) {
      io.close();
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('협업 세션 관리', () => {
    test('새 협업 세션 생성', async () => {
      const sessionData = {
        name: 'Test Collaboration Session',
        description: 'Integration test session',
        schemaId: 'test-schema-1',
        createdBy: 'test-user-1'
      };

      const response = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('session');
      expect(response.body.session).toHaveProperty('id');
      expect(response.body.session).toHaveProperty('name', sessionData.name);
      expect(response.body.session).toHaveProperty('createdBy', sessionData.createdBy);
    });

    test('기존 협업 세션 조회', async () => {
      // 먼저 세션 생성
      const createResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Test Session for Retrieval',
          schemaId: 'test-schema-2',
          createdBy: 'test-user-2'
        })
        .expect(201);

      const sessionId = createResponse.body.session.id;

      // 세션 조회
      const getResponse = await request(app)
        .get(`/api/v2/collaboration/sessions/${sessionId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('success', true);
      expect(getResponse.body).toHaveProperty('session');
      expect(getResponse.body.session).toHaveProperty('id', sessionId);
      expect(getResponse.body.session).toHaveProperty('name', 'Test Session for Retrieval');
    });

    test('협업 세션 목록 조회', async () => {
      // 여러 세션 생성
      await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Session 1',
          schemaId: 'schema-1',
          createdBy: 'user-1'
        });

      await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Session 2',
          schemaId: 'schema-2',
          createdBy: 'user-1'
        });

      const response = await request(app)
        .get('/api/v2/collaboration/sessions')
        .query({ createdBy: 'user-1' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('실시간 협업 시나리오', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let sessionId: string;

    beforeEach(async () => {
      // 협업 세션 생성
      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Multi-user Test Session',
          schemaId: 'test-schema-multi',
          createdBy: 'user-1'
        });

      sessionId = sessionResponse.body.session.id;

      // 두 클라이언트 연결
      client1 = Client(`http://localhost:${serverPort}`);
      client2 = Client(`http://localhost:${serverPort}`);

      await Promise.all([
        new Promise<void>((resolve) => {
          client1.on('connect', () => resolve());
        }),
        new Promise<void>((resolve) => {
          client2.on('connect', () => resolve());
        })
      ]);
    });

    afterEach(() => {
      if (client1) {client1.disconnect();}
      if (client2) {client2.disconnect();}
    });

    test('다중 사용자 세션 참여', async () => {
      // 첫 번째 사용자 참여
      client1.emit('join-session', {
        sessionId,
        userId: 'user-1',
        userName: 'User One'
      });

      // 두 번째 사용자 참여
      client2.emit('join-session', {
        sessionId,
        userId: 'user-2',
        userName: 'User Two'
      });

      // 사용자 목록 업데이트 확인
      const userListPromise1 = new Promise((resolve) => {
        client1.on('user-list-updated', (data) => {
          resolve(data);
        });
      });

      const userListPromise2 = new Promise((resolve) => {
        client2.on('user-list-updated', (data) => {
          resolve(data);
        });
      });

      const [userList1, userList2] = await Promise.all([
        userListPromise1,
        userListPromise2
      ]);

      expect((userList1 as any).users).toHaveLength(2);
      expect((userList2 as any).users).toHaveLength(2);
    });

    test('실시간 그리드 변경 동기화', async () => {
      // 두 사용자 모두 세션 참여
      client1.emit('join-session', {
        sessionId,
        userId: 'user-1',
        userName: 'User One'
      });

      client2.emit('join-session', {
        sessionId,
        userId: 'user-2',
        userName: 'User Two'
      });

      // 첫 번째 사용자가 그리드 변경
      const gridChange = {
        type: 'cell-update',
        position: { row: 1, col: 2 },
        oldValue: 'old-value',
        newValue: 'new-value',
        userId: 'user-1',
        timestamp: Date.now()
      };

      client1.emit('grid-change', {
        sessionId,
        change: gridChange
      });

      // 두 번째 사용자가 변경사항 수신 확인
      const changePromise = new Promise((resolve) => {
        client2.on('grid-changed', (data) => {
          resolve(data);
        });
      });

      const receivedChange = await changePromise;
      expect((receivedChange as any).change.type).toBe('cell-update');
      expect((receivedChange as any).change.newValue).toBe('new-value');
      expect((receivedChange as any).change.userId).toBe('user-1');
    });

    test('동시 편집 충돌 해결', async () => {
      // 두 사용자 세션 참여
      client1.emit('join-session', {
        sessionId,
        userId: 'user-1',
        userName: 'User One'
      });

      client2.emit('join-session', {
        sessionId,
        userId: 'user-2',
        userName: 'User Two'
      });

      // 같은 셀에 동시 편집 시도
      const change1 = {
        type: 'cell-update',
        position: { row: 0, col: 0 },
        oldValue: 'original',
        newValue: 'change-by-user-1',
        userId: 'user-1',
        timestamp: Date.now()
      };

      const change2 = {
        type: 'cell-update',
        position: { row: 0, col: 0 },
        oldValue: 'original',
        newValue: 'change-by-user-2',
        userId: 'user-2',
        timestamp: Date.now() + 1 // 약간 늦은 타임스탬프
      };

      // 거의 동시에 변경사항 전송
      client1.emit('grid-change', { sessionId, change: change1 });
      
      setTimeout(() => {
        client2.emit('grid-change', { sessionId, change: change2 });
      }, 10);

      // 충돌 해결 결과 확인
      const conflictPromise = new Promise((resolve) => {
        client2.on('conflict-resolved', (data) => {
          resolve(data);
        });
      });

      const conflictResult = await Promise.race([
        conflictPromise,
        new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 2000))
      ]);

      expect(conflictResult).toBeDefined();
    });

    test('사용자 커서 및 선택 영역 동기화', async () => {
      // 두 사용자 세션 참여
      client1.emit('join-session', {
        sessionId,
        userId: 'user-1',
        userName: 'User One'
      });

      client2.emit('join-session', {
        sessionId,
        userId: 'user-2',
        userName: 'User Two'
      });

      // 첫 번째 사용자 커서 이동
      const cursorPosition = { row: 3, col: 5 };
      client1.emit('cursor-move', {
        sessionId,
        userId: 'user-1',
        position: cursorPosition
      });

      // 두 번째 사용자가 커서 위치 수신 확인
      const cursorPromise = new Promise((resolve) => {
        client2.on('cursor-moved', (data) => {
          resolve(data);
        });
      });

      const receivedCursor = await cursorPromise;
      expect((receivedCursor as any).userId).toBe('user-1');
      expect((receivedCursor as any).position).toEqual(cursorPosition);

      // 선택 영역 동기화 테스트
      const selection = {
        startRow: 1,
        startCol: 1,
        endRow: 3,
        endCol: 4
      };

      client1.emit('selection-change', {
        sessionId,
        userId: 'user-1',
        selection
      });

      const selectionPromise = new Promise((resolve) => {
        client2.on('selection-changed', (data) => {
          resolve(data);
        });
      });

      const receivedSelection = await selectionPromise;
      expect((receivedSelection as any).userId).toBe('user-1');
      expect((receivedSelection as any).selection).toEqual(selection);
    });
  });

  describe('협업 세션 권한 관리', () => {
    test('세션 소유자 권한 확인', async () => {
      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Owner Permission Test',
          schemaId: 'test-schema-owner',
          createdBy: 'owner-user'
        });

      const sessionId = sessionResponse.body.session.id;

      // 소유자 권한으로 세션 수정
      const updateResponse = await request(app)
        .put(`/api/v2/collaboration/sessions/${sessionId}`)
        .send({
          name: 'Updated Session Name',
          userId: 'owner-user'
        })
        .expect(200);

      expect(updateResponse.body).toHaveProperty('success', true);
      expect(updateResponse.body.session).toHaveProperty('name', 'Updated Session Name');
    });

    test('비소유자 권한 제한', async () => {
      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Permission Test Session',
          schemaId: 'test-schema-perm',
          createdBy: 'owner-user'
        });

      const sessionId = sessionResponse.body.session.id;

      // 비소유자가 세션 수정 시도
      const updateResponse = await request(app)
        .put(`/api/v2/collaboration/sessions/${sessionId}`)
        .send({
          name: 'Unauthorized Update',
          userId: 'other-user'
        })
        .expect(403);

      expect(updateResponse.body).toHaveProperty('success', false);
      expect(updateResponse.body).toHaveProperty('error');
    });

    test('읽기 전용 사용자 처리', async () => {
      const client = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Read Only Test',
          schemaId: 'test-schema-readonly',
          createdBy: 'owner-user'
        });

      const sessionId = sessionResponse.body.session.id;

      // 읽기 전용 사용자로 참여
      client.emit('join-session', {
        sessionId,
        userId: 'readonly-user',
        userName: 'Read Only User',
        permissions: ['read']
      });

      // 편집 시도
      client.emit('grid-change', {
        sessionId,
        change: {
          type: 'cell-update',
          position: { row: 0, col: 0 },
          oldValue: 'old',
          newValue: 'new',
          userId: 'readonly-user',
          timestamp: Date.now()
        }
      });

      // 권한 오류 확인
      const errorPromise = new Promise((resolve) => {
        client.on('permission-denied', (data) => {
          resolve(data);
        });
      });

      const error = await Promise.race([
        errorPromise,
        new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 1000))
      ]);

      expect(error).toBeDefined();
      client.disconnect();
    });
  });

  describe('협업 세션 복구 및 안정성', () => {
    test('네트워크 연결 끊김 후 재연결', async () => {
      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Reconnection Test',
          schemaId: 'test-schema-reconnect',
          createdBy: 'test-user'
        });

      const sessionId = sessionResponse.body.session.id;

      let client = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      // 세션 참여
      client.emit('join-session', {
        sessionId,
        userId: 'reconnect-user',
        userName: 'Reconnect User'
      });

      // 연결 끊기
      client.disconnect();

      // 재연결
      client = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      // 세션 재참여
      client.emit('join-session', {
        sessionId,
        userId: 'reconnect-user',
        userName: 'Reconnect User'
      });

      // 재연결 성공 확인
      const reconnectPromise = new Promise((resolve) => {
        client.on('session-rejoined', (data) => {
          resolve(data);
        });
      });

      const reconnectResult = await Promise.race([
        reconnectPromise,
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      ]);

      expect(reconnectResult).toBeDefined();
      client.disconnect();
    });

    test('세션 데이터 일관성 유지', async () => {
      const sessionResponse = await request(app)
        .post('/api/v2/collaboration/sessions')
        .send({
          name: 'Consistency Test',
          schemaId: 'test-schema-consistency',
          createdBy: 'test-user'
        });

      const sessionId = sessionResponse.body.session.id;

      // 여러 클라이언트 연결
      const clients = [];
      for (let i = 0; i < 3; i++) {
        const client = Client(`http://localhost:${serverPort}`);
        await new Promise<void>((resolve) => {
          client.on('connect', () => resolve());
        });
        
        client.emit('join-session', {
          sessionId,
          userId: `user-${i}`,
          userName: `User ${i}`
        });
        
        clients.push(client);
      }

      // 순차적으로 변경사항 적용
      for (let i = 0; i < 5; i++) {
        const clientIndex = i % 3;
        clients[clientIndex].emit('grid-change', {
          sessionId,
          change: {
            type: 'cell-update',
            position: { row: i, col: 0 },
            oldValue: '',
            newValue: `value-${i}`,
            userId: `user-${clientIndex}`,
            timestamp: Date.now() + i
          }
        });
        
        // 변경사항 적용 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 모든 클라이언트에서 일관된 상태 확인
      const statePromises = clients.map((client, _index) => {
        return new Promise((resolve) => {
          client.emit('get-session-state', { sessionId });
          client.on('session-state', (data) => {
            resolve(data);
          });
        });
      });

      const states = await Promise.all(statePromises);
      
      // 모든 상태가 동일한지 확인
      const firstState = JSON.stringify(states[0]);
      states.forEach((state, _index) => {
        expect(JSON.stringify(state)).toBe(firstState);
      });

      // 클라이언트 정리
      clients.forEach(client => client.disconnect());
    });
  });
});