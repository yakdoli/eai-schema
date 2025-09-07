#!/usr/bin/env node

// Feature Session Manager for EAI Work Tool Development
// This script helps manage individual feature implementation sessions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FeatureSessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, 'sessions');
    this.projectRoot = __dirname;
  }

  // Get session by name
  getSessionId(sessionName) {
    if (!fs.existsSync(this.sessionsDir)) {
      return null;
    }
    
    const sessions = fs.readdirSync(this.sessionsDir).filter(item => 
      item !== 'current-session.json' && fs.statSync(path.join(this.sessionsDir, item)).isDirectory()
    );
    
    const matchingSession = sessions.find(session => session.startsWith(sessionName + '-'));
    return matchingSession || null;
  }

  // Start a feature session
  startFeatureSession(sessionName) {
    const sessionId = this.getSessionId(sessionName);
    if (!sessionId) {
      console.error(`Session ${sessionName} not found`);
      return false;
    }
    
    // Start the session using the main session manager
    const sessionManagerPath = path.join(this.projectRoot, 'session-manager.js');
    const startProcess = spawn('node', [sessionManagerPath, 'start', sessionId], {
      cwd: this.projectRoot,
      stdio: 'inherit'
    });
    
    startProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully started session: ${sessionName}`);
        // Switch to the feature branch
        this.switchToBranch(sessionName);
      } else {
        console.error(`Failed to start session: ${sessionName}`);
      }
    });
    
    return true;
  }

  // Switch to the appropriate git branch
  switchToBranch(featureName) {
    const branchMap = {
      'wsdl-implementation': 'feature/wsdl-protocol',
      'soap-implementation': 'feature/soap-protocol',
      'xsd-implementation': 'feature/xsd-protocol',
      'jsonrpc-implementation': 'feature/jsonrpc-protocol',
      'sap-implementation': 'feature/sap-protocol'
    };
    
    const branchName = branchMap[featureName];
    if (!branchName) {
      console.error(`No branch mapping found for ${featureName}`);
      return;
    }
    
    console.log(`Switching to branch: ${branchName}`);
    
    const gitProcess = spawn('git', ['checkout', branchName], {
      cwd: this.projectRoot,
      stdio: 'inherit'
    });
    
    gitProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully switched to branch: ${branchName}`);
      } else {
        console.error(`Failed to switch to branch: ${branchName}`);
      }
    });
  }

  // Add task to current session
  addTaskToSession(taskDescription, priority = 'medium') {
    const sessionManagerPath = path.join(this.projectRoot, 'session-manager.js');
    const addTaskProcess = spawn('node', [sessionManagerPath, 'add-task', taskDescription, priority], {
      cwd: this.projectRoot,
      stdio: 'inherit'
    });
    
    addTaskProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully added task: ${taskDescription}`);
      } else {
        console.error(`Failed to add task: ${taskDescription}`);
      }
    });
  }

  // List available feature sessions
  listFeatureSessions() {
    console.log('Available feature sessions:');
    console.log('  wsdl-implementation  - WSDL protocol implementation');
    console.log('  soap-implementation  - SOAP protocol implementation');
    console.log('  xsd-implementation   - XSD protocol implementation');
    console.log('  jsonrpc-implementation - JSON-RPC protocol implementation');
    console.log('  sap-implementation   - SAP RFC/IDoc protocol implementation');
  }

  // Get session status
  getSessionStatus() {
    const sessionManagerPath = path.join(this.projectRoot, 'session-manager.js');
    const statusProcess = spawn('node', [sessionManagerPath, 'status'], {
      cwd: this.projectRoot,
      stdio: 'inherit'
    });
  }
}

// CLI interface
if (process.argv[1] === __filename) {
  const featureManager = new FeatureSessionManager();
  const args = process.argv.slice(2);
  
  switch (args[0]) {
    case 'start':
      if (args[1]) {
        featureManager.startFeatureSession(args[1]);
      } else {
        console.log('Usage: node feature-session-manager.js start <session-name>');
      }
      break;
      
    case 'add-task':
      if (args[1]) {
        featureManager.addTaskToSession(args.slice(1).join(' '), args[2] || 'medium');
      } else {
        console.log('Usage: node feature-session-manager.js add-task <task-description> [priority]');
      }
      break;
      
    case 'list':
      featureManager.listFeatureSessions();
      break;
      
    case 'status':
      featureManager.getSessionStatus();
      break;
      
    default:
      console.log(`
Feature Session Manager for EAI Work Tool Development

Usage:
  node feature-session-manager.js start <session-name>          Start a feature session
  node feature-session-manager.js add-task <description> [priority]  Add task to current session
  node feature-session-manager.js list                         List available feature sessions
  node feature-session-manager.js status                       Get current session status

Available Sessions:
  wsdl-implementation    WSDL protocol implementation
  soap-implementation    SOAP protocol implementation
  xsd-implementation     XSD protocol implementation
  jsonrpc-implementation JSON-RPC protocol implementation
  sap-implementation     SAP RFC/IDoc protocol implementation
      `);
  }
}

export default FeatureSessionManager;