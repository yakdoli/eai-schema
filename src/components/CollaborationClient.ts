import { io, Socket } from 'socket.io-client';
import {
  ActiveUser,
  GridChange,
  CollaborationEvent,
  CursorPosition,
  SelectionRange
} from '../types/collaboration';

/**
 * 클라이언트 사이드 협업 관리자
 */
export class CollaborationClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private isConnected = false;
  private eventHandlers = new Map<string, Function[]>();

  constructor(private serverUrl: string = '') {
    // 이벤트 핸들러 초기화
    this.initializeEventHandlers();
  }

  /**
   * 서버에 연결
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 5000
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          console.log('협업 서버에 연결되었습니다');
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          console.log('협업 서버와의 연결이 끊어졌습니다');
          this.emit('disconnected');
        });

        this.socket.on('connect_error', (error) => {
          console.error('협업 서버 연결 오류:', error);
          reject(error);
        });

        this.setupSocketEventHandlers();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 서버와의 연결 해제
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
      this.userId = null;
    }
  }

  /**
   * 협업 세션 참가
   */
  async joinSession(sessionId: string, userId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('서버에 연결되지 않았습니다');
    }

    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      this.userId = userId;

      this.socket!.emit('join-session', { sessionId, userId });

      // 성공 응답 대기
      const timeout = setTimeout(() => {
        reject(new Error('세션 참가 시간 초과'));
      }, 5000);

      this.socket!.once('active-users', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 협업 세션 떠나기
   */
  async leaveSession(): Promise<void> {
    if (!this.socket || !this.sessionId || !this.userId) {
      return;
    }

    this.socket.emit('leave-session', {
      sessionId: this.sessionId,
      userId: this.userId
    });

    this.sessionId = null;
    this.userId = null;
  }

  /**
   * 그리드 변경사항 전송
   */
  sendGridChange(change: Omit<GridChange, 'sessionId' | 'userId' | 'timestamp'>): void {
    if (!this.socket || !this.sessionId || !this.userId) {
      console.warn('세션에 참가하지 않은 상태에서 변경사항을 전송하려고 했습니다');
      return;
    }

    const fullChange: GridChange = {
      ...change,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.socket.emit('grid-change', fullChange);
  }

  /**
   * 커서 위치 전송
   */
  sendCursorMove(position: CursorPosition): void {
    if (!this.socket || !this.sessionId || !this.userId) {
      return;
    }

    this.socket.emit('cursor-move', {
      sessionId: this.sessionId,
      userId: this.userId,
      position
    });
  }

  /**
   * 선택 영역 전송
   */
  sendSelectionChange(selection: SelectionRange | null): void {
    if (!this.socket || !this.sessionId || !this.userId) {
      return;
    }

    this.socket.emit('selection-change', {
      sessionId: this.sessionId,
      userId: this.userId,
      selection
    });
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: string, handler?: Function): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * 이벤트 발생
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`이벤트 핸들러 오류 (${event}):`, error);
        }
      });
    }
  }

  /**
   * Socket.IO 이벤트 핸들러 설정
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // 협업 이벤트 수신
    this.socket.on('collaboration-event', (event: CollaborationEvent) => {
      this.handleCollaborationEvent(event);
    });

    // 활성 사용자 목록 수신
    this.socket.on('active-users', (users: ActiveUser[]) => {
      this.emit('active-users-updated', users);
    });

    // 오류 처리
    this.socket.on('error', (error: any) => {
      console.error('협업 오류:', error);
      this.emit('error', error);
    });
  }

  /**
   * 협업 이벤트 처리
   */
  private handleCollaborationEvent(event: CollaborationEvent): void {
    switch (event.type) {
      case 'user-joined':
        this.emit('user-joined', event.data.user);
        break;

      case 'user-left':
        this.emit('user-left', event.data.userId);
        break;

      case 'user-disconnected':
        this.emit('user-disconnected', event.data.userId);
        break;

      case 'grid-change':
        this.emit('grid-change', event.data);
        break;

      case 'cursor-move':
        this.emit('cursor-move', event.userId, event.data);
        break;

      case 'selection-change':
        this.emit('selection-change', event.userId, event.data);
        break;

      case 'conflict-detected':
        this.emit('conflict-detected', event.data.conflict);
        break;

      case 'conflict-resolved':
        this.emit('conflict-resolved', event.data.conflict, event.data.resolution);
        break;

      case 'session-destroyed':
        this.emit('session-destroyed');
        break;

      default:
        console.warn('알 수 없는 협업 이벤트:', event.type);
    }
  }

  /**
   * 기본 이벤트 핸들러 초기화
   */
  private initializeEventHandlers(): void {
    // 기본 이벤트 핸들러들을 여기에 추가할 수 있습니다
  }

  /**
   * 연결 상태 확인
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 현재 세션 ID
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 현재 사용자 ID
   */
  get currentUserId(): string | null {
    return this.userId;
  }
}

/**
 * 협업 UI 관리자
 */
