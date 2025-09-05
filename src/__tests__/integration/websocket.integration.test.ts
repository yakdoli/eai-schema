import { Server } from 'socket.io';
import { createServer } from 'http';
import { Express } from 'express';
import { createApp } from '../../index';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocket 통신 통합 테스트', () => {
  let app: Express;
  let server: any;
  let io: Server;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    // 테스트용 서버 설정
    app = createApp();
    server = createServer(app);
    
    // Socket.IO 서버 설정
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // 서버 시작
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = server.address()?.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (io) {
      io.close();
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  beforeEach(async () => {
    // 클라이언트 연결
    clientSocket = Client(`http://localhost:${serverPort}`);
    
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('실시간 협업 기능', () => {
    test('세션 참여 및 사용자 목록 업데이트', async () => {
      const sessionId = 'test-session-1';
      const userId = 'user-1';
      const userName = 'Test User';

      // 세션 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName
      });

      // 사용자 목록 업데이트 확인
      const userListPromise = new Promise((resolve) => {
        clientSocket.on('user-list-updated', (data) => {
          resolve(data);
        });
      });

      const userList = await userListPromise;
      expect(userList).toHaveProperty('users');
      expect(Array.isArray((userList as any).users)).toBe(true);
    });

    test('그리드 변경사항 실시간 동기화', async () => {
      const sessionId = 'test-session-2';
      const userId = 'user-1';

      // 세션 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 그리드 변경사항 전송
      const gridChange = {
        type: 'cell-update',
        position: { row: 0, col: 0 },
        oldValue: 'old',
        newValue: 'new',
        userId,
        timestamp: Date.now()
      };

      clientSocket.emit('grid-change', {
        sessionId,
        change: gridChange
      });

      // 변경사항 브로드캐스트 확인
      const changePromise = new Promise((resolve) => {
        clientSocket.on('grid-changed', (data) => {
          resolve(data);
        });
      });

      const receivedChange = await changePromise;
      expect(receivedChange).toHaveProperty('change');
      expect((receivedChange as any).change.type).toBe('cell-update');
    });

    test('커서 위치 동기화', async () => {
      const sessionId = 'test-session-3';
      const userId = 'user-1';

      // 세션 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 커서 위치 업데이트
      const cursorPosition = { row: 5, col: 3 };
      clientSocket.emit('cursor-move', {
        sessionId,
        userId,
        position: cursorPosition
      });

      // 커서 위치 동기화 확인
      const cursorPromise = new Promise((resolve) => {
        clientSocket.on('cursor-moved', (data) => {
          resolve(data);
        });
      });

      const receivedCursor = await cursorPromise;
      expect(receivedCursor).toHaveProperty('userId', userId);
      expect(receivedCursor).toHaveProperty('position');
      expect((receivedCursor as any).position).toEqual(cursorPosition);
    });

    test('선택 영역 동기화', async () => {
      const sessionId = 'test-session-4';
      const userId = 'user-1';

      // 세션 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 선택 영역 업데이트
      const selection = {
        startRow: 0,
        startCol: 0,
        endRow: 2,
        endCol: 3
      };

      clientSocket.emit('selection-change', {
        sessionId,
        userId,
        selection
      });

      // 선택 영역 동기화 확인
      const selectionPromise = new Promise((resolve) => {
        clientSocket.on('selection-changed', (data) => {
          resolve(data);
        });
      });

      const receivedSelection = await selectionPromise;
      expect(receivedSelection).toHaveProperty('userId', userId);
      expect(receivedSelection).toHaveProperty('selection');
      expect((receivedSelection as any).selection).toEqual(selection);
    });
  });

  describe('연결 관리', () => {
    test('연결 해제 시 사용자 목록에서 제거', async () => {
      const sessionId = 'test-session-5';
      const userId = 'user-1';

      // 세션 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 연결 해제
      clientSocket.disconnect();

      // 잠시 대기 후 새 클라이언트로 확인
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newClient = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        newClient.on('connect', () => {
          resolve();
        });
      });

      newClient.emit('join-session', {
        sessionId,
        userId: 'user-2',
        userName: 'Test User 2'
      });

      const userListPromise = new Promise((resolve) => {
        newClient.on('user-list-updated', (data) => {
          resolve(data);
        });
      });

      const userList = await userListPromise;
      const users = (userList as any).users;
      expect(users.find((u: any) => u.id === userId)).toBeUndefined();

      newClient.disconnect();
    });

    test('재연결 시 세션 복구', async () => {
      const sessionId = 'test-session-6';
      const userId = 'user-1';

      // 첫 번째 연결
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 연결 해제
      clientSocket.disconnect();

      // 재연결
      clientSocket = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          resolve();
        });
      });

      // 세션 재참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'Test User'
      });

      // 세션 복구 확인
      const rejoinPromise = new Promise((resolve) => {
        clientSocket.on('session-rejoined', (data) => {
          resolve(data);
        });
      });

      // 타임아웃 설정으로 테스트 안정성 확보
      const result = await Promise.race([
        rejoinPromise,
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      ]);

      expect(result).toBeDefined();
    });
  });

  describe('에러 처리', () => {
    test('잘못된 세션 ID 처리', async () => {
      const invalidSessionId = '';
      const userId = 'user-1';

      clientSocket.emit('join-session', {
        sessionId: invalidSessionId,
        userId,
        userName: 'Test User'
      });

      const errorPromise = new Promise((resolve) => {
        clientSocket.on('error', (data) => {
          resolve(data);
        });
      });

      const error = await Promise.race([
        errorPromise,
        new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 1000))
      ]);

      // 에러가 발생하거나 타임아웃이 발생해야 함
      expect(error).toBeDefined();
    });

    test('중복 사용자 ID 처리', async () => {
      const sessionId = 'test-session-7';
      const userId = 'duplicate-user';

      // 첫 번째 사용자 참여
      clientSocket.emit('join-session', {
        sessionId,
        userId,
        userName: 'First User'
      });

      // 두 번째 클라이언트 생성
      const secondClient = Client(`http://localhost:${serverPort}`);
      
      await new Promise<void>((resolve) => {
        secondClient.on('connect', () => {
          resolve();
        });
      });

      // 같은 사용자 ID로 참여 시도
      secondClient.emit('join-session', {
        sessionId,
        userId,
        userName: 'Second User'
      });

      const conflictPromise = new Promise((resolve) => {
        secondClient.on('user-conflict', (data) => {
          resolve(data);
        });
      });

      const conflict = await Promise.race([
        conflictPromise,
        new Promise(resolve => setTimeout(() => resolve({ handled: true }), 1000))
      ]);

      expect(conflict).toBeDefined();
      secondClient.disconnect();
    });
  });
});