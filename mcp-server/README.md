# EAI Schema Toolkit MCP Server

This is a Model Context Provider (MCP) server for the EAI Schema Toolkit, designed to assist AI agents in understanding the codebase during development.

## Purpose

The MCP server provides contextual information about the EAI Schema Toolkit to AI coding assistants, enabling them to:
- Understand the project structure and architecture
- Access API documentation and endpoints
- Get information about services and components
- Learn about deployment processes

## Features

- Context provision for AI agents
- Project structure information
- API endpoint documentation
- Service descriptions
- Deployment guidance

## Installation

```bash
cd mcp-server
npm install
```

## Usage

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The MCP server will start on port 3002 by default, with the MCP endpoint available at:
`http://localhost:3002/mcp`

## API Endpoints

- `GET /` - Health check endpoint
- `GET /mcp` - Context provision endpoint
- `POST /mcp` - Context provision endpoint (alternative)

## Integration with AI Agents

AI agents can connect to the MCP endpoint to retrieve context about the EAI Schema Toolkit, helping them provide more accurate and relevant assistance during development.

Example request:
```bash
curl http://localhost:3002/mcp
```

## Note

This MCP server is intended for development assistance only and is not part of the production deployment of the EAI Schema Toolkit.