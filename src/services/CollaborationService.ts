import { Server, Socket } from "socket.io";
import { Logger } from "../core/logging/Logger";
import {
  CollaborationManager,
  CollaborationSession,
  ActiveUser,
  GridChange,
  EditConflict,
  ConflictResolution,
  CollaborationEvent,
  CollaborationEventType,
  UserColorManager,
  SessionSettings,
  UserPermission
} from "../types/collaboration";

/**
 * 사용자 색상 관리자 구현
 */
class UserColorManagerImpl implements UserColorManager {
  private readonly availableColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  private userColors = new Map<string, string>();
  private usedColors = new Set<string>();

  assignColor(userId: string): string {
    if (this.userColors.has(userId)) {
      return this.userColors.get(userId)!;
    }

    // 사용 가능한 색상 찾기
    const availableColor = this.availableColors.find(color => !this.usedColors.has(color));
    const color = availableColor || this.generateRandomColor();

    this.userColors.set(userId, color);
    this.usedColors.add(color);
    return color;
  }

  releaseColor(userId: string): void {
    const color = this.userColors.get(userId);
    if (color) {
      this.userColors.delete(userId);
      this.usedColors.delete(color);
    }
  }

  getUserColor(userId: string): string | null {
    return this.userColors.get(userId) || null;
  }

  getAvailableColors(): string[] {
    return this.availableColors.filter(color => !this.usedColors.has(color));
  }

  private generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
}

/**
 * 실시간 협업 시스템 구현
 */
