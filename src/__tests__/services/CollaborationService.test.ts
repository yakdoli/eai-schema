/// <reference types="jest" />
import { CollaborationService } from "../../services/CollaborationService";
import { Logger } from "../../core/logging/Logger";
import { Server } from "socket.io";
import { createServer } from "http";
import { GridChange, EditConflict } from "../../types/collaboration";

// Mock Logger
jest.mock("../../core/logging/Logger");

describe("CollaborationService", () => {
  let collaborationService: CollaborationService;
  let mockLogger: jest.Mocked<Logger>;
  let httpServer: any;
  let io: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = new Logger('TestCollaborationService') as jest.Mocked<Logger>;
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.debug = jest.fn();
    mockLogger.warn = jest.fn();
    
    collaborationService = new CollaborationService(mockLogger);
    
    // Mock HTTP server and Socket.IO
    httpServer = createServer();
    io = new Server(httpServer);
    collaborationService.initialize(io);
  });

  afterEach(() => {
    if (httpServer) {
      httpServer.close();
    }
  });

  describe("세션 관리", () => {
    it("새 협업 세션을 생성할 수 있어야 합니다", async () => {
      const sessionId = "test-session-1";
      const createdBy = "user-1";

      const session = await collaborationService.createSession(sessionId, createdBy);

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.createdBy).toBe(createdBy);
      expect(session.isActive).toBe(true);
      expect(session.activeUsers).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(`협업 세션이 생성되었습니다: ${sessionId}`);
    });

    it("사용자가 세션에 참가할 수 있어야 합니다", async () => {
      const sessionId = "test-session-2";
      const userId = "user-1";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.joinSession(sessionId, userId);

      const session = collaborationService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.activeUsers).toHaveLength(1);
      expect(session!.activeUsers[0].id).toBe(userId);
      expect(session!.activeUsers[0].isOnline).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(`사용자 ${userId}가 세션 ${sessionId}에 참가했습니다`);
    });

    it("사용자가 세션에서 나갈 수 있어야 합니다", async () => {
      const sessionId = "test-session-3";
      const userId = "user-1";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.joinSession(sessionId, userId);
      await collaborationService.leaveSession(sessionId, userId);

      const session = collaborationService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.activeUsers[0].isOnline).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(`사용자 ${userId}가 세션 ${sessionId}에서 나갔습니다`);
    });

    it("세션을 삭제할 수 있어야 합니다", async () => {
      const sessionId = "test-session-4";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.destroySession(sessionId);

      const session = collaborationService.getSession(sessionId);
      expect(session).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(`협업 세션이 삭제되었습니다: ${sessionId}`);
    });

    it("존재하지 않는 세션에 참가하면 새 세션이 생성되어야 합니다", async () => {
      const sessionId = "new-session";
      const userId = "user-1";

      await collaborationService.joinSession(sessionId, userId);

      const session = collaborationService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.id).toBe(sessionId);
      expect(session!.createdBy).toBe(userId);
    });
  });

  describe("활성 사용자 관리", () => {
    it("활성 사용자 목록을 조회할 수 있어야 합니다", async () => {
      const sessionId = "test-session-5";
      const userId1 = "user-1";
      const userId2 = "user-2";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.joinSession(sessionId, userId1);
      await collaborationService.joinSession(sessionId, userId2);

      const activeUsers = await collaborationService.getActiveUsers(sessionId);
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.map(u => u.id)).toContain(userId1);
      expect(activeUsers.map(u => u.id)).toContain(userId2);
    });

    it("오프라인 사용자는 활성 사용자 목록에서 제외되어야 합니다", async () => {
      const sessionId = "test-session-6";
      const userId1 = "user-1";
      const userId2 = "user-2";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.joinSession(sessionId, userId1);
      await collaborationService.joinSession(sessionId, userId2);
      await collaborationService.leaveSession(sessionId, userId1);

      const activeUsers = await collaborationService.getActiveUsers(sessionId);
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].id).toBe(userId2);
    });

    it("존재하지 않는 세션의 활성 사용자 목록은 빈 배열이어야 합니다", async () => {
      const activeUsers = await collaborationService.getActiveUsers("non-existent");
      expect(activeUsers).toEqual([]);
    });
  });

  describe("그리드 변경사항 브로드캐스트", () => {
    it("그리드 변경사항을 브로드캐스트할 수 있어야 합니다", async () => {
      const sessionId = "test-session-7";
      const userId = "user-1";

      await collaborationService.createSession(sessionId, "creator");
      await collaborationService.joinSession(sessionId, userId);

      const change: GridChange = {
        id: "change-1",
        type: "cell-update",
        position: { row: 0, col: 0 },
        oldValue: "old",
        newValue: "new",
        userId,
        timestamp: Date.now(),
        sessionId
      };

      // 브로드캐스트가 오류 없이 실행되어야 합니다
      await expect(collaborationService.broadcastChange(sessionId, change)).resolves.not.toThrow();
    });

    it("존재하지 않는 세션에 변경사항을 브로드캐스트해도 오류가 발생하지 않아야 합니다", async () => {
      const change: GridChange = {
        id: "change-1",
        type: "cell-update",
        position: { row: 0, col: 0 },
        oldValue: "old",
        newValue: "new",
        userId: "user-1",
        timestamp: Date.now(),
        sessionId: "non-existent"
      };

      await expect(collaborationService.broadcastChange("non-existent", change)).resolves.not.toThrow();
    });
  });

  describe("충돌 처리", () => {
    it("last-write-wins 전략으로 충돌을 해결할 수 있어야 합니다", async () => {
      const sessionId = "test-session-8";
      
      await collaborationService.createSession(sessionId, "creator");

      const conflict: EditConflict = {
        id: "conflict-1",
        sessionId,
        position: { row: 0, col: 0 },
        conflictingChanges: [
          {
            id: "change-1",
            type: "cell-update",
            position: { row: 0, col: 0 },
            oldValue: "old",
            newValue: "value1",
            userId: "user-1",
            timestamp: Date.now() - 1000,
            sessionId
          },
          {
            id: "change-2",
            type: "cell-update",
            position: { row: 0, col: 0 },
            oldValue: "old",
            newValue: "value2",
            userId: "user-2",
            timestamp: Date.now(),
            sessionId
          }
        ],
        timestamp: Date.now()
      };

      const resolution = await collaborationService.handleConflict(sessionId, conflict);

      expect(resolution).toBeDefined();
      expect(resolution.conflictId).toBe(conflict.id);
      expect(resolution.resolution).toBe('accept-local');
      expect(resolution.resolvedValue).toBe('value2'); // 마지막 값
      expect(mockLogger.info).toHaveBeenCalledWith(`충돌이 해결되었습니다: ${conflict.id}`);
    });

    it("존재하지 않는 세션의 충돌 처리 시 오류가 발생해야 합니다", async () => {
      const conflict: EditConflict = {
        id: "conflict-1",
        sessionId: "non-existent",
        position: { row: 0, col: 0 },
        conflictingChanges: [],
        timestamp: Date.now()
      };

      await expect(collaborationService.handleConflict("non-existent", conflict))
        .rejects.toThrow("세션을 찾을 수 없습니다: non-existent");
    });
  });

  describe("세션 조회", () => {
    it("존재하지 않는 세션에 대해 undefined를 반환해야 합니다", () => {
      const session = collaborationService.getSession("non-existent");
      expect(session).toBeUndefined();
    });

    it("활성 세션 목록을 조회할 수 있어야 합니다", async () => {
      await collaborationService.createSession("session-1", "creator-1");
      await collaborationService.createSession("session-2", "creator-2");

      const activeSessions = collaborationService.getActiveSessions();
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.id)).toContain("session-1");
      expect(activeSessions.map(s => s.id)).toContain("session-2");
    });

    it("비활성 세션은 활성 세션 목록에서 제외되어야 합니다", async () => {
      await collaborationService.createSession("session-1", "creator-1");
      await collaborationService.createSession("session-2", "creator-2");
      await collaborationService.destroySession("session-1");

      const activeSessions = collaborationService.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe("session-2");
    });
  });

  describe("초기화", () => {
    it("Socket.IO 서버로 초기화되어야 합니다", () => {
      const newService = new CollaborationService(mockLogger);
      
      expect(() => {
        newService.initialize(io);
      }).not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith("실시간 협업 시스템이 초기화되었습니다");
    });
  });
});