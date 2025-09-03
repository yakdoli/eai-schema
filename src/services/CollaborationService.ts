import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { MessageMappingService } from "../services/messageMappingService";

interface CollaborationUser {
  id: string;
  username: string;
  mappingId: string;
  joinedAt: Date;
}

interface CollaborationEvent {
  id: string;
  userId: string;
  username: string;
  mappingId: string;
  type: string;
  data: any;
  timestamp: Date;
}

class CollaborationService {
  private io: Server | null = null;
  private users: Map<string, CollaborationUser> = new Map();
  private events: Map<string, CollaborationEvent[]> = new Map();
  private messageMappingService: MessageMappingService;

  constructor(messageMappingService: MessageMappingService) {
    this.messageMappingService = messageMappingService;
  }

  /**
   * Initialize the collaboration service with Socket.IO server
   * @param io The Socket.IO server instance
   */
  initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
    logger.info("Collaboration service initialized");
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      logger.info(`User connected: ${socket.id}`);

      // Handle user joining a mapping session
      socket.on("joinMapping", (data: { mappingId: string; username: string }) => {
        this.handleUserJoin(socket, data.mappingId, data.username);
      });

      // Handle user leaving a mapping session
      socket.on("leaveMapping", (data: { mappingId: string }) => {
        this.handleUserLeave(socket, data.mappingId);
      });

      // Handle collaboration events
      socket.on("collaborationEvent", (event: Omit<CollaborationEvent, "id" | "timestamp">) => {
        this.handleCollaborationEvent(socket, event);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleUserDisconnect(socket);
      });
    });
  }

  /**
   * Handle user joining a mapping session
   * @param socket The socket connection
   * @param mappingId The mapping ID
   * @param username The username
   */
  private handleUserJoin(socket: Socket, mappingId: string, username: string): void {
    try {
      // Create user record
      const user: CollaborationUser = {
        id: socket.id,
        username,
        mappingId,
        joinedAt: new Date()
      };

      // Store user
      this.users.set(socket.id, user);

      // Join the mapping room
      socket.join(mappingId);

      // Get existing events for this mapping
      const mappingEvents = this.events.get(mappingId) || [];

      // Notify others in the room about the new user
      socket.to(mappingId).emit("userJoined", {
        userId: socket.id,
        username,
        timestamp: new Date()
      });

      // Send existing events to the new user
      socket.emit("mappingEvents", mappingEvents);

      // Send current user list to the new user
      const roomUsers = Array.from(this.users.values())
        .filter(user => user.mappingId === mappingId)
        .map(user => ({
          userId: user.id,
          username: user.username,
          joinedAt: user.joinedAt
        }));

      socket.emit("userList", roomUsers);

      logger.info(`User ${username} joined mapping ${mappingId}`);
    } catch (error) {
      logger.error("Error handling user join", { error });
    }
  }

  /**
   * Handle user leaving a mapping session
   * @param socket The socket connection
   * @param mappingId The mapping ID
   */
  private handleUserLeave(socket: Socket, mappingId: string): void {
    try {
      // Remove user from users map
      this.users.delete(socket.id);

      // Leave the mapping room
      socket.leave(mappingId);

      // Get user info for notification
      const user = Array.from(this.users.values()).find(u => u.id === socket.id);

      if (user) {
        // Notify others in the room about the user leaving
        socket.to(mappingId).emit("userLeft", {
          userId: socket.id,
          username: user.username,
          timestamp: new Date()
        });

        logger.info(`User ${user.username} left mapping ${mappingId}`);
      }
    } catch (error) {
      logger.error("Error handling user leave", { error });
    }
  }

  /**
   * Handle user disconnection
   * @param socket The socket connection
   */
  private handleUserDisconnect(socket: Socket): void {
    try {
      // Get user info before removing
      const user = this.users.get(socket.id);

      if (user) {
        // Remove user from users map
        this.users.delete(socket.id);

        // Notify others in the room about the user disconnecting
        socket.to(user.mappingId).emit("userDisconnected", {
          userId: socket.id,
          username: user.username,
          timestamp: new Date()
        });

        logger.info(`User ${user.username} disconnected from mapping ${user.mappingId}`);
      }
    } catch (error) {
      logger.error("Error handling user disconnect", { error });
    }
  }

  /**
   * Handle collaboration events
   * @param socket The socket connection
   * @param event The collaboration event
   */
  private handleCollaborationEvent(
    socket: Socket,
    event: Omit<CollaborationEvent, "id" | "timestamp">
  ): void {
    try {
      // Create full event object
      const fullEvent: CollaborationEvent = {
        id: this.generateId(),
        userId: event.userId,
        username: event.username,
        mappingId: event.mappingId,
        type: event.type,
        data: event.data,
        timestamp: new Date()
      };

      // Store event
      if (!this.events.has(event.mappingId)) {
        this.events.set(event.mappingId, []);
      }
      this.events.get(event.mappingId)!.push(fullEvent);

      // Broadcast event to all users in the mapping room except sender
      socket.to(event.mappingId).emit("collaborationEvent", fullEvent);

      // Also store in the message mapping service
      this.messageMappingService.addCollaborationEvent(event.mappingId, {
        userId: event.userId,
        username: event.username,
        timestamp: fullEvent.timestamp,
        action: event.type as any,
        target: event.data.target || "",
        details: event.data
      });

      logger.info(`Collaboration event processed for mapping ${event.mappingId}`, {
        type: event.type,
        userId: event.userId
      });
    } catch (error) {
      logger.error("Error handling collaboration event", { error });
    }
  }

  /**
   * Get collaboration history for a mapping
   * @param mappingId The mapping ID
   * @returns Array of collaboration events
   */
  getCollaborationHistory(mappingId: string): CollaborationEvent[] {
    return this.events.get(mappingId) || [];
  }

  /**
   * Get users in a mapping session
   * @param mappingId The mapping ID
   * @returns Array of users
   */
  getMappingUsers(mappingId: string): CollaborationUser[] {
    return Array.from(this.users.values()).filter(user => user.mappingId === mappingId);
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export { CollaborationService, CollaborationUser, CollaborationEvent };