export class CollaborationService implements CollaborationManager {
  private io: Server | null = null;
  private sessions = new Map<string, CollaborationSession>();
  private userSessions = new Map<string, string>(); // userId -> sessionId
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private userSockets = new Map<string, string>(); // userId -> socketId
  private colorManager = new UserColorManagerImpl();
  private conflictQueue = new Map<string, EditConflict[]>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Socket.IO 서버 초기화
   */
  initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
    this.logger.info("실시간 협업 시스템이 초기화되었습니다");
  }

  /**
   * 협업 세션 생성
   */
  async createSession(sessionId: string, createdBy: string): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: sessionId,
      schemaId: sessionId, // 스키마 ID와 세션 ID를 동일하게 사용
      name: `Schema ${sessionId}`,
      createdBy,
      createdAt: new Date(),
      activeUsers: [],
      isActive: true,
      lastActivity: new Date(),
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

    this.sessions.set(sessionId, session);
    this.logger.info(`협업 세션이 생성되었습니다: ${sessionId}`);
    return session;
  }

  /**
   * 협업 세션 참가
   */
  async joinSession(sessionId: string, userId: string): Promise<void> {
    let session = this.sessions.get(sessionId);
    
    // 세션이 없으면 생성
    if (!session) {
      session = await this.createSession(sessionId, userId);
    }

    // 이미 참가한 사용자인지 확인
    const existingUser = session.activeUsers.find(user => user.id === userId);
    if (existingUser) {
      existingUser.isOnline = true;
      existingUser.lastActivity = new Date();
    } else {
      // 새 사용자 추가
      const newUser: ActiveUser = {
        id: userId,
        name: `User ${userId}`,
        color: this.colorManager.assignColor(userId),
        joinedAt: new Date(),
        lastActivity: new Date(),
        permissions: [{ action: 'read', granted: true }, { action: 'write', granted: true }],
        isOnline: true
      };
      session.activeUsers.push(newUser);
    }

    this.userSessions.set(userId, sessionId);
    session.lastActivity = new Date();

    // 다른 사용자들에게 알림
    this.broadcastEvent(sessionId, {
      type: 'user-joined',
      sessionId,
      userId,
      timestamp: Date.now(),
      data: { user: session.activeUsers.find(u => u.id === userId) }
    });

    this.logger.info(`사용자 ${userId}가 세션 ${sessionId}에 참가했습니다`);
  }

  /**
   * 협업 세션 떠나기
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 사용자를 오프라인으로 표시
    const user = session.activeUsers.find(u => u.id === userId);
    if (user) {
      user.isOnline = false;
      user.lastActivity = new Date();
    }

    // 색상 해제
    this.colorManager.releaseColor(userId);
    
    // 매핑 정리
    this.userSessions.delete(userId);
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.socketUsers.delete(socketId);
      this.userSockets.delete(userId);
    }

    session.lastActivity = new Date();

    // 다른 사용자들에게 알림
    this.broadcastEvent(sessionId, {
      type: 'user-left',
      sessionId,
      userId,
      timestamp: Date.now(),
      data: { userId }
    });

    this.logger.info(`사용자 ${userId}가 세션 ${sessionId}에서 나갔습니다`);
  }

  /**
   * 변경사항 브로드캐스트
   */
  async broadcastChange(sessionId: string, change: GridChange): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 충돌 감지
    const conflict = await this.detectConflict(sessionId, change);
    if (conflict) {
      await this.handleConflict(sessionId, conflict);
      return;
    }

    // 변경사항 브로드캐스트
    this.broadcastEvent(sessionId, {
      type: 'grid-change',
      sessionId,
      userId: change.userId,
      timestamp: Date.now(),
      data: change
    });

    session.lastActivity = new Date();
    this.logger.debug(`그리드 변경사항이 브로드캐스트되었습니다: ${sessionId}`);
  }

  /**
   * 활성 사용자 목록 조회
   */
  async getActiveUsers(sessionId: string): Promise<ActiveUser[]> {
    const session = this.sessions.get(sessionId);
    return session ? session.activeUsers.filter(user => user.isOnline) : [];
  }

  /**
   * 세션 삭제
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 모든 사용자에게 알림
    this.broadcastEvent(sessionId, {
      type: 'session-destroyed',
      sessionId,
      userId: 'system',
      timestamp: Date.now(),
      data: { sessionId }
    });

    // 사용자 색상 해제
    session.activeUsers.forEach(user => {
      this.colorManager.releaseColor(user.id);
      this.userSessions.delete(user.id);
    });

    // 세션 삭제
    this.sessions.delete(sessionId);
    this.conflictQueue.delete(sessionId);

    this.logger.info(`협업 세션이 삭제되었습니다: ${sessionId}`);
  }

  /**
   * 충돌 처리
   */
  async handleConflict(sessionId: string, conflict: EditConflict): Promise<ConflictResolution> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    let resolution: ConflictResolution;

    switch (session.settings.conflictResolution) {
      case 'last-write-wins':
        resolution = {
          conflictId: conflict.id,
          resolution: 'accept-local',
          resolvedValue: conflict.conflictingChanges[conflict.conflictingChanges.length - 1].newValue,
          timestamp: Date.now()
        };
        break;

      case 'merge':
        // 간단한 병합 로직 (실제로는 더 복잡한 로직 필요)
        resolution = {
          conflictId: conflict.id,
          resolution: 'merge',
          resolvedValue: this.mergeValues(conflict.conflictingChanges),
          timestamp: Date.now()
        };
        break;

      default:
        resolution = {
          conflictId: conflict.id,
          resolution: 'manual',
          timestamp: Date.now()
        };
        break;
    }

    // 충돌 해결 알림
    this.broadcastEvent(sessionId, {
      type: 'conflict-resolved',
      sessionId,
      userId: 'system',
      timestamp: Date.now(),
      data: { conflict, resolution }
    });

    this.logger.info(`충돌이 해결되었습니다: ${conflict.id}`);
    return resolution;
  }

  /**
   * Socket.IO 이벤트 핸들러 설정
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.logger.debug(`소켓 연결: ${socket.id}`);

      // 세션 참가
      socket.on('join-session', async (data: { sessionId: string; userId: string }) => {
        try {
          this.socketUsers.set(socket.id, data.userId);
          this.userSockets.set(data.userId, socket.id);
          
          socket.join(data.sessionId);
          await this.joinSession(data.sessionId, data.userId);
          
          // 현재 활성 사용자 목록 전송
          const activeUsers = await this.getActiveUsers(data.sessionId);
          socket.emit('active-users', activeUsers);
        } catch (error) {
          this.logger.error('세션 참가 오류', { error, data });
          socket.emit('error', { message: '세션 참가에 실패했습니다' });
        }
      });

      // 세션 떠나기
      socket.on('leave-session', async (data: { sessionId: string; userId: string }) => {
        try {
          socket.leave(data.sessionId);
          await this.leaveSession(data.sessionId, data.userId);
        } catch (error) {
          this.logger.error('세션 떠나기 오류', { error, data });
        }
      });

      // 그리드 변경
      socket.on('grid-change', async (change: GridChange) => {
        try {
          await this.broadcastChange(change.sessionId, change);
        } catch (error) {
          this.logger.error('그리드 변경 브로드캐스트 오류', { error, change });
        }
      });

      // 커서 이동
      socket.on('cursor-move', (data: { sessionId: string; userId: string; position: any }) => {
        this.broadcastEvent(data.sessionId, {
          type: 'cursor-move',
          sessionId: data.sessionId,
          userId: data.userId,
          timestamp: Date.now(),
          data: data.position
        }, socket.id);
      });

      // 선택 영역 변경
      socket.on('selection-change', (data: { sessionId: string; userId: string; selection: any }) => {
        this.broadcastEvent(data.sessionId, {
          type: 'selection-change',
          sessionId: data.sessionId,
          userId: data.userId,
          timestamp: Date.now(),
          data: data.selection
        }, socket.id);
      });

      // 연결 해제
      socket.on('disconnect', async () => {
        const userId = this.socketUsers.get(socket.id);
        if (userId) {
          const sessionId = this.userSessions.get(userId);
          if (sessionId) {
            await this.leaveSession(sessionId, userId);
          }
        }
        this.logger.debug(`소켓 연결 해제: ${socket.id}`);
      });
    });
  }

  /**
   * 이벤트 브로드캐스트
   */
  private broadcastEvent(sessionId: string, event: CollaborationEvent, excludeSocketId?: string): void {
    if (!this.io) return;

    if (excludeSocketId) {
      this.io.to(sessionId).except(excludeSocketId).emit('collaboration-event', event);
    } else {
      this.io.to(sessionId).emit('collaboration-event', event);
    }
  }

  /**
   * 충돌 감지
   */
  private async detectConflict(sessionId: string, change: GridChange): Promise<EditConflict | null> {
    // 간단한 충돌 감지 로직
    // 실제로는 더 정교한 로직이 필요
    const conflicts = this.conflictQueue.get(sessionId) || [];
    
    // 같은 위치에 대한 동시 편집 감지
    const recentChanges = conflicts.filter(conflict => 
      conflict.position.row === change.position.row &&
      conflict.position.col === change.position.col &&
      Date.now() - conflict.timestamp < 1000 // 1초 이내
    );

    if (recentChanges.length > 0) {
      const conflict: EditConflict = {
        id: this.generateId(),
        sessionId,
        position: change.position,
        conflictingChanges: [...recentChanges.flatMap(c => c.conflictingChanges), change],
        timestamp: Date.now()
      };

      return conflict;
    }

    return null;
  }

  /**
   * 값 병합
   */
  private mergeValues(changes: GridChange[]): any {
    // 간단한 병합 로직 - 마지막 값 사용
    return changes[changes.length - 1]?.newValue;
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 세션 정보 조회
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 모든 활성 세션 조회
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }
}