/// <reference types="jest" />
import request from "supertest";
import express from "express";
import collaborationRoutes, { initializeCollaborationService } from "../../routes/collaboration";
import { CollaborationService } from "../../services/CollaborationService";
import { Logger } from "../../core/logging/Logger";
import { CollaborationSession, ActiveUser } from "../../types/collaboration";

// Mock dependencies
jest.mock("../../services/CollaborationService");
jest.mock("../../core/logging/Logger");

const MockedCollaborationService = CollaborationService as jest.MockedClass<typeof CollaborationService>;

describe("Collaboration Routes", () => {
  let app: express.Application;
  let mockCollaborationService: jest.Mocked<CollaborationService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = new Logger('TestCollaborationRouter') as jest.Mocked<Logger>;
    mockCollaborationService = new MockedCollaborationService(mockLogger) as jest.Mocked<CollaborationService>;
    
    // Mock service methods
    mockCollaborationService.createSession = jest.fn();
    mockCollaborationService.getSession = jest.fn();
    mockCollaborationService.getActiveUsers = jest.fn();
    mockCollaborationService.joinSession = jest.fn();
    mockCollaborationService.leaveSession = jest.fn();
    mockCollaborationService.destroySession = jest.fn();
    mockCollaborationService.getActiveSessions = jest.fn();
    mockCollaborationService.broadcastChange = jest.fn();

    app = express();
    app.use(express.json());
    
    // Initialize collaboration service
    initializeCollaborationService(mockCollaborationService);
    app.use("/api/collaboration", collaborationRoutes);
  });

  describe("POST /sessions", () => {
    it("새 협업 세션을 생성할 수 있어야 합니다", async () => {
      const sessionData = {
        sessionId: "test-session",
        createdBy: "user-1"
      };

      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      const mockSession: CollaborationSession = {
        id: sessionData.sessionId,
        schemaId: sessionData.sessionId,
        name: `Schema ${sessionData.sessionId}`,
        createdBy: sessionData.createdBy,
        createdAt: mockDate,
        activeUsers: [],
        isActive: true,
        lastActivity: mockDate,
        settings: {
          maxUsers: 10,
          allowAnonymous: true,
          autoSave: true,
          autoSaveInterval: 30,
          conflictResolution: 'last-write-wins',
          enableCursorSync: true,
          enableSelectionSync: true
        }
      };

      mockCollaborationService.createSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .post("/api/collaboration/sessions")
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockSession.id);
      expect(response.body.data.createdBy).toBe(mockSession.createdBy);
      expect(response.body.data.isActive).toBe(mockSession.isActive);
      expect(mockCollaborationService.createSession).toHaveBeenCalledWith(
        sessionData.sessionId,
        sessionData.createdBy
      );
    });

    it("필수 필드가 누락되면 400 오류를 반환해야 합니다", async () => {
      const response = await request(app)
        .post("/api/collaboration/sessions")
        .send({ sessionId: "test-session" }) // createdBy 누락
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /sessions/:sessionId", () => {
    it("세션 정보를 조회할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      const mockSession: CollaborationSession = {
        id: sessionId,
        schemaId: sessionId,
        name: `Schema ${sessionId}`,
        createdBy: "user-1",
        createdAt: mockDate,
        activeUsers: [],
        isActive: true,
        lastActivity: mockDate,
        settings: {
          maxUsers: 10,
          allowAnonymous: true,
          autoSave: true,
          autoSaveInterval: 30,
          conflictResolution: 'last-write-wins',
          enableCursorSync: true,
          enableSelectionSync: true
        }
      };

      mockCollaborationService.getSession.mockReturnValue(mockSession);

      const response = await request(app)
        .get(`/api/collaboration/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockSession.id);
      expect(response.body.data.createdBy).toBe(mockSession.createdBy);
      expect(response.body.data.isActive).toBe(mockSession.isActive);
    });

    it("존재하지 않는 세션에 대해 404를 반환해야 합니다", async () => {
      mockCollaborationService.getSession.mockReturnValue(undefined);

      const response = await request(app)
        .get("/api/collaboration/sessions/non-existent")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("세션을 찾을 수 없습니다");
    });
  });

  describe("GET /sessions/:sessionId/users", () => {
    it("세션의 활성 사용자 목록을 조회할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      const mockUsers: ActiveUser[] = [
        {
          id: "user-1",
          name: "User 1",
          color: "#FF6B6B",
          joinedAt: mockDate,
          lastActivity: mockDate,
          permissions: [{ action: 'read', granted: true }],
          isOnline: true
        }
      ];

      mockCollaborationService.getActiveUsers.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get(`/api/collaboration/sessions/${sessionId}/users`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].id).toBe(mockUsers[0].id);
      expect(response.body.data[0].name).toBe(mockUsers[0].name);
      expect(response.body.data[0].color).toBe(mockUsers[0].color);
      expect(response.body.data[0].isOnline).toBe(mockUsers[0].isOnline);
    });
  });

  describe("POST /sessions/:sessionId/join", () => {
    it("세션에 참가할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const userId = "user-1";

      mockCollaborationService.joinSession.mockResolvedValue();

      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/join`)
        .send({ userId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("세션에 성공적으로 참가했습니다");
      expect(mockCollaborationService.joinSession).toHaveBeenCalledWith(sessionId, userId);
    });

    it("userId가 누락되면 400 오류를 반환해야 합니다", async () => {
      const response = await request(app)
        .post("/api/collaboration/sessions/test-session/join")
        .send({}) // userId 누락
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /sessions/:sessionId/leave", () => {
    it("세션에서 나갈 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const userId = "user-1";

      mockCollaborationService.leaveSession.mockResolvedValue();

      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/leave`)
        .send({ userId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("세션에서 성공적으로 나갔습니다");
      expect(mockCollaborationService.leaveSession).toHaveBeenCalledWith(sessionId, userId);
    });
  });

  describe("DELETE /sessions/:sessionId", () => {
    it("세션을 삭제할 수 있어야 합니다", async () => {
      const sessionId = "test-session";

      mockCollaborationService.destroySession.mockResolvedValue();

      const response = await request(app)
        .delete(`/api/collaboration/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("세션이 성공적으로 삭제되었습니다");
      expect(mockCollaborationService.destroySession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe("GET /sessions", () => {
    it("모든 활성 세션을 조회할 수 있어야 합니다", async () => {
      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      const mockSessions: CollaborationSession[] = [
        {
          id: "session-1",
          schemaId: "session-1",
          name: "Schema session-1",
          createdBy: "user-1",
          createdAt: mockDate,
          activeUsers: [],
          isActive: true,
          lastActivity: mockDate,
          settings: {
            maxUsers: 10,
            allowAnonymous: true,
            autoSave: true,
            autoSaveInterval: 30,
            conflictResolution: 'last-write-wins',
            enableCursorSync: true,
            enableSelectionSync: true
          }
        }
      ];

      mockCollaborationService.getActiveSessions.mockReturnValue(mockSessions);

      const response = await request(app)
        .get("/api/collaboration/sessions")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(mockSessions[0].id);
      expect(response.body.data[0].createdBy).toBe(mockSessions[0].createdBy);
      expect(response.body.data[0].isActive).toBe(mockSessions[0].isActive);
    });
  });

  describe("POST /sessions/:sessionId/changes", () => {
    it("그리드 변경사항을 브로드캐스트할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const change = {
        type: "cell-update",
        position: { row: 0, col: 0 },
        oldValue: "old",
        newValue: "new",
        userId: "user-1"
      };

      mockCollaborationService.broadcastChange.mockResolvedValue();

      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/changes`)
        .send(change)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("변경사항이 성공적으로 브로드캐스트되었습니다");
      expect(mockCollaborationService.broadcastChange).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          ...change,
          sessionId,
          timestamp: expect.any(Number),
          id: expect.any(String)
        })
      );
    });

    it("잘못된 변경사항 데이터에 대해 400 오류를 반환해야 합니다", async () => {
      const response = await request(app)
        .post("/api/collaboration/sessions/test-session/changes")
        .send({ type: "cell-update" }) // userId와 position 누락
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});