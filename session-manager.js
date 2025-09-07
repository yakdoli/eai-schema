#!/usr/bin/env node

// Session Manager for EAI Work Tool Development
// This script helps manage development sessions for different protocols

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, 'sessions');
    this.currentSession = null;
  }

  // Create a new session
  createSession(sessionName, sessionType = 'feature') {
    const sessionPath = path.join(this.sessionsDir, `${sessionName}-${Date.now()}`);
    
    // Create session directory
    fs.mkdirSync(sessionPath, { recursive: true });
    
    // Create session metadata
    const sessionMetadata = {
      id: `${sessionName}-${Date.now()}`,
      name: sessionName,
      type: sessionType,
      createdAt: new Date().toISOString(),
      status: 'active',
      tasks: []
    };
    
    // Write metadata
    fs.writeFileSync(
      path.join(sessionPath, 'metadata.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );
    
    // Create session log
    fs.writeFileSync(
      path.join(sessionPath, 'session.log'),
      `Session ${sessionName} created at ${new Date().toISOString()}
`
    );
    
    this.currentSession = sessionMetadata;
    console.log(`Created session: ${sessionName}`);
    return sessionPath;
  }

  // List all sessions
  listSessions() {
    if (!fs.existsSync(this.sessionsDir)) {
      console.log('No sessions directory found');
      return [];
    }
    
    const sessions = fs.readdirSync(this.sessionsDir);
    console.log('Available sessions:');
    sessions.forEach(session => console.log(`  - ${session}`));
    return sessions;
  }

  // Start a session
  startSession(sessionId) {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionPath)) {
      console.error(`Session ${sessionId} not found`);
      return null;
    }
    
    // Update metadata
    const metadataPath = path.join(sessionPath, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    metadata.status = 'running';
    metadata.startedAt = new Date().toISOString();
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Log session start
    fs.appendFileSync(
      path.join(sessionPath, 'session.log'),
      `Session started at ${new Date().toISOString()}
`
    );
    
    this.currentSession = metadata;
    console.log(`Started session: ${sessionId}`);
    return sessionPath;
  }

  // Add task to current session
  addTask(taskDescription, priority = 'medium') {
    if (!this.currentSession) {
      console.error('No active session');
      return;
    }
    
    const taskId = `task-${Date.now()}`;
    const task = {
      id: taskId,
      description: taskDescription,
      priority: priority,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    this.currentSession.tasks.push(task);
    
    // Update metadata
    const sessionPath = path.join(this.sessionsDir, this.currentSession.id);
    const metadataPath = path.join(sessionPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.currentSession, null, 2));
    
    // Log task addition
    fs.appendFileSync(
      path.join(sessionPath, 'session.log'),
      `Task added: ${taskDescription} (${taskId})
`
    );
    
    console.log(`Added task: ${taskDescription}`);
    return taskId;
  }

  // Update task status
  updateTaskStatus(taskId, status) {
    if (!this.currentSession) {
      console.error('No active session');
      return;
    }
    
    const task = this.currentSession.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }
    
    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    // Update metadata
    const sessionPath = path.join(this.sessionsDir, this.currentSession.id);
    const metadataPath = path.join(sessionPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.currentSession, null, 2));
    
    // Log task update
    fs.appendFileSync(
      path.join(sessionPath, 'session.log'),
      `Task ${taskId} updated to ${status} at ${new Date().toISOString()}
`
    );
    
    console.log(`Updated task ${taskId} to ${status}`);
  }

  // End current session
  endSession() {
    if (!this.currentSession) {
      console.error('No active session');
      return;
    }
    
    // Update metadata
    const sessionPath = path.join(this.sessionsDir, this.currentSession.id);
    this.currentSession.status = 'completed';
    this.currentSession.endedAt = new Date().toISOString();
    
    const metadataPath = path.join(sessionPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.currentSession, null, 2));
    
    // Log session end
    fs.appendFileSync(
      path.join(sessionPath, 'session.log'),
      `Session ended at ${new Date().toISOString()}
`
    );
    
    console.log(`Ended session: ${this.currentSession.name}`);
    this.currentSession = null;
  }

  // Get session status
  getSessionStatus() {
    if (!this.currentSession) {
      console.log('No active session');
      return null;
    }
    
    console.log(`Current session: ${this.currentSession.name}`);
    console.log(`Status: ${this.currentSession.status}`);
    console.log(`Tasks:`);
    this.currentSession.tasks.forEach(task => {
      console.log(`  - ${task.description} (${task.status})`);
    });
    
    return this.currentSession;
  }
}

// CLI interface
if (process.argv[1] === __filename) {
  const sessionManager = new SessionManager();
  const args = process.argv.slice(2);
  
  switch (args[0]) {
    case 'create':
      if (args[1]) {
        sessionManager.createSession(args[1], args[2] || 'feature');
      } else {
        console.log('Usage: node session-manager.js create <session-name> [session-type]');
      }
      break;
      
    case 'list':
      sessionManager.listSessions();
      break;
      
    case 'start':
      if (args[1]) {
        sessionManager.startSession(args[1]);
      } else {
        console.log('Usage: node session-manager.js start <session-id>');
      }
      break;
      
    case 'add-task':
      if (args[1]) {
        sessionManager.addTask(args.slice(1).join(' '), args[2] || 'medium');
      } else {
        console.log('Usage: node session-manager.js add-task <task-description> [priority]');
      }
      break;
      
    case 'update-task':
      if (args[1] && args[2]) {
        sessionManager.updateTaskStatus(args[1], args[2]);
      } else {
        console.log('Usage: node session-manager.js update-task <task-id> <status>');
      }
      break;
      
    case 'end':
      sessionManager.endSession();
      break;
      
    case 'status':
      sessionManager.getSessionStatus();
      break;
      
    default:
      console.log(`
Session Manager for EAI Work Tool Development

Usage:
  node session-manager.js create <session-name> [session-type]  Create a new session
  node session-manager.js list                                List all sessions
  node session-manager.js start <session-id>                  Start a session
  node session-manager.js add-task <description> [priority]   Add task to current session
  node session-manager.js update-task <task-id> <status>      Update task status
  node session-manager.js end                                 End current session
  node session-manager.js status                              Get current session status

Session Types:
  pm          Project management session
  feature     Feature implementation session

Task Priorities:
  low, medium, high

Task Statuses:
  pending, in-progress, completed, blocked
      `);
  }
}

export default SessionManager;