export class CollaborationUI {
  private activeUsers = new Map<string, ActiveUser>();
  private userCursors = new Map<string, HTMLElement>();
  private userSelections = new Map<string, HTMLElement>();
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeStyles();
  }

  /**
   * 활성 사용자 업데이트
   */
  updateActiveUsers(users: ActiveUser[]): void {
    // 기존 사용자 정리
    this.activeUsers.clear();
    
    // 새 사용자 추가
    users.forEach(user => {
      this.activeUsers.set(user.id, user);
    });

    this.updateUserList();
  }

  /**
   * 사용자 커서 표시
   */
  showUserCursor(userId: string, position: CursorPosition): void {
    const user = this.activeUsers.get(userId);
    if (!user) return;

    let cursor = this.userCursors.get(userId);
    if (!cursor) {
      cursor = this.createCursorElement(user);
      this.userCursors.set(userId, cursor);
      this.container.appendChild(cursor);
    }

    this.updateCursorPosition(cursor, position);
  }

  /**
   * 사용자 선택 영역 표시
   */
  showUserSelection(userId: string, selection: SelectionRange | null): void {
    const user = this.activeUsers.get(userId);
    if (!user) return;

    let selectionElement = this.userSelections.get(userId);
    
    if (!selection) {
      // 선택 해제
      if (selectionElement) {
        selectionElement.remove();
        this.userSelections.delete(userId);
      }
      return;
    }

    if (!selectionElement) {
      selectionElement = this.createSelectionElement(user);
      this.userSelections.set(userId, selectionElement);
      this.container.appendChild(selectionElement);
    }

    this.updateSelectionArea(selectionElement, selection);
  }

  /**
   * 사용자 제거
   */
  removeUser(userId: string): void {
    this.activeUsers.delete(userId);
    
    const cursor = this.userCursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.userCursors.delete(userId);
    }

    const selection = this.userSelections.get(userId);
    if (selection) {
      selection.remove();
      this.userSelections.delete(userId);
    }

    this.updateUserList();
  }

  /**
   * 커서 엘리먼트 생성
   */
  private createCursorElement(user: ActiveUser): HTMLElement {
    const cursor = document.createElement('div');
    cursor.className = 'collaboration-cursor';
    cursor.style.cssText = `
      position: absolute;
      width: 2px;
      height: 20px;
      background-color: ${user.color};
      pointer-events: none;
      z-index: 1000;
      transition: all 0.1s ease;
    `;

    // 사용자 이름 표시
    const label = document.createElement('div');
    label.className = 'collaboration-cursor-label';
    label.textContent = user.name;
    label.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background-color: ${user.color};
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
    `;

    cursor.appendChild(label);
    return cursor;
  }

  /**
   * 선택 영역 엘리먼트 생성
   */
  private createSelectionElement(user: ActiveUser): HTMLElement {
    const selection = document.createElement('div');
    selection.className = 'collaboration-selection';
    selection.style.cssText = `
      position: absolute;
      background-color: ${user.color}33;
      border: 1px solid ${user.color};
      pointer-events: none;
      z-index: 999;
    `;

    return selection;
  }

  /**
   * 커서 위치 업데이트
   */
  private updateCursorPosition(cursor: HTMLElement, position: CursorPosition): void {
    // 실제 그리드 셀 위치를 계산하여 커서 위치 설정
    // 이 부분은 실제 그리드 구현에 따라 달라집니다
    const cellElement = this.getCellElement(position.row, position.col);
    if (cellElement) {
      const rect = cellElement.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      cursor.style.left = `${rect.left - containerRect.left}px`;
      cursor.style.top = `${rect.top - containerRect.top}px`;
    }
  }

  /**
   * 선택 영역 업데이트
   */
  private updateSelectionArea(selection: HTMLElement, range: SelectionRange): void {
    const startCell = this.getCellElement(range.startRow, range.startCol);
    const endCell = this.getCellElement(range.endRow, range.endCol);
    
    if (startCell && endCell) {
      const startRect = startCell.getBoundingClientRect();
      const endRect = endCell.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      const left = Math.min(startRect.left, endRect.left) - containerRect.left;
      const top = Math.min(startRect.top, endRect.top) - containerRect.top;
      const right = Math.max(startRect.right, endRect.right) - containerRect.left;
      const bottom = Math.max(startRect.bottom, endRect.bottom) - containerRect.top;
      
      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;
      selection.style.width = `${right - left}px`;
      selection.style.height = `${bottom - top}px`;
    }
  }

  /**
   * 그리드 셀 엘리먼트 조회
   */
  private getCellElement(row: number, col: number): HTMLElement | null {
    // 실제 그리드 구현에 따라 셀 엘리먼트를 찾는 로직
    return this.container.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * 사용자 목록 업데이트
   */
  private updateUserList(): void {
    // 사용자 목록 UI 업데이트 (사이드바 등)
    const userListElement = document.getElementById('collaboration-user-list');
    if (userListElement) {
      userListElement.innerHTML = '';
      
      this.activeUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'collaboration-user';
        userElement.innerHTML = `
          <div class="user-indicator" style="background-color: ${user.color}"></div>
          <span class="user-name">${user.name}</span>
          <span class="user-status ${user.isOnline ? 'online' : 'offline'}"></span>
        `;
        userListElement.appendChild(userElement);
      });
    }
  }

  /**
   * 스타일 초기화
   */
  private initializeStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .collaboration-user {
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid #eee;
      }
      
      .user-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      
      .user-name {
        flex: 1;
        font-size: 14px;
      }
      
      .user-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 8px;
      }
      
      .user-status.online {
        background-color: #4CAF50;
      }
      
      .user-status.offline {
        background-color: #9E9E9E;
      }
    `;
    
    document.head.appendChild(style);
  }
}