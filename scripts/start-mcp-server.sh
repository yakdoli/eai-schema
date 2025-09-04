#!/bin/bash
# Script to start the MCP server for EAI Schema Toolkit development

echo "Starting EAI Schema Toolkit MCP Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "mcp-server" ]; then
  echo "Error: This script must be run from the root of the EAI Schema Toolkit project"
  exit 1
fi

# Navigate to the MCP server directory
cd mcp-server

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing MCP server dependencies..."
  npm install
fi

# Start the MCP server
echo "MCP Server starting on port 3002..."
echo "MCP endpoint available at http://localhost:3002/mcp"
npm start