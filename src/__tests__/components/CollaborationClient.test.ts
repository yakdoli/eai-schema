/// <reference types="jest" />

// Mock Socket.IO client first
jest.mock('socket.io-client', () => ({
  io: jest.fn()
}));

import { CollaborationClient } from "../../components/CollaborationClient";
import { io } from 'socket.io-client';

// Mock Socket.IO
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  disconnect: jest.fn(),
  connected: true
};

const mockIo = io as jest.MockedFunction<typeof io>;

describe("CollaborationClient", () => {
  let collaborationClient: CollaborationClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo.mockReturnValue(mockSocket as any);
    collaborationClient = new CollaborationClient("http://localhost:3001");
  });

  afterEach(() => {
    collaborationClient.disconnect();
  });

  describe("연결 관리", () => {
    it("서버에 연결할 수 있어야 합니다", async () => {
      // Mock successful connection
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      await expect(collaborationClient.connect()).resolves.not.toThrow();
      expect(mockIo).toHaveBeenCalledWith("http://localhost:3001", {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });
    });

    it("연결 오류를 처리할 수 있어야 합니다", async () => {
      const error = new Error("Connection failed");
      
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(error), 0);
        }
      });

      await expect(collaborationClient.connect()).rejects.toThrow("Connection failed");
    });

    it("서버와의 연결을 해제할 수 있어야 합니다", async () => {
      // First connect
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.connect();
      
      // Then disconnect
      collaborationClient.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe("세션 관리", () => {
    beforeEach(async () => {
      // Mock successful connection
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.connect();
    });

    it("협업 세션에 참가할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const userId = "user-1";

      // Mock successful join
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'active-users') {
          setTimeout(callback, 0);
        }
      });

      await expect(collaborationClient.joinSession(sessionId, userId)).resolves.not.toThrow();
      expect(mockSocket.emit).toHaveBeenCalledWith('join-session', { sessionId, userId });
    });

    it("세션 참가 시간 초과를 처리할 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const userId = "user-1";

      // Mock timeout (no response)
      mockSocket.once.mockImplementation(() => {});

      await expect(collaborationClient.joinSession(sessionId, userId))
        .rejects.toThrow("세션 참가 시간 초과");
    });

    it("협업 세션에서 나갈 수 있어야 합니다", async () => {
      const sessionId = "test-session";
      const userId = "user-1";

      // First join
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'active-users') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.joinSession(sessionId, userId);

      // Then leave
      await collaborationClient.leaveSession();
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-session', { sessionId, userId });
    });
  });

  describe("그리드 변경사항 전송", () => {
    beforeEach(async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.connect();

      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'active-users') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.joinSession("test-session", "user-1");
    });

    it("그리드 변경사항을 전송할 수 있어야 합니다", () => {
      const change = {
        id: "change-1",
        type: "cell-update" as const,
        position: { row: 0, col: 0 },
        oldValue: "old",
        newValue: "new"
      };

      collaborationClient.sendGridChange(change);

      expect(mockSocket.emit).toHaveBeenCalledWith('grid-change', {
        ...change,
        sessionId: "test-session",
        userId: "user-1",
        timestamp: expect.any(Number)
      });
    });

    it("커서 위치를 전송할 수 있어야 합니다", () => {
      const position = { row: 1, col: 2 };

      collaborationClient.sendCursorMove(position);

      expect(mockSocket.emit).toHaveBeenCalledWith('cursor-move', {
        sessionId: "test-session",
        userId: "user-1",
        position
      });
    });

    it("선택 영역을 전송할 수 있어야 합니다", () => {
      const selection = { startRow: 0, startCol: 0, endRow: 2, endCol: 3 };

      collaborationClient.sendSelectionChange(selection);

      expect(mockSocket.emit).toHaveBeenCalledWith('selection-change', {
        sessionId: "test-session",
        userId: "user-1",
        selection
      });
    });
  });

  describe("이벤트 처리", () => {
    it("이벤트 리스너를 등록할 수 있어야 합니다", () => {
      const handler = jest.fn();
      collaborationClient.on('test-event', handler);

      // Simulate event
      (collaborationClient as any).emit('test-event', 'data');
      expect(handler).toHaveBeenCalledWith('data');
    });

    it("이벤트 리스너를 제거할 수 있어야 합니다", () => {
      const handler = jest.fn();
      collaborationClient.on('test-event', handler);
      collaborationClient.off('test-event', handler);

      // Simulate event
      (collaborationClient as any).emit('test-event', 'data');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("상태 확인", () => {
    it("연결 상태를 확인할 수 있어야 합니다", async () => {
      expect(collaborationClient.connected).toBe(false);

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.connect();

      expect(collaborationClient.connected).toBe(true);
    });

    it("현재 세션 ID를 확인할 수 있어야 합니다", async () => {
      expect(collaborationClient.currentSessionId).toBeNull();

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.connect();

      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'active-users') {
          setTimeout(callback, 0);
        }
      });
      await collaborationClient.joinSession("test-session", "user-1");

      expect(collaborationClient.currentSessionId).toBe("test-session");
    });
  });
});

// CollaborationUI는 DOM 환경이 필요하므로 별도 테스트 파일로 분리하거나 jsdom 환경에서 테스트
// 여기서는 핵심 CollaborationClient 기능만 테스트